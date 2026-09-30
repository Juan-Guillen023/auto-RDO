const PDFDocument = require('pdfkit');
const RdoContext = require('../context/RdoContext');

/**
 * Gera o PDF inteiro em memória antes de responder. Se a estratégia falhar
 * no meio, nada foi enviado ainda e a rota consegue devolver um erro de
 * verdade, em vez de um PDF cortado com status 200.
 *
 * @param {object} estrategia - implementa `execute(doc, dados)`
 * @param {object} opcoesPdf  - opções do PDFKit (tamanho, margens...)
 * @param {object} dados
 * @returns {Promise<Buffer>}
 */
function gerarPdf(estrategia, opcoesPdf, dados) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(opcoesPdf);
    const partes = [];
    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const contexto = new RdoContext();
    contexto.setStrategy(estrategia);
    contexto.gerarDocumento(doc, dados).then(() => doc.end(), reject);
  });
}

/**
 * Cabeçalho de download que aceita qualquer nome de cliente: `filename`
 * só com ASCII (para clientes antigos) e `filename*` com o nome original
 * em UTF-8. Acentos ou emojis nunca derrubam a resposta.
 * @param {string} prefixo
 * @param {string} [cliente]
 */
function cabecalhoDownload(prefixo, cliente) {
  const nome = `${prefixo}_${(cliente || 'sem-cliente').trim().replace(/\s+/g, '_')}.pdf`;
  const nomeAscii = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]/g, '');
  return `attachment; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}

module.exports = { gerarPdf, cabecalhoDownload };
