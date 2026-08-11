/**
 * Utilitários para interpretar o HTML simples produzido pelo editor de texto
 * rico do frontend (negrito, itálico, sublinhado, tamanho de fonte).
 *
 * O editor só produz uma tag controlada: <b>/<strong>, <i>/<em>, <u>,
 * <span style="font-size:Npx">, além de <div>/<p>/<br> para quebras de linha.
 * Por isso um parser leve e dedicado é suficiente — não precisa de uma lib
 * de parsing de HTML completa.
 */

const TAG_REGEX = /<(\/?)(\w+)([^>]*)>/g;

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseStyleFontSize(attrs) {
  const styleMatch = /style\s*=\s*"([^"]*)"/i.exec(attrs || '');
  if (!styleMatch) return null;
  const sizeMatch = /font-size\s*:\s*(\d+(?:\.\d+)?)px/i.exec(styleMatch[1]);
  return sizeMatch ? parseFloat(sizeMatch[1]) : null;
}

/**
 * Converte o HTML do editor em uma lista de parágrafos, cada um sendo uma
 * lista de "runs" (trechos de texto com a mesma formatação):
 * { texto, negrito, italico, sublinhado, tamanho }.
 *
 * @param {string} html
 * @returns {Array<Array<{texto: string, negrito: boolean, italico: boolean, sublinhado: boolean, tamanho: number|null}>>}
 */
function parseHtmlParaPdf(html) {
  if (!html) return [];

  const paragrafos = [[]];
  const pilha = [];

  const novoParagrafo = () => {
    if (paragrafos[paragrafos.length - 1].length > 0) paragrafos.push([]);
  };

  const pushTexto = (textoBruto) => {
    const texto = decodeEntities(textoBruto);
    if (!texto) return;
    const negrito = pilha.some((t) => t.tag === 'b' || t.tag === 'strong');
    const italico = pilha.some((t) => t.tag === 'i' || t.tag === 'em');
    const sublinhado = pilha.some((t) => t.tag === 'u');
    const comTamanho = [...pilha].reverse().find((t) => t.tamanho);
    paragrafos[paragrafos.length - 1].push({
      texto,
      negrito,
      italico,
      sublinhado,
      tamanho: comTamanho ? comTamanho.tamanho : null,
    });
  };

  let ultimoIndex = 0;
  let match;
  TAG_REGEX.lastIndex = 0;

  while ((match = TAG_REGEX.exec(html))) {
    const textoAntes = html.slice(ultimoIndex, match.index);
    if (textoAntes) pushTexto(textoAntes);
    ultimoIndex = TAG_REGEX.lastIndex;

    const [, fechamento, tagRaw, attrs] = match;
    const tag = tagRaw.toLowerCase();

    if (!fechamento) {
      if (tag === 'br') {
        novoParagrafo();
      } else if (tag === 'div' || tag === 'p') {
        novoParagrafo();
        pilha.push({ tag });
      } else if (tag === 'span') {
        pilha.push({ tag, tamanho: parseStyleFontSize(attrs) });
      } else if (tag === 'b' || tag === 'strong' || tag === 'i' || tag === 'em' || tag === 'u') {
        pilha.push({ tag });
      }
      // outras tags são ignoradas propositalmente (o editor não as gera)
    } else {
      for (let i = pilha.length - 1; i >= 0; i--) {
        const abre = pilha[i].tag;
        if (
          abre === tag ||
          (tag === 'strong' && abre === 'b') ||
          (tag === 'b' && abre === 'strong') ||
          (tag === 'em' && abre === 'i') ||
          (tag === 'i' && abre === 'em')
        ) {
          pilha.splice(i, 1);
          break;
        }
      }
      if (tag === 'div' || tag === 'p') novoParagrafo();
    }
  }

  const restante = html.slice(ultimoIndex);
  if (restante) pushTexto(restante);

  return paragrafos.filter((p) => p.length > 0);
}

/**
 * Extrai o texto plano (sem tags) do HTML do editor, preservando quebras de
 * linha — usado como contexto pra IA, que não precisa da formatação.
 *
 * @param {string} html
 * @returns {string}
 */
function htmlParaTextoPlano(html) {
  if (!html) return '';
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(div|p)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * Verifica se o HTML do editor representa um campo "vazio" (sem texto real),
 * ignorando tags e quebras de linha soltas que o contentEditable às vezes
 * deixa para trás.
 *
 * @param {string} html
 * @returns {boolean}
 */
function htmlEstaVazio(html) {
  if (!html) return true;
  return html.replace(/<[^>]+>/g, '').trim() === '';
}

module.exports = { parseHtmlParaPdf, htmlParaTextoPlano, htmlEstaVazio };
