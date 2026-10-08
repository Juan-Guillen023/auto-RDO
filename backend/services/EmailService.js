const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { htmlParaTextoPlano, htmlEstaVazio } = require('../utils/richText');
const { gerarComFallback } = require('./ia/gerarComFallback');

const FORMAT_RULES = fs.readFileSync(
  path.join(__dirname, '../prompts/EmailDiarioPrompt.txt'),
  'utf-8'
);

// Do preferido ao reserva. O "-latest" acompanha a versão atual: modelos com
// versão fixa (ex: gemini-2.5-flash) são desligados pelo Google com o tempo.
const MODELOS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];

// Sem retry no SDK: ele respeita o "retry-after: 30" do Google e repete o
// MESMO modelo sobrecarregado, deixando o usuário ~1 min esperando. O modelo
// reserva já é a nova tentativa, e responde em segundos.
const OPCOES_REQUISICAO = { maxRetries: 0, timeout: 30_000 };

const STATUS_LABEL = {
  concluido: 'CONCLUÍDO',
  em_progresso: 'EM PROGRESSO',
  pendente: 'PENDENTE / NÃO INICIADO',
  bloqueio: 'BLOQUEIO / AÇÃO NECESSÁRIA',
};

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    subject: {
      type: 'object',
      properties: {
        pt: { type: 'string' },
        en: { type: 'string' },
      },
      required: ['pt', 'en'],
      additionalProperties: false,
    },
    body: {
      type: 'object',
      properties: {
        pt: { type: 'string' },
        en: { type: 'string' },
      },
      required: ['pt', 'en'],
      additionalProperties: false,
    },
  },
  required: ['subject', 'body'],
  additionalProperties: false,
};

/**
 * Monta um resumo textual do RDO (dados gerais + atividades por status)
 * para servir de contexto à LLM.
 */
function montarResumoRdo(dadosRDO) {
  const linhas = [];

  linhas.push(`Cliente: ${dadosRDO.cliente || ''}`);
  linhas.push(`Projeto / Unidade / Área: ${dadosRDO.projeto || ''}`);
  linhas.push(`PO: ${dadosRDO.po || ''}`);
  linhas.push(`Disciplina / Serviço: ${dadosRDO.servico || ''}`);
  linhas.push(`Técnico: ${dadosRDO.tecnico || ''}`);
  linhas.push(`Período: ${dadosRDO.dataInicio || ''} a ${dadosRDO.dataFim || ''}`);
  linhas.push(`Escopo contratado: ${dadosRDO.escopo || ''}`);
  linhas.push('');
  linhas.push('Atividades registradas (agrupe e resuma por status na resposta final):');

  for (const dia of dadosRDO.dias || []) {
    for (const atividade of dia.atividades || []) {
      const textoPlano = htmlParaTextoPlano(atividade.texto);
      if (!atividade.titulo && htmlEstaVazio(atividade.texto)) continue;
      const status = STATUS_LABEL[atividade.status] || STATUS_LABEL.concluido;
      linhas.push(`- [${dia.data}] (${status}) ${atividade.titulo}: ${textoPlano}`);
    }
  }

  return linhas.join('\n');
}

/**
 * Gera o email diário (assunto + corpo, PT/EN) a partir dos dados do RDO,
 * seguindo as regras de formatação definidas no prompt fornecido pelo usuário.
 */
async function gerarEmailRdo(dadosRDO) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const resumoRdo = montarResumoRdo(dadosRDO);

  const pedido = {
    system_instruction:
      'Você gera emails executivos diários de progresso de obra/serviço a partir de dados de um RDO. ' +
      'Siga ESTRITAMENTE as regras de formatação abaixo, sem se desviar delas.\n\n' +
      FORMAT_RULES,
    input: `Gere o email diário a partir dos dados de RDO abaixo:\n\n${resumoRdo}`,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: OUTPUT_SCHEMA,
    },
  };

  const interaction = await gerarComFallback(
    MODELOS,
    (model) => client.interactions.create({ ...pedido, model }, OPCOES_REQUISICAO),
    { aoFalhar: (modelo, err) => console.warn(`Gemini ${modelo} indisponível (${err.status ?? err.name}); tentando o próximo.`) }
  );

  const text = interaction.output_text;
  if (!text) {
    throw new Error('A IA não retornou o email gerado.');
  }

  return JSON.parse(text);
}

module.exports = { gerarEmailRdo };
