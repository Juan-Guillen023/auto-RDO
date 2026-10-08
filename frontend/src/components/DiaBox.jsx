import AtividadeCard from './AtividadeCard';
import styles from './DiaBox.module.css';

/**
 * Renderiza o bloco de um único dia do RDO:
 * data, horários de entrada/saída, lista de atividades e ações do dia.
 *
 * `acoes` traz o estado pronto (quem gera e como fica com o formulário):
 * { gerandoPdf, gerandoEmail, ocupado, erro, onGerarPdf, onGerarEmail }
 */
function DiaBox({
  dia,
  indexDia,
  onDiaChange,
  onAtividadeChange,
  onAddAtividade,
  onRemoverAtividade,
  onImageUpload,
  onRemoverImagem,
  acoes,
}) {
  return (
    // data-escopo delimita os campos validados no "PDF do dia" (ver validarCamposDoEscopo)
    <div className={styles.diaBox} data-escopo={dia.data}>
      <h4 className={styles.titulo}>📅 Dia: {dia.data}</h4>

      {/* Horários */}
      <div className={styles.horarios}>
        <div className={styles.formGroup}>
          <label>Hora Entrada</label>
          <input
            type="text"
            placeholder="HH:MM"
            value={dia.horaInicio}
            onChange={(e) => onDiaChange(indexDia, 'horaInicio', e.target.value)}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label>Hora Saída</label>
          <input
            type="text"
            placeholder="HH:MM"
            value={dia.horaFim}
            onChange={(e) => onDiaChange(indexDia, 'horaFim', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Atividades */}
      <div className={styles.atividadesGrupo}>
        <label className={styles.atividadesLabel}>Atividades deste dia</label>

        {dia.atividades.map((ativ, indexAtiv) => (
          <AtividadeCard
            key={indexAtiv}
            atividade={ativ}
            index={indexAtiv}
            podeRemover={dia.atividades.length > 1}
            onAtividadeChange={(campo, valor) =>
              onAtividadeChange(indexDia, indexAtiv, campo, valor)
            }
            onImageUpload={(files) => onImageUpload(indexDia, indexAtiv, files)}
            onRemoverImagem={(indexImagem) => onRemoverImagem(indexDia, indexAtiv, indexImagem)}
            onRemover={() => onRemoverAtividade(indexDia, indexAtiv)}
            />
        ))}

        <button
          type="button"
          className={styles.btnAddAtividade}
          onClick={() => onAddAtividade(indexDia)}
        >
          + Adicionar outro item
        </button>
      </div>

      <div className={styles.acoesDia}>
        <span className={styles.acoesLabel}>Relatório deste dia:</span>
        <button type="button" className={styles.btnAcao} onClick={acoes.onGerarPdf} disabled={acoes.ocupado}>
          {acoes.gerandoPdf ? 'Gerando PDF...' : '📄 PDF do dia'}
        </button>
        <button type="button" className={styles.btnAcao} onClick={acoes.onGerarEmail} disabled={acoes.ocupado}>
          {acoes.gerandoEmail ? 'Gerando e-mail...' : '📧 E-mail do dia'}
        </button>
        {acoes.erro && <p className={styles.erroAcao} role="alert">{acoes.erro}</p>}
      </div>
    </div>
  );
}

export default DiaBox;
