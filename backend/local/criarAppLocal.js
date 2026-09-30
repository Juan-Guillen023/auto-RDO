const express = require('express');
const { criarApp } = require('../app');

/** Único usuário do modo offline: quem está usando este computador. */
const USUARIO_LOCAL = Object.freeze({ id: 'local', email: 'local@offline' });

const HOSTS_LOCAIS = new Set(['127.0.0.1', 'localhost']);

/**
 * App do modo offline: o frontend compilado e a mesma API da produção, na
 * mesma origem. Não altera `criarApp`, só troca as estratégias injetadas:
 * - autenticação: sem login, todo pedido é do usuário local;
 * - CORS: nenhuma origem externa (frontend e API têm a mesma origem).
 *
 * @param {{ pastaFrontend: string }} opcoes - pasta do `vite build`
 */
function criarAppLocal({ pastaFrontend }) {
  const raiz = express();

  // Sem login, a única barreira é o pedido vir DESTA máquina. O servidor já
  // escuta só em 127.0.0.1; conferir o Host barra também o DNS rebinding
  // (um site externo cujo domínio passa a apontar para 127.0.0.1).
  raiz.use((req, res, next) => {
    if (HOSTS_LOCAIS.has(req.hostname)) return next();
    res.status(403).json({ error: 'Acesso permitido apenas a partir deste computador.' });
  });

  // Antes da API: em "/", entrega o index.html, e não o texto de status da API
  raiz.use(express.static(pastaFrontend));

  raiz.use(criarApp({
    verificarToken: async () => USUARIO_LOCAL,
    origensPermitidas: [],
  }));

  return raiz;
}

module.exports = { criarAppLocal, USUARIO_LOCAL };
