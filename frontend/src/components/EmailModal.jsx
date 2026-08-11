import { useState } from 'react';
import styles from './EmailModal.module.css';

/**
 * Modal que exibe o email (assunto e corpo) gerado pela IA, em PT e EN,
 * com botão de copiar para colar diretamente no Outlook.
 */
function EmailModal({ email, onFechar }) {
  const [idioma, setIdioma] = useState('pt');
  const [copiado, setCopiado] = useState(false);

  const assunto = email.subject?.[idioma] || '';
  const corpo = email.body?.[idioma] || '';

  const handleCopiar = async () => {
    const texto = `Assunto: ${assunto}\n\n${corpo}`;
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.titulo}>📧 Email Diário Gerado</h3>
          <button type="button" className={styles.btnFechar} onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className={styles.abas}>
          <button
            type="button"
            className={`${styles.aba} ${idioma === 'pt' ? styles.abaAtiva : ''}`}
            onClick={() => setIdioma('pt')}
          >
            Português
          </button>
          <button
            type="button"
            className={`${styles.aba} ${idioma === 'en' ? styles.abaAtiva : ''}`}
            onClick={() => setIdioma('en')}
          >
            English
          </button>
        </div>

        <div className={styles.campoGrupo}>
          <label className={styles.campoLabel}>Assunto</label>
          <input type="text" className={styles.campoInput} value={assunto} readOnly />
        </div>

        <div className={styles.campoGrupo}>
          <label className={styles.campoLabel}>Corpo do email</label>
          <textarea className={styles.campoTextarea} value={corpo} readOnly rows={16} />
        </div>

        <div className={styles.acoes}>
          <button type="button" className={styles.btnCopiar} onClick={handleCopiar}>
            {copiado ? '✓ Copiado!' : '📋 Copiar assunto + corpo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailModal;
