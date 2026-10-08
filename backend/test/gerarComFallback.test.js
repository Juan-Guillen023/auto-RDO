const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { gerarComFallback, IaIndisponivelError } = require('../services/ia/gerarComFallback');

/** Erro no formato do SDK: só o que o fallback olha, o `status`. */
const erroHttp = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('gerarComFallback', () => {
  test('usa o primeiro modelo quando ele responde', async () => {
    const tentados = [];
    const resultado = await gerarComFallback(['a', 'b'], async (m) => { tentados.push(m); return m; });
    assert.equal(resultado, 'a');
    assert.deepEqual(tentados, ['a']);
  });

  test('passa para o reserva quando o preferido está sobrecarregado (503)', async () => {
    const resultado = await gerarComFallback(['a', 'b'], async (m) => {
      if (m === 'a') throw erroHttp(503);
      return m;
    });
    assert.equal(resultado, 'b');
  });

  test('cota estourada (429) e timeout também acionam o reserva', async () => {
    const timeout = Object.assign(new Error('Request timed out'), { name: 'TimeoutError' });
    const falhas = { a: erroHttp(429), b: timeout };
    const resultado = await gerarComFallback(['a', 'b', 'c'], async (m) => {
      if (falhas[m]) throw falhas[m];
      return m;
    });
    assert.equal(resultado, 'c');
  });

  test('erro nosso (ex: 400, 404) sobe direto, sem tentar outro modelo', async () => {
    const tentados = [];
    await assert.rejects(
      gerarComFallback(['a', 'b'], async (m) => { tentados.push(m); throw erroHttp(404); }),
      { status: 404 }
    );
    assert.deepEqual(tentados, ['a']);
  });

  test('todos indisponíveis: IaIndisponivelError com a causa de cada um', async () => {
    const avisos = [];
    const erro = await gerarComFallback(
      ['a', 'b'],
      async () => { throw erroHttp(503); },
      { aoFalhar: (m) => avisos.push(m) }
    ).catch((e) => e);

    assert.ok(erro instanceof IaIndisponivelError);
    assert.equal(erro.causas.length, 2);
    assert.deepEqual(avisos, ['a', 'b']);
  });
});
