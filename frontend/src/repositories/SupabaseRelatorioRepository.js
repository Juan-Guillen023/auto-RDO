import { dataUrlParaBlob, blobParaDataUrl, hashDoBlob } from '../utils/imagens';
import { ConflitoDeVersaoError } from './RelatorioRepository';

const TABELA = 'relatorios';
const SCHEMA_VERSION = 1;
// Técnico, PO e task são lidos de dentro do jsonb (`dados->campos->>x`) em vez
// de virarem colunas: nenhuma migração, e nenhuma cópia que possa divergir
const COLUNAS_RESUMO = [
  'id', 'user_id', 'autor_email', 'cliente', 'projeto', 'data_inicio', 'data_fim', 'status', 'atualizado_em',
  'tecnico:dados->campos->>tecnico',
  'po:dados->campos->>po',
  'task:dados->campos->>task',
].join(', ');
const LIMITE_ARQUIVOS_POR_RELATORIO = 1000;

/**
 * Implementação de RelatorioRepository sobre Supabase:
 * - texto do relatório → tabela `relatorios` (coluna jsonb `dados`)
 * - fotos             → Storage, em <user_id>/<relatorio_id>/<sha256>.<ext>
 *
 * Nomear a foto pelo hash do conteúdo torna o salvamento idempotente: salvar
 * o mesmo relatório dez vezes envia cada foto uma única vez.
 *
 * @implements {import('./RelatorioRepository').RelatorioRepository}
 */
export class SupabaseRelatorioRepository {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} client
   * @param {{ bucket?: string }} [opcoes]
   */
  constructor(client, { bucket = 'fotos' } = {}) {
    this.client = client;
    this.bucket = bucket;
    this._fila = Promise.resolve();
    // id → `atualizado_em` da última versão lida ou gravada por esta sessão.
    // Fica aqui (e não no chamador) porque as escritas são enfileiradas: cada
    // salvamento precisa da versão deixada pelo anterior, não da de quando foi pedido.
    this._versoes = new Map();
  }

  async listar() {
    const { data, error } = await this.client
      .from(TABELA)
      .select(COLUNAS_RESUMO)
      .order('atualizado_em', { ascending: false });

    if (error) throw error;
    return data.map(paraResumo);
  }

  async abrir(id) {
    const { data, error } = await this.client
      .from(TABELA)
      .select('id, user_id, status, dados, atualizado_em')
      .eq('id', id)
      .single();

    if (error) throw error;
    this._versoes.set(id, data.atualizado_em);

    const diasDados = await mapearImagens(data.dados.diasDados, (caminho) => this._baixarFoto(caminho));
    return {
      id: data.id,
      userId: data.user_id,
      status: data.status,
      campos: data.dados.campos,
      diasDados,
    };
  }

  // Escritas passam por uma fila: auto-save e "Salvar" manual simultâneos
  // poderiam, sem ela, um apagar como "órfã" a foto que o outro acabou de enviar.
  salvar(relatorio) {
    return this._emFila(() => this._salvar(relatorio));
  }

  excluir(id) {
    return this._emFila(() => this._excluir(id));
  }

  async _salvar({ id = crypto.randomUUID(), campos, diasDados, status = 'em_andamento' }) {
    const pasta = await this._pastaDoRelatorio(id);
    const existentes = await this._listarArquivos(pasta);
    const usados = new Set();

    const diasComCaminhos = await mapearImagens(diasDados, async (dataUrl) => {
      const blob = await dataUrlParaBlob(dataUrl);
      const nome = `${await hashDoBlob(blob)}.${extensaoDe(blob)}`;
      usados.add(nome);

      if (!existentes.has(nome)) {
        await this._enviarFoto(`${pasta}/${nome}`, blob);
      }
      return `${pasta}/${nome}`;
    });

    const linha = {
      cliente: campos.cliente,
      projeto: campos.projeto,
      data_inicio: campos.dataInicio,
      data_fim: campos.dataFim,
      status,
      dados: { schemaVersion: SCHEMA_VERSION, campos, diasDados: diasComCaminhos },
    };

    // Optimistic locking: só atualiza se a linha ainda estiver na versão que
    // esta sessão conhece. Se alguém salvou no meio, zero linhas mudam.
    const versaoConhecida = this._versoes.get(id);
    const { data, error } = versaoConhecida
      ? await this.client.from(TABELA).update(linha).eq('id', id).eq('atualizado_em', versaoConhecida).select('atualizado_em')
      : await this.client.from(TABELA).insert({ id, ...linha }).select('atualizado_em');
    if (error) throw error;
    if (data.length === 0) throw new ConflitoDeVersaoError();
    this._versoes.set(id, data[0].atualizado_em);

    // Só apaga as fotos removidas DEPOIS que o banco já aponta para o conjunto
    // novo — se a gravação falhar (inclusive por conflito), o relatório
    // antigo continua íntegro e as fotos da outra pessoa ficam intactas.
    const orfas = [...existentes].filter((nome) => !usados.has(nome));
    await this._removerArquivos(orfas.map((nome) => `${pasta}/${nome}`));

    return id;
  }

  async _excluir(id) {
    const pasta = await this._pastaDoRelatorio(id);
    const arquivos = await this._listarArquivos(pasta);

    // Banco primeiro: foto sem relatório é só lixo; relatório sem foto é dado quebrado.
    // `.select()` devolve as linhas apagadas: sem permissão, o RLS não gera erro,
    // apenas apaga zero linhas — e isso não pode passar como sucesso.
    const { data, error } = await this.client.from(TABELA).delete().eq('id', id).select('id');
    if (error) throw error;
    if (data.length === 0) {
      throw new Error('Relatório não encontrado ou sem permissão para excluí-lo.');
    }
    this._versoes.delete(id);

    await this._removerArquivos([...arquivos].map((nome) => `${pasta}/${nome}`));
  }

  /**
   * As fotos moram na pasta do DONO do relatório — não de quem está logado.
   * Quando um admin edita o relatório de um técnico, as fotos novas precisam
   * ir para a mesma pasta das antigas. O dono vem do banco (e não de quem
   * chama) para que ninguém consiga apontar para a pasta de outro usuário.
   */
  async _pastaDoRelatorio(id) {
    const { data, error } = await this.client
      .from(TABELA)
      .select('user_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;

    // Relatório ainda não salvo: será criado agora, pelo usuário atual
    const dono = data?.user_id ?? (await this._usuarioAtualId());
    return `${dono}/${id}`;
  }

  async _usuarioAtualId() {
    const { data: { session } } = await this.client.auth.getSession();
    if (!session) throw new Error('Usuário não autenticado.');
    return session.user.id;
  }

  async _listarArquivos(pasta) {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(pasta, { limit: LIMITE_ARQUIVOS_POR_RELATORIO });

    if (error) throw error;
    return new Set(data.map((arquivo) => arquivo.name));
  }

  async _enviarFoto(caminho, blob) {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(caminho, blob, { contentType: blob.type, upsert: true });

    if (error) throw error;
  }

  async _baixarFoto(caminho) {
    const { data, error } = await this.client.storage.from(this.bucket).download(caminho);
    if (error) throw error;
    return blobParaDataUrl(data);
  }

  async _removerArquivos(caminhos) {
    if (caminhos.length === 0) return;
    const { error } = await this.client.storage.from(this.bucket).remove(caminhos);
    // Não falha a operação: o relatório já está salvo, sobra só lixo no Storage
    if (error) console.warn('Falha ao remover fotos antigas:', error);
  }

  _emFila(operacao) {
    const resultado = this._fila.then(operacao);
    this._fila = resultado.catch(() => {}); // uma falha não trava as próximas
    return resultado;
  }
}

function paraResumo(linha) {
  return {
    id: linha.id,
    userId: linha.user_id,
    autorEmail: linha.autor_email ?? '',
    cliente: linha.cliente,
    projeto: linha.projeto,
    tecnico: linha.tecnico ?? '',
    po: linha.po ?? '',
    task: linha.task ?? '',
    dataInicio: linha.data_inicio,
    dataFim: linha.data_fim,
    status: linha.status,
    atualizadoEm: new Date(linha.atualizado_em),
  };
}

function extensaoDe(blob) {
  return blob.type.split('/')[1] || 'bin';
}

/**
 * Aplica `transformar` (assíncrono) a cada imagem de cada atividade de cada
 * dia, em paralelo, devolvendo uma cópia nova — os dias originais não mudam.
 */
async function mapearImagens(dias, transformar) {
  return Promise.all(
    dias.map(async (dia) => ({
      ...dia,
      atividades: await Promise.all(
        dia.atividades.map(async (ativ) => ({
          ...ativ,
          imagens: await Promise.all(ativ.imagens.map(transformar)),
        }))
      ),
    }))
  );
}
