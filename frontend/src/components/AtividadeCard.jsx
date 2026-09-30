import styles from './AtividadeCard.module.css';
import RichTextEditor from './RichTextEditor';
import { STATUS_ATIVIDADE } from '../constants/atividade';

/**
 * Renderiza um item de atividade: número, título, descrição, status e galeria de fotos.
 */
function AtividadeCard({
  atividade,
  index,
  podeRemover,
  onAtividadeChange,
  onImageUpload,
  onRemoverImagem,
  onRemover,
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardRow}>
        {/* Numeração lateral */}
        <span className={styles.numero}>{index + 1}.</span>

        {/* Campos de texto */}
        <div className={styles.campos}>
          <div className={styles.campoGrupo}>
            <label className={styles.campoLabel}>Título da Atividade</label>
            <input
              type="text"
              className={styles.campoInput}
              value={atividade.titulo || ''}
              onChange={(e) => onAtividadeChange('titulo', e.target.value)}
              placeholder="Título da atividade..."
              required
            />
          </div>

          <div className={styles.campoGrupo}>
            <label className={styles.campoLabel}>Descrição Detalhada</label>
            <RichTextEditor
              value={atividade.texto}
              onChange={(html) => onAtividadeChange('texto', html)}
              placeholder="Descreva detalhadamente o que foi feito..."
            />
          </div>

          <div className={styles.campoGrupo}>
            <label className={styles.campoLabel}>Status</label>
            <select
              className={styles.campoInput}
              value={atividade.status || 'concluido'}
              onChange={(e) => onAtividadeChange('status', e.target.value)}
            >
              {STATUS_ATIVIDADE.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.campoGrupo}>
            <label className={styles.campoLabel}>Horas Trabalhadas (para o Timesheet)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              className={styles.campoInput}
              value={atividade.horas ?? ''}
              onChange={(e) => onAtividadeChange('horas', e.target.value)}
              placeholder="Ex: 8"
            />
          </div>
        </div>

        {/* Botão de remover */}
        {podeRemover && (
          <button
            type="button"
            className={styles.btnRemover}
            onClick={onRemover}
            aria-label="Remover atividade"
          >
            ✕
          </button>
        )}
      </div>

      {/* Upload e galeria de imagens */}
      <div className={styles.galeriaArea}>
        <label className={styles.uploadLabel}>
          📷 Anexar foto a este item
          <input
            type="file"
            accept="image/*"
            multiple
            className={styles.uploadInput}
            onChange={(e) => onImageUpload(e.target.files)}
          />
        </label>

        {atividade.imagens.length > 0 && (
          <div className={styles.galeria}>
            {atividade.imagens.map((img, i) => (
              <div key={i} className={styles.galeriaItem}>
                <img src={img} alt={`Foto ${i + 1}`} className={styles.galeriaImg} />
                <button
                  type="button"
                  className={styles.btnRemoverImg}
                  onClick={() => onRemoverImagem(i)}
                  aria-label={`Remover foto ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AtividadeCard;
