import { openDB } from 'idb';
import { ConflitoDeVersaoError } from './RelatorioRepository';

const LOJA = 'relatorios';
const VERSAO_DO_BANCO = 1;

/**
 * Implementação de RelatorioRepository no próprio navegador (modo offline).
 *
 * As fotos ficam como data URL dentro do registro: sem Storage separado, não
 * existe foto órfã para limpar, e salvar/excluir são uma única transação.
 *
 * @implements {import('./RelatorioRepository').RelatorioRepository}
 */
export class IndexedDbRelatorioRepository {
  /**
   * @param {{ usuario: { id: string, email: string }, nomeBanco?: string }} opcoes
   */
  constructor({ usuario, nomeBanco = 'auto-rdo' }) {
    this.usuario = usuario;
    this._banco = openDB(nomeBanco, VERSAO_DO_BANCO, {
      upgrade(db) {
        db.createObjectStore(LOJA, { keyPath: 'id' }).createIndex('atualizadoEm', 'atualizadoEm');
      },
    });
    // id → `atualizadoEm` da última versão lida ou gravada por esta aba. É o
    // mesmo optimistic locking do Supabase: aqui ele protege contra duas abas
    // editando o mesmo relatório.
    this._versoes = new Map();
  }

  async listar() {
    const db = await this._banco;
    const registros = await db.getAllFromIndex(LOJA, 'atualizadoEm');
    return registros.reverse().map((registro) => this._paraResumo(registro));
  }

  async abrir(id) {
    const db = await this._banco;
    const registro = await db.get(LOJA, id);
    if (!registro) throw new Error('Relatório não encontrado.');

    this._versoes.set(id, registro.atualizadoEm);
    const { campos, diasDados, status } = registro;
    return { id, userId: this.usuario.id, campos, diasDados, status };
  }

  async salvar({ id = crypto.randomUUID(), campos, diasDados, status = 'em_andamento' }) {
    const db = await this._banco;
    // Ler e gravar na MESMA transação: outra aba não consegue gravar no meio.
    // Nada além de operações do IndexedDB pode ser aguardado aqui dentro, ou
    // a transação fecha sozinha.
    const tx = db.transaction(LOJA, 'readwrite');
    const atual = await tx.store.get(id);
    const versaoConhecida = this._versoes.get(id);

    // Relatório novo que já existe, ou conhecido que mudou (ou foi excluído) em outra aba
    const conflito = versaoConhecida === undefined
      ? atual !== undefined
      : atual?.atualizadoEm !== versaoConhecida;
    // Sem abort(): a transação ainda não gravou nada e fecha sozinha
    if (conflito) throw new ConflitoDeVersaoError();

    // Sempre maior que a anterior, mesmo com dois salvamentos no mesmo milissegundo
    const atualizadoEm = Math.max(Date.now(), (atual?.atualizadoEm ?? 0) + 1);
    await tx.store.put({ id, campos, diasDados, status, atualizadoEm });
    await tx.done;

    this._versoes.set(id, atualizadoEm);
    return id;
  }

  async excluir(id) {
    const db = await this._banco;
    const tx = db.transaction(LOJA, 'readwrite');
    if (!(await tx.store.get(id))) throw new Error('Relatório não encontrado.');
    await tx.store.delete(id);
    await tx.done;
    this._versoes.delete(id);
  }

  /** @returns {import('./RelatorioRepository').ResumoRelatorio} */
  _paraResumo({ id, campos, status, atualizadoEm }) {
    return {
      id,
      userId: this.usuario.id,
      autorEmail: this.usuario.email,
      cliente: campos.cliente,
      projeto: campos.projeto,
      tecnico: campos.tecnico,
      po: campos.po,
      task: campos.task,
      dataInicio: campos.dataInicio,
      dataFim: campos.dataFim,
      status,
      atualizadoEm: new Date(atualizadoEm),
    };
  }
}
