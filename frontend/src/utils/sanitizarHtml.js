import DOMPurify from 'dompurify';

// Exatamente o que o RichTextEditor produz e o parser do backend
// (backend/utils/richText.js) entende. Qualquer outra tag ou atributo —
// <img onerror>, <script>, <a href="javascript:"> — é descartado.
const CONFIG = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'span', 'div', 'p', 'br'],
  ALLOWED_ATTR: ['style'],
};

// O único estilo legítimo é o tamanho de fonte. Sem este filtro, `style`
// permitiria CSS arbitrário (ex: sobrepor a tela inteira com position:fixed).
const FONT_SIZE = /^font-size:\s*\d+(\.\d+)?px;?$/i;

DOMPurify.addHook('uponSanitizeAttribute', (_node, dados) => {
  if (dados.attrName === 'style' && !FONT_SIZE.test(dados.attrValue.trim())) {
    dados.keepAttr = false;
  }
});

/**
 * Limpa o HTML do editor de texto rico. Deve ser aplicado a TODO HTML que
 * vier de fora (banco, rascunho) antes de ir para `innerHTML`: um relatório
 * pode ter sido gravado direto pela API, sem passar pelo editor.
 * @param {string | null | undefined} html
 * @returns {string}
 */
export function sanitizarHtml(html) {
  return html ? DOMPurify.sanitize(html, CONFIG) : '';
}
