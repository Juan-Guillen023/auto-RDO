// Teste manual do gerador de e-mail com IA (Gemini).
// Rode direto com: node test-gerar-email.js
// (não usa npm, então funciona mesmo com scripts do PowerShell desabilitados)

require('dotenv').config();
const { gerarEmailRdo } = require('./services/EmailService');

const dadosTeste = {
  cliente: 'Cliente Teste',
  projeto: 'Unidade Teste',
  po: '12345',
  servico: 'Manutenção Elétrica',
  tecnico: 'João Silva',
  dataInicio: '2026-08-10',
  dataFim: '2026-08-11',
  escopo: 'Inspeção e manutenção preventiva',
  dias: [
    {
      data: '2026-08-11',
      atividades: [
        {
          titulo: 'Inspeção painel',
          texto: 'Painel elétrico inspecionado sem anomalias.',
          status: 'concluido',
        },
      ],
    },
  ],
};

gerarEmailRdo(dadosTeste)
  .then((r) => console.log('SUCESSO:\n', JSON.stringify(r, null, 2)))
  .catch((e) => console.log('ERRO:', e.message));
