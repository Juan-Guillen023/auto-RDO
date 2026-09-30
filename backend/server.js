require('dotenv').config();

const tls = require('tls');

// Confia também nos certificados do sistema operacional. Numa rede
// corporativa com inspeção TLS, a CA do proxy só existe lá, e sem isso toda
// chamada HTTPS (Supabase, Gemini) falha com UNABLE_TO_GET_ISSUER_CERT_LOCALLY.
// Fica aqui, e não numa flag do `node`, para valer em `npm start` e `npm run dev`.
if (typeof tls.setDefaultCACertificates === 'function') {
  tls.setDefaultCACertificates([
    ...new Set([...tls.getCACertificates('default'), ...tls.getCACertificates('system')]),
  ]);
}

const { criarApp } = require('./app');
const { criarVerificadorSupabase } = require('./auth/verificarTokenSupabase');

/** Falha na subida, e não na primeira requisição, se faltar configuração. */
function variavelObrigatoria(nome) {
  const valor = process.env[nome];
  if (!valor) {
    console.error(`Variável de ambiente ${nome} não configurada. Veja backend/.env.example.`);
    process.exit(1);
  }
  return valor;
}

const origensPermitidas = variavelObrigatoria('CORS_ORIGINS')
  .split(',')
  .map((origem) => origem.trim())
  .filter(Boolean);

const app = criarApp({
  verificarToken: criarVerificadorSupabase(
    variavelObrigatoria('SUPABASE_URL'),
    variavelObrigatoria('SUPABASE_PUBLISHABLE_KEY')
  ),
  origensPermitidas,
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
