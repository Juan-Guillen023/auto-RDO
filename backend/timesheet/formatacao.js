// Colunas de horas do Timesheet, na ordem da tabela. Os valores precisam
// bater com TIPOS_HORA do frontend (frontend/src/constants/atividade.js).
const TIPOS_HORA = ['travelling', 'standby', 'working', 'overtime', 'holiday'];
const TIPO_HORA_PADRAO = 'working';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * @param {string} dataBR - DD/MM/AAAA (ou DD/MM/AA)
 * @returns {{ dia: string, mes: string, ano: string } | null}
 */
function partesDaData(dataBR) {
  const match = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(dataBR || '');
  const mes = match && MESES[Number(match[2]) - 1];
  return mes ? { dia: match[1], mes, ano: match[3].slice(-2) } : null;
}

/** "27/07/2026" → "27/jul/26" (formato da coluna Date do modelo). */
function formatarData(dataBR) {
  const partes = partesDaData(dataBR);
  return partes ? `${partes.dia}/${partes.mes}/${partes.ano}` : dataBR || '';
}

/** "27/07/2026" → "jul/26" (campo Month / Year). */
function formatarMesAno(dataBR) {
  const partes = partesDaData(dataBR);
  return partes ? `${partes.mes}/${partes.ano}` : '';
}

/** Hora zerada vira "-", como nas células vazias do modelo. */
function formatarHoras(horas) {
  return horas ? String(horas) : '-';
}

/** "Projeto: X Task: Y"; a parte da Task some se ela estiver vazia. */
function formatarProjeto(projeto, task) {
  const partes = [`Projeto: ${projeto || ''}`];
  if (task) partes.push(`Task: ${task}`);
  return partes.join(' ');
}

/**
 * Uma linha do Timesheet por atividade com título. Atividades salvas antes
 * de existir o tipo de hora contam como horas trabalhadas.
 * @param {object[]} dias
 * @returns {{ data: string, descricao: string, horas: number, tipoHora: string }[]}
 */
function montarLinhas(dias) {
  return (dias || []).flatMap((dia) =>
    (dia.atividades || [])
      .filter((ativ) => ativ.titulo?.trim())
      .map((ativ) => ({
        data: formatarData(dia.data),
        descricao: ativ.titulo.trim(),
        horas: parseFloat(ativ.horas) || 0,
        tipoHora: TIPOS_HORA.includes(ativ.tipoHora) ? ativ.tipoHora : TIPO_HORA_PADRAO,
      }))
  );
}

/**
 * Soma das horas de cada coluna, na ordem de TIPOS_HORA.
 * @param {{ horas: number, tipoHora: string }[]} linhas
 * @returns {number[]}
 */
function somarPorTipo(linhas) {
  return TIPOS_HORA.map((tipo) => linhas
    .filter((linha) => linha.tipoHora === tipo)
    .reduce((soma, linha) => soma + linha.horas, 0));
}

module.exports = {
  TIPOS_HORA, formatarData, formatarMesAno, formatarHoras, formatarProjeto, montarLinhas, somarPorTipo,
};
