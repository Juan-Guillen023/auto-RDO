const path = require('path');
const { spawn } = require('child_process');
const { criarAppLocal } = require('./local/criarAppLocal');

// Porta FIXA: os relatórios ficam no IndexedDB do navegador, que é separado
// por origem (host + porta). Mudar a porta "esconde" os relatórios já salvos.
const PORTA = Number(process.env.RDO_PORTA) || 3717;
const HOST = '127.0.0.1'; // nunca 0.0.0.0: sem login, não pode ficar exposto na rede
const URL_APP = `http://${HOST}:${PORTA}`;

const PASTA_FRONTEND = process.env.RDO_PASTA_FRONTEND
  || path.join(__dirname, '..', 'frontend', 'dist');

const abrirNavegador = process.argv.includes('--abrir');

function abrirNoNavegador(url) {
  if (process.platform !== 'win32') return console.log(`Abra ${url} no navegador.`);
  spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
}

const servidor = criarAppLocal({ pastaFrontend: PASTA_FRONTEND }).listen(PORTA, HOST, () => {
  console.log(`RDO offline rodando em ${URL_APP}`);
  console.log('Mantenha esta janela aberta enquanto usa o app. Feche-a para encerrar.');
  if (abrirNavegador) abrirNoNavegador(URL_APP);
});

servidor.on('error', (err) => {
  // Clicou duas vezes no atalho: o app já está no ar, basta abrir a página
  if (err.code === 'EADDRINUSE') {
    console.log(`O RDO já está rodando em ${URL_APP}.`);
    if (abrirNavegador) abrirNoNavegador(URL_APP);
    return;
  }
  console.error('Não foi possível iniciar o servidor:', err);
  process.exitCode = 1;
});
