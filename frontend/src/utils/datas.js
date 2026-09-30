/**
 * Utilitários de data no formato brasileiro DD/MM/AAAA, usado em todo o formulário.
 */

/**
 * Converte "DD/MM/AAAA" em Date (meia-noite local). Retorna null se a string
 * estiver incompleta ou representar uma data inexistente (ex: 31/02/2026).
 * @param {string} texto
 * @returns {Date | null}
 */
export function parseDataBR(texto) {
  if (!texto || texto.length !== 10) return null;

  const [dia, mes, ano] = texto.split('/').map(Number);
  const data = new Date(ano, mes - 1, dia);

  // new Date(2026, 1, 31) "transborda" para março — detecta isso
  const valida =
    data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  return valida ? data : null;
}

/**
 * Converte Date em "DD/MM/AAAA".
 * @param {Date} data
 * @returns {string}
 */
export function formatarDataBR(data) {
  const dd = String(data.getDate()).padStart(2, '0');
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${data.getFullYear()}`;
}

/**
 * Compara apenas dia/mês/ano, ignorando horário.
 * @param {Date | null} a
 * @param {Date | null} b
 * @returns {boolean}
 */
export function mesmoDia(a, b) {
  return (
    !!a && !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Monta a grade de 6 semanas (42 dias) exibida no calendário para um mês,
 * começando no domingo — inclui os dias "vizinhos" do mês anterior/seguinte.
 * @param {number} ano
 * @param {number} mes - 0 a 11
 * @returns {Date[]}
 */
export function gradeDoMes(ano, mes) {
  const primeiroDoMes = new Date(ano, mes, 1);
  const inicioGrade = new Date(ano, mes, 1 - primeiroDoMes.getDay());

  return Array.from({ length: 42 }, (_, i) =>
    new Date(inicioGrade.getFullYear(), inicioGrade.getMonth(), inicioGrade.getDate() + i)
  );
}
