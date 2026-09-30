const ResidentialRdoStrategy = require('../rdo/renders/ResidentialRdoStrategy');
const TimesheetStrategy = require('../timesheet/renders/TimesheetStrategy');

/**
 * Registro único dos documentos que o servidor sabe gerar. Cada documento
 * tem suas opções de página e um mapa de layouts (as estratégias).
 *
 * Um documento ou layout novo é uma entrada a mais aqui: as rotas não mudam.
 * As estratégias não guardam estado entre execuções, então uma instância
 * serve para todas as requisições.
 */
const DOCUMENTOS = {
  rdo: {
    prefixoArquivo: 'RDO',
    opcoesPdf: { size: 'A4', margins: { top: 100, bottom: 90, left: 50, right: 50 }, bufferPages: true },
    layoutPadrao: 'residencial',
    layouts: {
      residencial: new ResidentialRdoStrategy(),
    },
  },
  timesheet: {
    prefixoArquivo: 'Timesheet',
    opcoesPdf: { size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 }, bufferPages: true },
    layoutPadrao: 'padrao',
    layouts: {
      padrao: new TimesheetStrategy(),
    },
  },
};

/**
 * @param {keyof typeof DOCUMENTOS} tipoDocumento
 * @param {string} [tipoLayout] - ausente = layout padrão do documento
 * @returns {{ documento: object, estrategia: object } | null} null se o layout não existe
 */
function resolverDocumento(tipoDocumento, tipoLayout) {
  const documento = DOCUMENTOS[tipoDocumento];
  const estrategia = documento?.layouts[tipoLayout ?? documento.layoutPadrao];
  return estrategia ? { documento, estrategia } : null;
}

module.exports = { resolverDocumento };
