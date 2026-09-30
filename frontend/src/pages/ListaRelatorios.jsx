import { useEffect, useState } from 'react';
import DraftBanner from '../components/DraftBanner';
import { loadDraft, clearDraft } from '../services/draftService';
import { useUsuario } from '../contexts/UsuarioContext';
import { doUsuario, deOutrosUsuarios, doAutor, emailsDosAutores } from '../utils/filtrosRelatorio';
import styles from './ListaRelatorios.module.css';

const ROTULO_STATUS = {
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
};

const formatarPeriodo = ({ dataInicio, dataFim }) =>
  dataInicio && dataFim ? `${dataInicio} a ${dataFim}` : 'Período não definido';

/** "👷 João · PO 4500123 · Task 42" — omite o que estiver vazio */
const formatarIdentificacao = ({ tecnico, po, task }) =>
  [
    `👷 ${tecnico || 'Técnico não informado'}`,
    po && `PO ${po}`,
    task && `Task ${task}`,
  ].filter(Boolean).join(' · ');

const formatarAtualizacao = (data) =>
  data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * "Meus relatórios": lista, abre, exclui e cria relatórios.
 * @param {{
 *   repositorio: import('../repositories/RelatorioRepository').RelatorioRepository,
 *   onAbrir: (id: string) => void,
 *   onNovo: () => void,
 * }} props
 */
function ListaRelatorios({ repositorio, onAbrir, onNovo }) {
  const usuario = useUsuario();
  const [filtro, setFiltro] = useState('todos'); // 'todos' | 'meus'
  const [filtroEmail, setFiltroEmail] = useState(''); // '' = todos os técnicos
  const [carga, setCarga] = useState({ estado: 'carregando', relatorios: [] });
  const [versao, setVersao] = useState(0); // incrementar = buscar a lista de novo
  const [erroAcao, setErroAcao] = useState(null);
  const [excluindoId, setExcluindoId] = useState(null);
  const [rascunhoLocal, setRascunhoLocal] = useState(loadDraft);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    repositorio.listar().then(
      (relatorios) => !cancelado && setCarga({ estado: 'pronto', relatorios }),
      (err) => {
        console.error('Erro ao listar relatórios:', err);
        if (!cancelado) setCarga((atual) => ({ ...atual, estado: 'erro' }));
      }
    );
    return () => { cancelado = true; };
  }, [repositorio, versao]);

  const recarregar = () => setVersao((v) => v + 1);

  // Só um admin recebe relatórios de outros usuários (o RLS decide isso no
  // banco); a tela apenas reage ao que chegou, sem precisar saber quem é admin.
  const ehMeu = doUsuario(usuario.id);
  const meus = carga.relatorios.filter(ehMeu);
  const deOutros = carga.relatorios.filter(deOutrosUsuarios(usuario.id));
  const temDeOutros = deOutros.length > 0;
  // As abas são disjuntas: "Todos" = relatórios da equipe, "Meus" = os próprios.
  // Sem relatórios de outros (usuário comum, ou admin após excluir o último),
  // as abas somem e a lista cai para os próprios — nunca fica vazia por engano.
  const naAbaEquipe = temDeOutros && filtro === 'todos';
  const emails = emailsDosAutores(deOutros);
  // Se o último relatório do técnico escolhido for excluído, o e-mail some da
  // lista; em vez de mostrar uma lista vazia, volta para "Todos os técnicos".
  const emailSelecionado = emails.includes(filtroEmail) ? filtroEmail : '';
  const visiveis = naAbaEquipe ? deOutros.filter(doAutor(emailSelecionado)) : meus;

  const handleExcluir = async (relatorio) => {
    const nome = relatorio.cliente || 'sem cliente';
    const avisoDeOutroUsuario = ehMeu(relatorio)
      ? ''
      : `\n\nATENÇÃO: este relatório é de outro usuário (${relatorio.tecnico || 'técnico não informado'}).`;
    const confirmou = window.confirm(
      `Excluir o relatório "${nome}" (${formatarPeriodo(relatorio)})?${avisoDeOutroUsuario}\n\nEsta ação não pode ser desfeita.`
    );
    if (!confirmou) return;

    setExcluindoId(relatorio.id);
    setErroAcao(null);
    try {
      await repositorio.excluir(relatorio.id);
      // Remove da tela sem buscar tudo de novo
      setCarga((atual) => ({ ...atual, relatorios: atual.relatorios.filter((r) => r.id !== relatorio.id) }));
    } catch (err) {
      console.error('Erro ao excluir relatório:', err);
      setErroAcao('Não foi possível excluir o relatório. Tente novamente.');
    } finally {
      setExcluindoId(null);
    }
  };

  const handleImportarRascunho = async () => {
    setImportando(true);
    setErroAcao(null);
    try {
      await repositorio.salvar({
        id: crypto.randomUUID(),
        campos: rascunhoLocal.campos,
        diasDados: rascunhoLocal.diasDados,
      });
      // Só apaga do navegador depois de garantido no banco
      clearDraft();
      setRascunhoLocal(null);
      recarregar();
    } catch (err) {
      console.error('Erro ao importar rascunho:', err);
      setErroAcao('Não foi possível importar o rascunho. Ele continua salvo neste navegador.');
    } finally {
      setImportando(false);
    }
  };

  const handleDescartarRascunho = () => {
    if (!window.confirm('Descartar o rascunho antigo deste navegador? Ele não poderá ser recuperado.')) return;
    clearDraft();
    setRascunhoLocal(null);
  };

  return (
    <div className={styles.container}>
      <header className={styles.cabecalho}>
        <div>
          <h1 className={styles.titulo}>Meus relatórios</h1>
          <p className={styles.subtitulo}>Continue um relatório em andamento ou comece um novo</p>
        </div>
        <button type="button" className={styles.btnNovo} onClick={onNovo}>
          + Novo relatório
        </button>
      </header>

      {rascunhoLocal && (
        <DraftBanner
          salvoEm={rascunhoLocal.savedAt ? new Date(rascunhoLocal.savedAt) : null}
          importando={importando}
          onImportar={handleImportarRascunho}
          onDescartar={handleDescartarRascunho}
        />
      )}

      {erroAcao && <p className={styles.erro} role="alert">{erroAcao}</p>}

      {carga.estado === 'carregando' && <p className={styles.vazio}>Carregando relatórios...</p>}

      {carga.estado === 'erro' && (
        <div className={styles.erro} role="alert">
          Não foi possível carregar seus relatórios. Verifique sua conexão.{' '}
          <button type="button" className={styles.btnLink} onClick={recarregar}>Tentar novamente</button>
        </div>
      )}

      {carga.estado === 'pronto' && carga.relatorios.length === 0 && (
        <p className={styles.vazio}>
          Nenhum relatório ainda. Clique em <strong>+ Novo relatório</strong> para começar.
        </p>
      )}

      {temDeOutros && (
        <div className={styles.filtros} role="group" aria-label="Filtrar relatórios">
          <button
            type="button"
            className={filtro === 'todos' ? styles.filtroAtivo : styles.filtro}
            aria-pressed={filtro === 'todos'}
            onClick={() => setFiltro('todos')}
          >
            Todos ({deOutros.length})
          </button>
          <button
            type="button"
            className={filtro === 'meus' ? styles.filtroAtivo : styles.filtro}
            aria-pressed={filtro === 'meus'}
            onClick={() => setFiltro('meus')}
          >
            Meus ({meus.length})
          </button>
        </div>
      )}

      {naAbaEquipe && (
        <div className={styles.buscaEmail}>
          <label htmlFor="filtro-email" className={styles.buscaRotulo}>Filtrar por e-mail do técnico</label>
          <select
            id="filtro-email"
            className={styles.buscaCampo}
            value={emailSelecionado}
            onChange={(e) => setFiltroEmail(e.target.value)}
          >
            <option value="">Todos os técnicos ({deOutros.length})</option>
            {emails.map((email) => (
              <option key={email} value={email}>
                {email} ({deOutros.filter(doAutor(email)).length})
              </option>
            ))}
          </select>
        </div>
      )}

      {filtro === 'meus' && temDeOutros && meus.length === 0 && (
        <p className={styles.vazio}>Você ainda não tem relatórios próprios.</p>
      )}

      {visiveis.length > 0 && (
        <ul className={styles.lista}>
          {visiveis.map((relatorio) => (
            <li key={relatorio.id} className={styles.item}>
              <button type="button" className={styles.itemPrincipal} onClick={() => onAbrir(relatorio.id)}>
                <span className={styles.itemTitulo}>{relatorio.cliente || 'Sem cliente'}</span>
                <span className={styles.itemInfo}>{formatarIdentificacao(relatorio)}</span>
                {!ehMeu(relatorio) && relatorio.autorEmail && (
                  <span className={styles.itemDetalhe}>✉️ {relatorio.autorEmail}</span>
                )}
                <span className={styles.itemDetalhe}>
                  📅 {formatarPeriodo(relatorio)} · Atualizado em {formatarAtualizacao(relatorio.atualizadoEm)}
                </span>
              </button>

              {!ehMeu(relatorio) && (
                <span className={styles.seloOutro} title="Relatório de outro usuário (você pode editar e excluir como administrador)">
                  👥 Equipe
                </span>
              )}

              <span className={`${styles.status} ${styles[relatorio.status]}`}>
                {ROTULO_STATUS[relatorio.status]}
              </span>

              <button
                type="button"
                className={styles.btnExcluir}
                onClick={() => handleExcluir(relatorio)}
                disabled={excluindoId === relatorio.id}
                aria-label={`Excluir relatório ${relatorio.cliente || 'sem cliente'}`}
              >
                {excluindoId === relatorio.id ? '...' : '🗑'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ListaRelatorios;
