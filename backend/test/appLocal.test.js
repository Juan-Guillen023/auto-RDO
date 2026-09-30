const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { criarAppLocal } = require('../local/criarAppLocal');

const payloadMinimo = {
  cliente: 'Cliente',
  projeto: 'Projeto X',
  tecnico: 'Fulano',
  dataInicio: '01/09/2026',
  dataFim: '01/09/2026',
  dias: [{
    data: '01/09/2026',
    atividades: [{ titulo: 'Deslocamento', texto: 'Saída às 7h', status: 'concluido', horas: 4, imagens: [] }],
  }],
};

let servidor;
let baseUrl;
let pastaFrontend;

before(async () => {
  pastaFrontend = fs.mkdtempSync(path.join(os.tmpdir(), 'rdo-dist-'));
  fs.writeFileSync(path.join(pastaFrontend, 'index.html'), '<!doctype html><title>RDO</title>');

  const app = criarAppLocal({ pastaFrontend });
  await new Promise((resolve) => { servidor = app.listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor.close();
  fs.rmSync(pastaFrontend, { recursive: true, force: true });
});

describe('servidor local (modo offline)', () => {
  test('entrega o frontend compilado na raiz', async () => {
    const resposta = await fetch(`${baseUrl}/`);
    assert.equal(resposta.status, 200);
    assert.match(await resposta.text(), /<title>RDO<\/title>/);
  });

  test('gera o PDF sem login do Supabase', async () => {
    const resposta = await fetch(`${baseUrl}/api/gerar-rdo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer local' },
      body: JSON.stringify({ ...payloadMinimo, tipoLayout: 'residencial' }),
    });
    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get('content-type'), 'application/pdf');
  });

  test('continua exigindo o cabeçalho Authorization (o contrato da API não muda)', async () => {
    const resposta = await fetch(`${baseUrl}/api/gerar-rdo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadMinimo),
    });
    assert.equal(resposta.status, 401);
  });

  test('recusa pedidos com Host externo (DNS rebinding)', async () => {
    const http = require('http');
    const status = await new Promise((resolve, reject) => {
      const pedido = http.get(`${baseUrl}/`, { headers: { Host: 'site-malicioso.com' } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      pedido.on('error', reject);
    });
    assert.equal(status, 403);
  });

  test('não libera CORS para nenhuma origem externa', async () => {
    const resposta = await fetch(`${baseUrl}/api/gerar-rdo`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://site-qualquer.com', 'Access-Control-Request-Method': 'POST' },
    });
    assert.equal(resposta.headers.get('access-control-allow-origin'), null);
  });
});
