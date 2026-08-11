const ActivityRenderer = require('./ActivityRenderer');
const { htmlEstaVazio } = require('../../utils/richText');

/**
 * Renderiza o bloco de um dia completo: cabeçalho do dia + suas atividades.
 */
class DayRenderer {
  constructor() {
    this.activityRenderer = new ActivityRenderer();
  }

  render(doc, dia, config) {
    const atividades = this._resolveActivities(dia);

    if (doc.y + 40 > config.bottomEdge) {
      doc.addPage();
      doc.y = config.contentStartY;
    }

    this._drawDayHeader(doc, dia, config);

    for (let index = 0; index < atividades.length; index++) {
      this.activityRenderer.render(doc, atividades[index], index, config);
    }

    doc.y += 15;
  }

  _resolveActivities(dia) {
    const filtered = dia.atividades.filter(
      (ativ) => !htmlEstaVazio(ativ.texto) || ativ.imagens.length > 0
    );
    return filtered.length > 0 ? filtered : [{ texto: 'Sem relatos.', imagens: [] }];
  }

  _drawDayHeader(doc, dia, config) {
    const { margin, pageWidth, vertLineX } = config;
    const dayStartY = doc.y;

    doc.rect(margin, dayStartY, pageWidth, 20).fillAndStroke('#f1f5f9', '#000000');
    doc.moveTo(vertLineX, dayStartY).lineTo(vertLineX, dayStartY + 20).stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#000000')
      .text('ITEM', margin, dayStartY + 6, { width: 35, align: 'center', lineBreak: false })
      .text(`DATA: ${dia.data}`, margin + 45, dayStartY + 6, { lineBreak: false })
      .text(
        `HORÁRIO TRABALHADO: ${dia.horaInicio} às ${dia.horaFim}`,
        margin + 180,
        dayStartY + 6,
        { lineBreak: false }
      );

    doc.y = dayStartY + 20;
  }
}

module.exports = DayRenderer;