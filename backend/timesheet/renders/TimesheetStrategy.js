const MARGIN = 50;
const PAGE_WIDTH = 495;
const RIGHT_EDGE = MARGIN + PAGE_WIDTH;
const BOTTOM_EDGE = 750;

const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Larguras das colunas da tabela de atividades, somando PAGE_WIDTH (495).
const COLS = {
  data: 50,
  descricao: 150,
  travelling: 50,
  standby: 55,
  working: 50,
  overtime: 45,
  holiday: 50,
  total: 45,
};

/**
 * Extrai "mês/ano" (ex: "jul/2026") a partir de uma data no formato DD/MM/AAAA.
 * Usa a data de início do período, mesmo que o atendimento avance para o mês seguinte.
 * @param {string} dataBR
 * @returns {string}
 */
function getMesAnoAbreviado(dataBR) {
  if (!dataBR || dataBR.length !== 10) return '';
  const [, mesStr, anoStr] = dataBR.split('/');
  const mes = MESES_PT[parseInt(mesStr, 10) - 1] || '';
  return `${mes}/${anoStr}`;
}

/**
 * Renderiza o Timesheet no formato de controle de horas (modelo cliente),
 * a partir dos mesmos dias/atividades preenchidos no RDO.
 */
class TimesheetStrategy {
  async execute(doc, dados) {
    doc.y = 40;
    this._drawTitulo(doc);
    this._drawInfoGrid(doc, dados);
    this._drawTabela(doc, dados);
    this._drawAssinaturas(doc, dados);
    return doc;
  }

  _drawTitulo(doc) {
    const y = doc.y;
    doc.rect(MARGIN, y, PAGE_WIDTH, 30).stroke();
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
      .text('TIME SHEET', MARGIN, y + 9, { width: PAGE_WIDTH, align: 'center' });
    doc.y = y + 30;
  }

  _drawInfoGrid(doc, dados) {
    const labelCol1Width = 120;
    const valueCol1Width = 195;
    const labelCol2Width = 85;
    const valueCol2Width = 95;
    const rowHeightMinima = 22;

    const xLabel1 = MARGIN;
    const xValue1 = xLabel1 + labelCol1Width;
    const xLabel2 = xValue1 + valueCol1Width;
    const xValue2 = xLabel2 + labelCol2Width;

    const linhas = [
      ['Service Provided By:', `Emerson Automation Solutions - ${dados.tecnico || ''}`, 'Month / Year:', getMesAnoAbreviado(dados.dataInicio)],
      ['Designation:', 'Service Engineer', 'Country:', 'BR'],
      ['Client Name:', dados.cliente || '', 'Site location:', dados.localizacao || ''],
      ['Project / Cost Center:', `${dados.projeto || ''}${dados.task ? '  TASK ' + dados.task : ''}`, 'Department:', 'Commissioning'],
      ['Contract:', 'Day Rated', 'PO no:', dados.po || ''],
    ];

    // Altura de cada linha se ajusta ao conteúdo (ex: nome do técnico longo),
    // pra texto nunca ultrapassar a borda da célula.
    doc.font('Helvetica').fontSize(8.5);
    const rowHeights = linhas.map(([, value1]) => {
      const altura = doc.heightOfString(value1 || '', { width: valueCol1Width - 12 });
      return Math.max(rowHeightMinima, altura + 14);
    });

    const startY = doc.y;
    const totalHeight = rowHeights.reduce((soma, h) => soma + h, 0);

    doc.rect(MARGIN, startY, PAGE_WIDTH, totalHeight).stroke();
    doc.moveTo(xValue1, startY).lineTo(xValue1, startY + totalHeight).stroke();
    doc.moveTo(xLabel2, startY).lineTo(xLabel2, startY + totalHeight).stroke();
    doc.moveTo(xValue2, startY).lineTo(xValue2, startY + totalHeight).stroke();

    let cursorY = startY;
    linhas.forEach(([label1, value1, label2, value2], index) => {
      const rowY = cursorY;
      if (index > 0) {
        doc.moveTo(MARGIN, rowY).lineTo(RIGHT_EDGE, rowY).stroke();
      }

      const textY = rowY + 7;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000')
        .text(label1, xLabel1 + 6, textY, { width: labelCol1Width - 10 });
      doc.font('Helvetica')
        .text(value1, xValue1 + 6, textY, { width: valueCol1Width - 12 });
      doc.font('Helvetica-Bold')
        .text(label2, xLabel2 + 6, textY, { width: labelCol2Width - 10, lineBreak: false });
      doc.font('Helvetica')
        .text(value2, xValue2 + 6, textY, { width: valueCol2Width - 12, lineBreak: false });

      cursorY += rowHeights[index];
    });

    doc.y = startY + totalHeight + 15;
  }

  _buildLinhasAtividades(dados) {
    const linhas = [];
    for (const dia of dados.dias || []) {
      for (const ativ of dia.atividades || []) {
        if (!ativ.titulo?.trim()) continue;
        const horas = parseFloat(ativ.horas) || 0;
        linhas.push({ data: dia.data, titulo: ativ.titulo, horas });
      }
    }
    return linhas;
  }

  _drawTabela(doc, dados) {
    const linhas = this._buildLinhasAtividades(dados);
    const totalHoras = linhas.reduce((acc, linha) => acc + linha.horas, 0);

    this._drawCabecalhoTabela(doc);

    for (const linha of linhas) {
      const rowHeight = this._medirAlturaLinha(doc, linha.titulo);
      if (doc.y + rowHeight > BOTTOM_EDGE) {
        doc.addPage();
        doc.y = 40;
        this._drawCabecalhoTabela(doc);
      }
      this._drawLinhaTabela(doc, [linha.data, linha.titulo, '-', '-', linha.horas || '-', '-', '-', linha.horas || '-'], rowHeight);
    }

    if (doc.y + 18 > BOTTOM_EDGE) {
      doc.addPage();
      doc.y = 40;
      this._drawCabecalhoTabela(doc);
    }
    this._drawLinhaTotal(doc, totalHoras);

    doc.y += 15;
  }

  _drawLinhaTotal(doc, totalHoras) {
    const y = doc.y;
    const rowHeight = 18;
    const larguraRotulo = COLS.data + COLS.descricao;

    doc.rect(MARGIN, y, PAGE_WIDTH, rowHeight).fillAndStroke('#e2e8f0', '#000000');

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000')
      .text('GRAND TOTAL Hours', MARGIN + 5, y + 5, { width: larguraRotulo - 8, lineBreak: false });

    const valoresRestantes = [0, 0, totalHoras, 0, 0, totalHoras];
    const largurasRestantes = [COLS.travelling, COLS.standby, COLS.working, COLS.overtime, COLS.holiday, COLS.total];

    let x = MARGIN + larguraRotulo;
    valoresRestantes.forEach((valor, index) => {
      const largura = largurasRestantes[index];
      doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      doc.text(String(valor), x, y + 5, { width: largura, align: 'center', lineBreak: false });
      x += largura;
    });

    doc.y = y + rowHeight;
  }

  _drawCabecalhoTabela(doc) {
    const y = doc.y;
    const rowHeight = 26;
    const headers = [
      ['Date', COLS.data],
      ['Description of Work', COLS.descricao],
      ['Travelling', COLS.travelling],
      ['Quarantine/Stand By', COLS.standby],
      ['Working Hours', COLS.working],
      ['Overtime Hours', COLS.overtime],
      ['Public Holiday', COLS.holiday],
      ['Total', COLS.total],
    ];

    doc.rect(MARGIN, y, PAGE_WIDTH, rowHeight).fillAndStroke('#e2e8f0', '#000000');

    let x = MARGIN;
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000');
    for (const [texto, largura] of headers) {
      if (x !== MARGIN) doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      doc.text(texto, x + 3, y + 7, { width: largura - 6, align: 'center' });
      x += largura;
    }

    doc.y = y + rowHeight;
  }

  /**
   * Mede a altura necessária pra linha, considerando que a Descrição
   * (única coluna com texto livre) pode quebrar em mais de uma linha.
   */
  _medirAlturaLinha(doc, titulo) {
    doc.font('Helvetica').fontSize(7.5);
    const altura = doc.heightOfString(titulo || '', { width: COLS.descricao - 10 });
    return Math.max(18, altura + 8);
  }

  _drawLinhaTabela(doc, valores, rowHeight = 18) {
    const y = doc.y;
    const larguras = Object.values(COLS);

    doc.rect(MARGIN, y, PAGE_WIDTH, rowHeight).stroke();

    let x = MARGIN;
    doc.font('Helvetica').fontSize(7.5).fillColor('#000000');
    valores.forEach((valor, index) => {
      const largura = larguras[index];
      if (x !== MARGIN) doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();

      const isDescricao = index === 1;
      doc.text(String(valor ?? ''), x + (isDescricao ? 5 : 0), y + 5, {
        width: largura - (isDescricao ? 8 : 3),
        align: isDescricao ? 'left' : 'center',
        lineBreak: isDescricao,
        ellipsis: !isDescricao,
      });
      x += largura;
    });

    doc.y = y + rowHeight;
  }

  _drawAssinaturas(doc, dados) {
    if (doc.y + 60 > BOTTOM_EDGE) {
      doc.addPage();
      doc.y = 40;
    }

    const y = doc.y;
    const halfWidth = PAGE_WIDTH / 2;

    doc.rect(MARGIN, y, PAGE_WIDTH, 55).stroke();
    doc.moveTo(MARGIN + halfWidth, y).lineTo(MARGIN + halfWidth, y + 55).stroke();
    doc.moveTo(MARGIN, y + 18).lineTo(RIGHT_EDGE, y + 18).stroke();

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000')
      .text('Vendor Name:', MARGIN + 6, y + 6, { lineBreak: false })
      .text('Customer Name:', MARGIN + halfWidth + 6, y + 6, { lineBreak: false });

    doc.font('Helvetica').fontSize(8)
      .text(dados.tecnico || '', MARGIN + 90, y + 6, { width: halfWidth - 96, lineBreak: false })
      .text('Date:', MARGIN + 6, y + 32, { lineBreak: false })
      .text('Date:', MARGIN + halfWidth + 6, y + 32, { lineBreak: false });

    doc.y = y + 55;
  }
}

module.exports = TimesheetStrategy;
