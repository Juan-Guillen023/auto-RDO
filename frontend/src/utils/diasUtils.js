/**
 * Verifica se o HTML do editor de texto rico representa um campo vazio,
 * ignorando tags e quebras de linha soltas (ex: "<div><br></div>").
 * @param {string} html
 * @returns {boolean}
 */
export function textoRicoEstaVazio(html) {
  if (!html) return true;
  return html.replace(/<[^>]+>/g, '').trim() === '';
}

/**
 * Valida se todas as atividades preenchidas têm título e descrição.
 * O editor de texto rico não é um <textarea>, então não dá pra contar
 * com o atributo HTML `required` do form pra isso.
 * @param {object[]} dias
 * @returns {string | null} mensagem de erro, ou null se estiver tudo ok
 */
export function validarAtividades(dias) {
  for (const dia of dias) {
    for (const ativ of dia.atividades) {
      if (!ativ.titulo?.trim() || textoRicoEstaVazio(ativ.texto)) {
        return `Preencha título e descrição de todas as atividades (dia ${dia.data}).`;
      }
    }
  }
  return null;
}

/**
 * Atualiza um dia pelo índice de forma imutável.
 * @param {object[]} dias
 * @param {number} indexDia
 * @param {(dia: object) => object} updater
 * @returns {object[]}
 */
export function atualizarDia(dias, indexDia, updater) {
  return dias.map((dia, i) => (i !== indexDia ? dia : updater(dia)));
}

/**
 * Atualiza uma atividade dentro de um dia de forma imutável.
 * @param {object[]} dias
 * @param {number} indexDia
 * @param {number} indexAtiv
 * @param {(ativ: object) => object} updater
 * @returns {object[]}
 */
export function atualizarAtividade(dias, indexDia, indexAtiv, updater) {
  return atualizarDia(dias, indexDia, (dia) => ({
    ...dia,
    atividades: dia.atividades.map((ativ, j) =>
      j !== indexAtiv ? ativ : updater(ativ)
    ),
  }));
}