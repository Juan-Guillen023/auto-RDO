import styles from './SaveBar.module.css';

const formatarHora = (data) =>
  data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const APRESENTACAO = {
  salvo:    { classe: styles.salvo,    texto: (ultimo) => (ultimo ? `✓ Salvo às ${formatarHora(ultimo)}` : '✓ Tudo salvo') },
  pendente: { classe: styles.pendente, texto: () => 'Alterações não salvas' },
  salvando: { classe: styles.salvando, texto: () => 'Salvando...' },
  erro:     { classe: styles.erro,     texto: () => '⚠️ Não foi possível salvar. Tentando novamente...' },
  conflito: {
    classe: styles.erro,
    texto: () => '⚠️ Outra pessoa alterou este relatório enquanto você editava. Suas últimas alterações NÃO foram salvas — volte para a lista e abra-o de novo para ver a versão atual.',
  },
};

/**
 * Barra de status do salvamento, com botão para salvar na hora.
 * @param {{
 *   estado: import('../hooks/useRelatorioPersistence').EstadoSalvamento,
 *   ultimoSalvamento: Date | null,
 *   onSalvar: () => void,
 * }} props
 */
function SaveBar({ estado, ultimoSalvamento, onSalvar }) {
  const { classe, texto } = APRESENTACAO[estado];

  return (
    <div className={`${styles.savebar} ${classe}`}>
      <button
        type="button"
        className={styles.btnSalvar}
        onClick={onSalvar}
        disabled={estado === 'salvando' || estado === 'salvo' || estado === 'conflito'}
      >
        💾 Salvar agora
      </button>
      <span className={styles.status} role="status">{texto(ultimoSalvamento)}</span>
    </div>
  );
}

export default SaveBar;
