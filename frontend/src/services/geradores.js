import { gerarRdoPdf, gerarEmailRdo, gerarTimesheetPdf, baixarBlob } from './rdoService';
import { validarAtividades, validarAtividadesTimesheet } from '../utils/diasUtils';

/**
 * Estratégias de geração de documentos. Todas seguem o mesmo contrato, então
 * quem as executa (useGeracao) não precisa saber qual está rodando.
 *
 * @typedef {object} Gerador
 * @property {(dias: object[]) => string | null} [validar] - mensagem de erro, ou null se ok
 * @property {(payload: object) => Promise<unknown>} executar
 * @property {string} mensagemErro - exibida se `executar` falhar
 */

/** Ex: RDO_ACME_12-03-2026.pdf ou RDO_ACME_10-03-2026_a_14-03-2026.pdf */
function nomeDoArquivo(prefixo, { cliente, dataInicio, dataFim }) {
  const nomeCliente = (cliente || 'sem-cliente').trim().replace(/\s+/g, '_');
  const periodo = dataInicio === dataFim ? dataInicio : `${dataInicio}_a_${dataFim}`;
  return `${prefixo}_${nomeCliente}_${periodo.replaceAll('/', '-')}.pdf`;
}

/** @type {Record<'pdf' | 'email' | 'timesheet', Gerador>} */
export const GERADORES = {
  pdf: {
    validar: validarAtividades,
    mensagemErro: 'Erro ao gerar o PDF. Verifique o servidor.',
    executar: async (payload) => {
      const blob = await gerarRdoPdf({ ...payload, tipoLayout: 'residencial' });
      baixarBlob(blob, nomeDoArquivo('RDO', payload));
    },
  },

  email: {
    mensagemErro: 'Erro ao gerar o e-mail. Verifique o servidor.',
    executar: (payload) => gerarEmailRdo({ ...payload, tipoLayout: 'residencial' }),
  },

  timesheet: {
    validar: validarAtividadesTimesheet,
    mensagemErro: 'Erro ao gerar o Timesheet. Verifique o servidor.',
    executar: async (payload) => {
      const blob = await gerarTimesheetPdf(payload);
      baixarBlob(blob, nomeDoArquivo('Timesheet', payload));
    },
  },
};
