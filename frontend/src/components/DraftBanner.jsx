import styles from './DraftBanner.module.css';

/**
 * Oferece importar para a conta o rascunho salvo no navegador pela versão
 * anterior do app (antes dos relatórios irem para o banco).
 */
function DraftBanner({ salvoEm, importando, onImportar, onDescartar }) {
  const dataFormatada = salvoEm
    ? salvoEm.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div className={styles.banner} role="alert">
      <div className={styles.info}>
        <span className={styles.icone}>💾</span>
        <div>
          <p className={styles.titulo}>Rascunho antigo encontrado neste navegador</p>
          <p className={styles.detalhe}>Salvo em {dataFormatada}. Importe para não perdê-lo.</p>
        </div>
      </div>
      <div className={styles.acoes}>
        <button type="button" className={styles.btnRetomar} onClick={onImportar} disabled={importando}>
          {importando ? 'Importando...' : 'Importar para minha conta'}
        </button>
        <button type="button" className={styles.btnDescartar} onClick={onDescartar} disabled={importando}>
          Descartar
        </button>
      </div>
    </div>
  );
}

export default DraftBanner;
