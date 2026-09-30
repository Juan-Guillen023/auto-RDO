/**
 * Escopo de geração: o relatório inteiro ou um único dia.
 * Representado como string — 'periodo' ou a data do dia (DD/MM/AAAA).
 * @typedef {string} Escopo
 */

export const ESCOPO_PERIODO = 'periodo';

/**
 * Monta os dados enviados ao backend para o escopo pedido. Para um dia, o
 * "período" do documento passa a ser aquele dia — o backend não precisa saber
 * que existe geração diária: ele só desenha os dias que recebe.
 *
 * @param {object} campos
 * @param {object[]} diasDados
 * @param {Escopo} escopo
 * @returns {object} payload no formato esperado pelas rotas /api/gerar-*
 */
export function recortarPayload(campos, diasDados, escopo) {
  if (escopo === ESCOPO_PERIODO) {
    return { ...campos, dias: diasDados };
  }

  return {
    ...campos,
    dataInicio: escopo,
    dataFim: escopo,
    dias: diasDados.filter((dia) => dia.data === escopo),
  };
}
