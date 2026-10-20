const {
  TIPOS_HORA, formatarMesAno, formatarHoras, formatarProjeto, montarLinhas, somarPorTipo,
} = require('../formatacao');

const MARGIN = 50;
const PAGE_WIDTH = 495;
const TOP = 40;
const BOTTOM_EDGE = 800;

const PRETO = '#000000';
const VERMELHO = '#FF0000';
const CINZA = '#D9D9D9';

// Medidas tiradas do modelo do cliente, escaladas para PAGE_WIDTH.
const ALTURA = { titulo: 35, cabecalho: 13, linha: 15.5, espaco: 16, assinatura: 31, rodape: 13 };
const COLS_INFO = [96, 205, 78, 116];
const COLS_TABELA = [48, 214, 40, 38, 39, 38, 39, 39];
const COLS_ASSINATURA = [96, 119, 58, 63, 120, 39];

// O modelo sempre mostra a tabela com esse número de linhas, mesmo vazias.
const LINHAS_MINIMAS = 23;

// Tudo o que vem depois das atividades precisa caber na última página.
const RESERVA_FINAL = ALTURA.linha + ALTURA.espaco + ALTURA.assinatura + ALTURA.rodape;

const ESTILO_ROTULO = { alinhar: 'left' };
const ESTILO_VALOR = { negrito: true };
const ESTILO_DESTAQUE = { negrito: true, cor: VERMELHO };

/**
 * Renderiza o Timesheet no modelo de controle de horas do cliente,
 * a partir dos mesmos dias/atividades preenchidos no RDO.
 *
 * Sem estado entre execuções: a mesma instância atende todas as requisições.
 */
class TimesheetStrategy {
  async execute(doc, dados) {
    doc.y = TOP;
    this._drawTitulo(doc);
    this._drawInfoGrid(doc, dados);
    this._drawTabela(doc, montarLinhas(dados.dias));
    this._drawFaixaVazia(doc, ALTURA.espaco);
    this._drawAssinaturas(doc);
    this._drawFaixaVazia(doc, ALTURA.rodape);
    this._fecharMoldura(doc);
    return doc;
  }

  _drawTitulo(doc) {
    this._celula(doc, 'TIME SHEET', MARGIN, doc.y, PAGE_WIDTH, ALTURA.titulo, { negrito: true, tamanho: 9.5 });
    doc.y += ALTURA.titulo;
  }

  _drawInfoGrid(doc, dados) {
    // [texto, coluna, linha, colunas ocupadas, linhas ocupadas, estilo]
    const celulas = [
      ['Service Provided By:', 0, 0, 1, 1, ESTILO_ROTULO],
      [`Emerson Automation Solutions - ${dados.tecnico || ''}`, 1, 0, 2, 1, ESTILO_DESTAQUE],
      ['Month / Year', 3, 0, 1, 1, ESTILO_VALOR],
      ['Designation:', 0, 1, 1, 1, ESTILO_ROTULO],
      ['Service Engineer', 1, 1, 2, 1, ESTILO_DESTAQUE],
      [formatarMesAno(dados.dataInicio), 3, 1, 1, 1, ESTILO_DESTAQUE],
      ['Country :', 0, 2, 1, 1, ESTILO_ROTULO],
      ['BR', 1, 2, 1, 1, ESTILO_VALOR],
      ['Client Name:', 2, 2, 1, 2, {}],
      [dados.cliente || '', 3, 2, 1, 2, { ...ESTILO_VALOR, quebrar: true }],
      ['Site location:', 0, 3, 1, 1, ESTILO_ROTULO],
      [dados.localizacao || '', 1, 3, 1, 1, ESTILO_VALOR],
      ['Project / Cost Center:', 0, 4, 1, 1, ESTILO_ROTULO],
      [formatarProjeto(dados.projeto, dados.task), 1, 4, 1, 1, { ...ESTILO_VALOR, quebrar: true }],
      ['Department:', 2, 4, 1, 1, {}],
      ['Commissioning', 3, 4, 1, 1, ESTILO_VALOR],
      ['Contract:', 0, 5, 1, 1, ESTILO_ROTULO],
      ['Day Rated', 1, 5, 1, 1, ESTILO_VALOR],
      ['PO no:', 2, 5, 1, 1, {}],
      [dados.po || '', 3, 5, 1, 1, ESTILO_VALOR],
    ];

    this._drawGrade(doc, COLS_INFO, [16, 16, 17, 17, 27, 20], celulas);
  }

  _drawTabela(doc, linhas) {
    this._drawCabecalhoTabela(doc);

    for (const linha of linhas) {
      const altura = this._medirAlturaLinha(doc, linha.descricao);
      if (doc.y + altura > BOTTOM_EDGE) this._novaPagina(doc);
      const colunasHoras = TIPOS_HORA.map((tipo) => (tipo === linha.tipoHora ? formatarHoras(linha.horas) : '-'));
      const total = formatarHoras(linha.horas);
      this._drawLinhaTabela(doc, [linha.data, linha.descricao, ...colunasHoras, total], altura);
    }

    // Completa com linhas vazias até o mínimo do modelo, sem empurrar o rodapé
    // para outra página
    const vazias = Math.max(0, LINHAS_MINIMAS - linhas.length);
    for (let i = 0; i < vazias && doc.y + ALTURA.linha + RESERVA_FINAL <= BOTTOM_EDGE; i++) {
      this._drawLinhaTabela(doc, [], ALTURA.linha);
    }

    if (doc.y + RESERVA_FINAL > BOTTOM_EDGE) this._novaPagina(doc);
    this._drawLinhaTotal(doc, somarPorTipo(linhas));
  }

  _drawCabecalhoTabela(doc) {
    const titulos = ['Date', 'Description of Work', 'Travelling', 'Quarantine/Stand By',
      'Working Hours', 'Overtime Hours', 'Public Holiday', 'Total'];
    let x = MARGIN;
    titulos.forEach((titulo, i) => {
      const alinhar = i === 1 ? 'center' : 'left';
      this._celula(doc, titulo, x, doc.y, COLS_TABELA[i], ALTURA.cabecalho, { negrito: true, tamanho: 5, alinhar, quebrar: true });
      x += COLS_TABELA[i];
    });
    doc.y += ALTURA.cabecalho;
  }

  /** Só a descrição (texto livre) pode quebrar linha e aumentar a altura. */
  _medirAlturaLinha(doc, descricao) {
    doc.font('Helvetica').fontSize(7);
    const altura = doc.heightOfString(descricao, { width: COLS_TABELA[1] - 6 });
    return Math.max(ALTURA.linha, altura + 6);
  }

  _drawLinhaTabela(doc, [data = '', descricao = '', ...horas], altura) {
    const estilos = [
      { ...ESTILO_DESTAQUE, tamanho: 6.5 },
      { alinhar: 'left', quebrar: true },
      ...horas.map(() => ({})),
    ];
    const valores = [data, descricao, ...horas];

    let x = MARGIN;
    COLS_TABELA.forEach((largura, i) => {
      this._celula(doc, valores[i] ?? '', x, doc.y, largura, altura, estilos[i]);
      x += largura;
    });
    doc.y += altura;
  }

  _drawLinhaTotal(doc, totaisPorTipo) {
    const y = doc.y;
    const larguraRotulo = COLS_TABELA[0] + COLS_TABELA[1];
    doc.rect(MARGIN, y, PAGE_WIDTH, ALTURA.linha).fill(CINZA);

    this._celula(doc, 'GRAND TOTAL Hours', MARGIN, y, larguraRotulo, ALTURA.linha,
      { negrito: true, tamanho: 6, alinhar: 'left' });

    let x = MARGIN + larguraRotulo;
    const total = totaisPorTipo.reduce((a, b) => a + b, 0);
    [...totaisPorTipo, total].forEach((valor, i) => {
      const largura = COLS_TABELA[i + 2];
      this._celula(doc, String(valor), x, y, largura, ALTURA.linha, { negrito: true, tamanho: 9 });
      x += largura;
    });
    doc.y = y + ALTURA.linha;
  }

  /** Nome e data ficam em branco: são preenchidos à mão na assinatura. */
  _drawAssinaturas(doc) {
    const celulas = [
      ['Vendor Name:', 0, 0, 1, 2, { ...ESTILO_ROTULO, negrito: true }],
      ['', 1, 0, 1, 2, {}],
      ['Date', 2, 0, 1, 1, { ...ESTILO_ROTULO, negrito: true }],
      ['', 2, 1, 1, 1, {}],
      ['Customer Name:', 3, 0, 1, 2, { ...ESTILO_ROTULO, negrito: true }],
      ['', 4, 0, 1, 2, {}],
      ['Date', 5, 0, 1, 1, { ...ESTILO_ROTULO, negrito: true }],
      ['', 5, 1, 1, 1, {}],
    ];
    this._drawGrade(doc, COLS_ASSINATURA, [13, ALTURA.assinatura - 13], celulas);
  }

  _drawFaixaVazia(doc, altura) {
    this._celula(doc, '', MARGIN, doc.y, PAGE_WIDTH, altura);
    doc.y += altura;
  }

  _novaPagina(doc) {
    this._fecharMoldura(doc);
    doc.addPage();
    doc.y = TOP;
    this._drawCabecalhoTabela(doc);
  }

  /** Borda externa mais grossa, como no modelo. */
  _fecharMoldura(doc) {
    doc.lineWidth(1.5).rect(MARGIN, TOP, PAGE_WIDTH, doc.y - TOP).stroke(PRETO);
  }

  /**
   * Desenha uma grade de células com mesclagem (colunas/linhas ocupadas),
   * a partir de doc.y, e avança doc.y para o fim dela.
   */
  _drawGrade(doc, larguras, alturas, celulas) {
    const inicioX = (col) => MARGIN + larguras.slice(0, col).reduce((a, b) => a + b, 0);
    const inicioY = (lin) => doc.y + alturas.slice(0, lin).reduce((a, b) => a + b, 0);

    for (const [texto, col, lin, colunas, linhas, estilo] of celulas) {
      const x = inicioX(col);
      const y = inicioY(lin);
      this._celula(doc, texto, x, y, inicioX(col + colunas) - x, inicioY(lin + linhas) - y, estilo);
    }
    doc.y = inicioY(alturas.length);
  }

  /**
   * Célula com borda e texto centralizado na vertical. O recorte (clip)
   * garante que um valor longo nunca invada a célula vizinha.
   * Não mexe no cursor do doc (doc.text o moveria): quem chama posiciona.
   */
  _celula(doc, texto, x, y, largura, altura, estilo = {}) {
    const { negrito = false, cor = PRETO, tamanho = 7, alinhar = 'center', quebrar = false } = estilo;

    doc.lineWidth(0.5).rect(x, y, largura, altura).stroke(PRETO);
    if (!texto) return;

    const opcoes = { width: largura - 6, align: alinhar, lineBreak: quebrar };
    doc.font(negrito ? 'Helvetica-Bold' : 'Helvetica').fontSize(tamanho).fillColor(cor);
    const alturaTexto = Math.min(doc.heightOfString(quebrar ? texto : 'X', opcoes), altura);

    const cursorY = doc.y;
    doc.save();
    doc.rect(x, y, largura, altura).clip();
    doc.text(texto, x + 3, y + (altura - alturaTexto) / 2, opcoes);
    doc.restore();
    doc.y = cursorY;
  }
}

module.exports = TimesheetStrategy;
