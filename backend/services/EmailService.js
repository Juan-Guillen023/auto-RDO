const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { htmlParaTextoPlano, htmlEstaVazio } = require('../utils/richText');

const FORMAT_RULES = fs.readFileSync(
  path.join(__dirname, '../prompts/EmailDiarioPrompt.txt'),
  'utf-8'
);

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

  const interaction = await client.interactions.create({
    model: 'gemini-flash-latest',
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
  });

  const text = interaction.output_text;
  if (!text) {
    throw new Error('A IA não retornou o email gerado.');
  }

  return JSON.parse(text);
}

module.exports = { gerarEmailRdo };
