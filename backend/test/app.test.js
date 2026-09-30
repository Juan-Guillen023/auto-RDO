const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { criarApp } = require('../app');

const TOKEN_VALIDO = 'token-valido';
const ORIGEM_FRONTEND = 'https://frontend.exemplo.com';

// Verificador falso: nada de rede, e dá para simular cada cenário
async function verificarTokenFalso(token) {
  if (token === 'supabase-fora-do-ar') throw new Error('timeout');
  return token === TOKEN_VALIDO ? { id: 'usuario-1', email: 'tecnico@exemplo.com' } : null;
}

const payloadMinimo = {
  cliente: 'São Paulo — Planta 2',
  projeto: 'Projeto X',
  tecnico: 'Fulano',
  dataInicio: '01/09/2026',
  dataFim: '01/09/2026',
  // Mesmo formato que o frontend envia (useRdoForm)
  dias: [{
    data: '01/09/2026',
    atividades: [{ titulo: 'Deslocamento', texto: '<b>Saída</b> às 7h', status: 'concluido', horas: 4, imagens: [] }],
  }],
};

let servidor;
let baseUrl;

before(async () => {
  const app = criarApp({
    verificarToken: verificarTokenFalso,
    origensPermitidas: [ORIGEM_FRONTEND],
    gerarEmail: async () => ({ subject: { pt: 'a', en: 'b' }, body: { pt: 'c', en: 'd' } }),
    limiteEmailsPorJanela: 2,
  });
  await new Promise((resolve) => { servidor = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor.close());

function post(rota, corpo, token = TOKEN_VALIDO) {
  return fetch(`${baseUrl}${rota}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });
}

describe('autenticação', () => {
  test('sem token → 401', async () => {
    const res = await post('/api/gerar-email', payloadMinimo, null);
    assert.equal(res.status, 401);
  });

  test('token inválido → 401', async () => {
    const res = await post('/api/gerar-email', payloadMinimo, 'forjado');
    assert.equal(res.status, 401);
  });

  test('falha ao verificar → 503, não 401', async () => {
    const res = await post('/api/gerar-email', payloadMinimo, 'supabase-fora-do-ar');
    assert.equal(res.status, 503);
  });

  test('rota pública continua acessível', async () => {
    const res = await fetch(baseUrl);
    assert.equal(res.status, 200);
  });
});

describe('CORS', () => {
  test('libera a origem configurada', async () => {
    const res = await fetch(baseUrl, { headers: { Origin: ORIGEM_FRONTEND } });
    assert.equal(res.headers.get('access-control-allow-origin'), ORIGEM_FRONTEND);
  });

  test('não libera outras origens', async () => {
    const res = await fetch(baseUrl, { headers: { Origin: 'https://site-qualquer.com' } });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });
});

describe('geração de PDF', () => {
  test('RDO válido → PDF, com nome acentuado sem quebrar o cabeçalho', async () => {
    const res = await post('/api/gerar-rdo', payloadMinimo);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition'), /filename="RDO_Sao_Paulo__Planta_2\.pdf"/);

    const inicio = Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString();
    assert.equal(inicio, '%PDF-');
  });

  test('Timesheet válido → PDF', async () => {
    const res = await post('/api/gerar-timesheet', payloadMinimo);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
  });

  test('sem "dias" → 400 com mensagem', async () => {
    const res = await post('/api/gerar-rdo', { cliente: 'X' });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /dias/);
  });

  test('campo com tipo errado → 400', async () => {
    const res = await post('/api/gerar-rdo', { ...payloadMinimo, cliente: 123 });
    assert.equal(res.status, 400);
  });

  test('layout inexistente → 400', async () => {
    const res = await post('/api/gerar-rdo', { ...payloadMinimo, tipoLayout: 'industrial' });
    assert.equal(res.status, 400);
  });

  test('JSON malformado → 400 em JSON', async () => {
    const res = await post('/api/gerar-rdo', '{ quebrado');
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error);
  });
});

describe('limite de e-mails', () => {
  test('bloqueia acima do limite por usuário', async () => {
    assert.equal((await post('/api/gerar-email', payloadMinimo)).status, 200);
    assert.equal((await post('/api/gerar-email', payloadMinimo)).status, 200);
    assert.equal((await post('/api/gerar-email', payloadMinimo)).status, 429);
  });
});
