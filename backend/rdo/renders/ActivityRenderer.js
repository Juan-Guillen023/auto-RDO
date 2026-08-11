const ImageBlockRenderer = require('./ImageBlockRenderer');
const { parseHtmlParaPdf, htmlEstaVazio } = require('../../utils/richText');

class ActivityRenderer {
  constructor() {
    this.imageBlockRenderer = new ImageBlockRenderer();
  }

  render(doc, ativ, index, config) {
    const { margin, pageWidth, bottomEdge, vertLineX } = config;

    if (doc.y + 30 > bottomEdge) {
      doc.addPage();
      doc.y = config.contentStartY;
    }

    const startPage = doc.bufferedPageRange().count - 1;
    const startY = doc.y;

    this._printItemNumber(doc, ativ, index, margin, startY, vertLineX);
    this._printContent(doc, ativ, vertLineX, startY, config);
    this.imageBlockRenderer.render(doc, ativ.imagens, config);

    if (!ativ.imagens || ativ.imagens.length === 0) {
      doc.y += 8;
    }

    const endPage = doc.bufferedPageRange().count - 1;
    const endY = doc.y;

    this._drawGrid(doc, startPage, endPage, startY, endY, config);

    doc.switchToPage(endPage);
    doc.y = endY;
  }

  _printItemNumber(doc, ativ, index, margin, startY, vertLineX) {
    // 'Sem relatos.' só existe como texto puro (injetado pelo DayRenderer
    // quando o dia não tem atividades reais), nunca vem do editor de texto rico.
    const isFiller = ativ.texto === 'Sem relatos.' && (!ativ.imagens || ativ.imagens.length === 0);
    if (!isFiller) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#000000')
        .text(`${index + 1}`, margin, startY + 8, { width: 35, align: 'center', lineBreak: false });
    }
  }

  _printContent(doc, ativ, vertLineX, startY, config) {
    const originalLeftMargin = doc.page.margins.left;
    doc.page.margins.left = vertLineX + 8;
    doc.x = vertLineX + 8;
    doc.y = startY + 8;

    if (ativ.titulo) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(ativ.titulo, { width: 445, align: 'left' });
      doc.y += 4;
    }

    this._printTextoFormatado(doc, ativ.texto, 445, config);

    doc.page.margins.left = originalLeftMargin;
    doc.x = config.margin;
  }

  _fonteParaRun(run) {
    if (run.negrito && run.italico) return 'Helvetica-BoldOblique';
    if (run.negrito) return 'Helvetica-Bold';
    if (run.italico) return 'Helvetica-Oblique';
    return 'Helvetica';
  }

  /**
   * Renderiza o texto da atividade preservando negrito/itálico/sublinhado/
   * tamanho de fonte aplicados no editor rico do frontend.
   *
   * O PDFKit encadeia linhas via `continued: true` calculando a altura da
   * linha pelo tamanho da fonte da última chamada — quando os tamanhos
   * variam muito numa mesma linha isso sobrepõe o texto. Por isso fazemos
   * a quebra de linha manualmente aqui: quebra por palavra, usando a maior
   * fonte de cada linha pra definir a altura dela.
   */
  _printTextoFormatado(doc, textoHtml, width, config) {
    const paragrafos = parseHtmlParaPdf(textoHtml);

    if (paragrafos.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#000000').text('Sem relatos.', { width, align: 'left' });
      return;
    }

    const xInicial = doc.x;
    const fatorLinha = 1.25;

    paragrafos.forEach((runs) => {
      const palavras = [];
      runs.forEach((run) => {
        const fonte = this._fonteParaRun(run);
        const tamanho = run.tamanho || 10;
        // Mantém os espaços como tokens próprios pra preservar o espaçamento exato
        run.texto.split(/(\s+)/).filter((parte) => parte !== '').forEach((parte) => {
          palavras.push({ texto: parte, fonte, tamanho, sublinhado: run.sublinhado });
        });
      });

      let linha = [];
      let xAtual = xInicial;

      const flushLinha = () => {
        if (linha.length === 0) return;

        const alturaLinha = Math.max(...linha.map((p) => p.tamanho)) * fatorLinha;
        if (doc.y + alturaLinha > config.bottomEdge) {
          doc.addPage();
          doc.y = config.contentStartY + 8;
        }

        let x = xInicial;
        const y = doc.y;
        linha.forEach((p) => {
          doc.font(p.fonte).fontSize(p.tamanho);
          const larguraPalavra = doc.widthOfString(p.texto);
          doc.fillColor('#000000').text(p.texto, x, y, { lineBreak: false });

          // Desenha o sublinhado manualmente: passar `underline` pro .text() aqui
          // depende do cálculo interno de largura de linha do PDFKit, que não
          // roda com `lineBreak: false` e vira NaN.
          if (p.sublinhado && p.texto.trim() !== '') {
            const yLinha = y + doc.currentLineHeight() - 1;
            doc.save().lineWidth(0.5).moveTo(x, yLinha).lineTo(x + larguraPalavra, yLinha).stroke().restore();
          }

          x += larguraPalavra;
        });

        doc.x = xInicial;
        doc.y = y + alturaLinha;
        linha = [];
        xAtual = xInicial;
      };

      palavras.forEach((p) => {
        doc.font(p.fonte).fontSize(p.tamanho);
        const larguraPalavra = doc.widthOfString(p.texto);
        const ehEspaco = /^\s+$/.test(p.texto);

        if (xAtual + larguraPalavra > xInicial + width && linha.length > 0 && !ehEspaco) {
          flushLinha();
        }

        linha.push(p);
        xAtual += larguraPalavra;
      });

      flushLinha();
    });

    doc.x = xInicial;
  }

  /**
   * Desenha o grid de bordas de uma atividade que pode se estender por N páginas.
   *
   * @param {PDFDocument} doc
   * @param {number} startPage - índice da página onde a atividade começou
   * @param {number} endPage   - índice da página onde a atividade terminou
   * @param {number} startY    - coordenada Y inicial da atividade
   * @param {number} endY      - coordenada Y final da atividade
   * @param {RdoLayoutConfig} config
   */
  _drawGrid(doc, startPage, endPage, startY, endY, config) {
    const { margin, pageWidth, bottomEdge, vertLineX, contentStartY } = config;

    for (let i = startPage; i <= endPage; i++) {
      doc.switchToPage(i);

      // Define os limites verticais desta fatia da atividade nesta página
      const topBoundary    = i === startPage ? startY        : contentStartY;
      const bottomBoundary = i === endPage   ? endY          : bottomEdge;

      // Bordas verticais: esquerda externa, divisória do número, direita externa
      doc.moveTo(margin,              topBoundary).lineTo(margin,              bottomBoundary).stroke();
      doc.moveTo(vertLineX,           topBoundary).lineTo(vertLineX,           bottomBoundary).stroke();
      doc.moveTo(margin + pageWidth,  topBoundary).lineTo(margin + pageWidth,  bottomBoundary).stroke();

      // Borda horizontal inferior desta fatia
      doc.moveTo(margin, bottomBoundary).lineTo(margin + pageWidth, bottomBoundary).stroke();

      // Borda horizontal superior nas páginas de continuação (fecha o topo da caixa)
      if (i > startPage) {
        doc.moveTo(margin, contentStartY).lineTo(margin + pageWidth, contentStartY).stroke();
      }
    }
  }
}

module.exports = ActivityRenderer;