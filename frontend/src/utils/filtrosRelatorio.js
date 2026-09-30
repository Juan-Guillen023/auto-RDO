/**
 * Filtros da lista de relatórios. Cada filtro é um predicado
 * `(relatorio) => boolean`, e `combinar` junta vários com E lógico.
 * Um filtro novo (status, período...) é só mais uma função: a tela
 * não muda a forma de filtrar.
 *
 * @typedef {import('../repositories/RelatorioRepository').ResumoRelatorio} ResumoRelatorio
 * @typedef {(relatorio: ResumoRelatorio) => boolean} Predicado
 */

/** @param {string} userId @returns {Predicado} */
export const doUsuario = (userId) => (relatorio) => relatorio.userId === userId;

/** @param {string} userId @returns {Predicado} */
export const deOutrosUsuarios = (userId) => (relatorio) => relatorio.userId !== userId;

/**
 * Relatórios de um autor específico. E-mail vazio não filtra nada
 * (é a opção "Todos os técnicos").
 * @param {string} email
 * @returns {Predicado}
 */
export const doAutor = (email) =>
  email ? (relatorio) => relatorio.autorEmail === email : () => true;

/** @param {...Predicado} predicados @returns {Predicado} */
export const combinar = (...predicados) => (relatorio) => predicados.every((p) => p(relatorio));

/**
 * E-mails distintos, em ordem alfabética, para sugerir no campo de busca.
 * @param {ResumoRelatorio[]} relatorios
 */
export const emailsDosAutores = (relatorios) =>
  [...new Set(relatorios.map((r) => r.autorEmail).filter(Boolean))].sort();
