import { useState } from 'react';
import { ErroApi } from '../services/apiClient';

/**
 * 4xx explica o que o usuário pode fazer (limite atingido, sessão expirada...)
 * e 503 é uma indisponibilidade temporária que o backend descreve. Nos dois
 * casos a mensagem do servidor ajuda mais que a genérica. Um 500 ou falha de
 * rede fica com a genérica: não há nada útil a mostrar.
 *
 * @param {unknown} err
 * @param {string} mensagemGenerica
 * @returns {string}
 */
export function mensagemParaUsuario(err, mensagemGenerica) {
  if (!(err instanceof ErroApi)) return mensagemGenerica;
  const mensagemUtil = (err.status >= 400 && err.status < 500) || err.status === 503;
  return mensagemUtil ? err.message : mensagemGenerica;
}

/**
 * Executa qualquer estratégia de geração (PDF, e-mail, Timesheet) em qualquer
 * escopo (período ou dia), cuidando do "gerando..." e da mensagem de erro.
 *
 * Uma geração por vez: enquanto uma roda, `ocupado` é true — evita pedidos
 * duplicados ao servidor (que no plano gratuito do Render é lento para acordar).
 *
 * @param {Record<string, import('../services/geradores').Gerador>} geradores
 */
export function useGeracao(geradores) {
  const [emAndamento, setEmAndamento] = useState(null); // { tipo, escopo }
  const [erro, setErro] = useState(null);               // { escopo, mensagem }

  /**
   * @param {string} tipo - chave em `geradores`
   * @param {import('../utils/escopoRelatorio').Escopo} escopo
   * @param {object} payload
   * @returns {Promise<unknown | null>} resultado do gerador, ou null se falhou
   */
  const executar = async (tipo, escopo, payload) => {
    const gerador = geradores[tipo];

    const erroValidacao = gerador.validar?.(payload.dias);
    if (erroValidacao) {
      setErro({ escopo, mensagem: erroValidacao });
      return null;
    }

    setEmAndamento({ tipo, escopo });
    setErro(null);
    try {
      return await gerador.executar(payload);
    } catch (err) {
      console.error(`Erro ao gerar ${tipo}:`, err);
      setErro({ escopo, mensagem: mensagemParaUsuario(err, gerador.mensagemErro) });
      return null;
    } finally {
      setEmAndamento(null);
    }
  };

  return {
    executar,
    ocupado: emAndamento !== null,
    estaGerando: (tipo, escopo) => emAndamento?.tipo === tipo && emAndamento?.escopo === escopo,
    // Cada escopo mostra só o próprio erro: o erro do dia 12 aparece no bloco do dia 12
    erroDoEscopo: (escopo) => (erro?.escopo === escopo ? erro.mensagem : null),
  };
}
