/**
 * Compressão de imagens no navegador, antes de entrarem no estado do formulário.
 *
 * No PDF as fotos saem com ~130pt de altura, então uma foto de celular de
 * 4000px (3–5MB) é desperdício: pesa no JSON enviado ao servidor, no rascunho
 * do localStorage (limite ~5MB) e no próprio PDF. 1600px no maior lado ainda
 * sobra para impressão e costuma reduzir o arquivo em mais de 90%.
 */

const LADO_MAXIMO_PX = 1600;
const QUALIDADE_JPEG = 0.8;

/**
 * Redimensiona e converte uma imagem para JPEG, devolvendo um data URL Base64.
 * Converter sempre para JPEG também garante compatibilidade com o PDFKit do
 * backend, que só entende JPEG e PNG (WebP, por exemplo, sumiria do PDF).
 *
 * @param {File} arquivo
 * @param {{ ladoMaximo?: number, qualidade?: number }} [opcoes]
 * @returns {Promise<string>} data URL "data:image/jpeg;base64,..."
 */
export async function comprimirImagem(
  arquivo,
  { ladoMaximo = LADO_MAXIMO_PX, qualidade = QUALIDADE_JPEG } = {}
) {
  // createImageBitmap decodifica fora da thread principal e já respeita a
  // orientação EXIF (foto de celular tirada "em pé" não sai deitada)
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });

  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext('2d');
  // JPEG não tem transparência: sem fundo branco, áreas transparentes de PNG ficariam pretas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', qualidade);
}

/**
 * Converte um data URL ("data:image/jpeg;base64,...") em Blob binário.
 * @param {string} dataUrl
 * @returns {Promise<Blob>}
 */
export async function dataUrlParaBlob(dataUrl) {
  const resposta = await fetch(dataUrl);
  return resposta.blob();
}

/**
 * Converte um Blob em data URL, o formato usado pelo formulário e pelo PDF.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobParaDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * SHA-256 do conteúdo em hexadecimal. Mesma foto → mesmo hash, o que permite
 * usar o hash como nome do arquivo e nunca enviar a mesma foto duas vezes.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export async function hashDoBlob(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
