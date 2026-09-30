require('dotenv').config();

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
