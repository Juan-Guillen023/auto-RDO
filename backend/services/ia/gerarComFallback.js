/**
 * Erro de domínio: nenhum modelo de IA conseguiu responder agora. Quem chama
 * (a rota) traduz para 503, sem precisar conhecer os erros do SDK do Gemini.
 */
class IaIndisponivelError extends Error {
  /** @param {unknown[]} causas - o erro de cada modelo, na ordem tentada */
  constructor(causas) {
    super('Nenhum modelo de IA disponível no momento.');
    this.name = 'IaIndisponivelError';
    this.causas = causas;
  }
}

// 429: cota/limite; 5xx: sobrecarga ou instabilidade do lado do Google.
// Um 400/401/404 indica erro NOSSO (chave, schema, modelo extinto): trocar de
// modelo esconderia o bug, então esses erros sobem sem fallback.
const STATUS_TRANSITORIOS = new Set([429, 500, 502, 503, 504]);

/** @param {any} err */
function ehFalhaTransitoria(err) {
  const status = err?.status ?? err?.statusCode;
  if (STATUS_TRANSITORIOS.has(status)) return true;
  // Timeout/abort da requisição não tem status HTTP
  return err?.name === 'AbortError' || err?.name === 'TimeoutError' || /timed? ?out/i.test(err?.message ?? '');
}

/**
 * Executa a mesma tarefa em cada modelo, em ordem, até um responder. Cada
 * modelo é uma estratégia intercambiável; a ordem da lista é a preferência.
 *
 * @template T
 * @param {string[]} modelos - do preferido ao reserva
 * @param {(modelo: string) => Promise<T>} tentar
 * @param {{ aoFalhar?: (modelo: string, err: unknown) => void }} [opcoes]
 * @returns {Promise<T>}
 * @throws {IaIndisponivelError} se todos falharem de forma transitória
 */
async function gerarComFallback(modelos, tentar, { aoFalhar = () => {} } = {}) {
  const causas = [];
  for (const modelo of modelos) {
    try {
      return await tentar(modelo);
    } catch (err) {
      if (!ehFalhaTransitoria(err)) throw err;
      aoFalhar(modelo, err);
      causas.push(err);
    }
  }
  throw new IaIndisponivelError(causas);
}

module.exports = { gerarComFallback, IaIndisponivelError, ehFalhaTransitoria };
