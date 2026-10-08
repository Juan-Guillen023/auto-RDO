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

/**
 * Equivalente a `form.reportValidity()`, mas restrito ao escopo: no PDF de um
 * dia, os campos obrigatórios dos OUTROS dias não podem bloquear a geração.
 *
 * Cada bloco de dia marca seu container com `data-escopo="<data>"`. Campos
 * fora de qualquer bloco (cliente, projeto...) são comuns a todos os escopos.
 *
 * @param {HTMLFormElement} form
 * @param {Escopo} escopo
 * @returns {boolean} true se todos os campos do escopo forem válidos
 */
export function validarCamposDoEscopo(form, escopo) {
  const camposDoEscopo = Array.from(form.elements).filter((campo) => {
    const dono = campo.closest('[data-escopo]')?.dataset.escopo;
    return dono === undefined || escopo === ESCOPO_PERIODO || dono === escopo;
  });

  // every() para no primeiro inválido: o navegador mostra um balão por vez
  return camposDoEscopo.every((campo) => campo.reportValidity());
}
