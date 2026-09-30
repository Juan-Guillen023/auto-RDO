import { postJson } from './apiClient';

/**
 * Envia os dados do formulário para a API e retorna o Blob do PDF gerado.
 * @param {object} payload
 * @returns {Promise<Blob>}
 * @throws {import('./apiClient').ErroApi} se a resposta HTTP não for ok
 */
export async function gerarRdoPdf(payload) {
  return (await postJson('/gerar-rdo', payload)).blob();
}

/**
 * Envia os dados do formulário para a API e retorna o email formatado (assunto e corpo, PT/EN).
 * @param {object} payload
 * @returns {Promise<{ subject: {pt: string, en: string}, body: {pt: string, en: string} }>}
 * @throws {import('./apiClient').ErroApi} se a resposta HTTP não for ok
 */
export async function gerarEmailRdo(payload) {
  return (await postJson('/gerar-email', payload)).json();
}

/**
 * Envia os dados do formulário para a API e retorna o Blob do PDF do Timesheet gerado.
 * @param {object} payload
 * @returns {Promise<Blob>}
 * @throws {import('./apiClient').ErroApi} se a resposta HTTP não for ok
 */
export async function gerarTimesheetPdf(payload) {
  return (await postJson('/gerar-timesheet', payload)).blob();
}

/**
 * Dispara o download de um Blob no navegador com o nome de arquivo fornecido.
 * @param {Blob} blob
 * @param {string} nomeArquivo
 */
export function baixarBlob(blob, nomeArquivo) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nomeArquivo);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
