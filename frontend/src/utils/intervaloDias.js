import { parseDataBR, formatarDataBR } from './datas';
import { novaAtividade } from '../constants/atividade';

const DIA_PADRAO = (dataStr) => ({
  data: dataStr,
  horaInicio: '08:00',
  horaFim: '17:00',
  atividades: [novaAtividade()],
});

/**
 * Gera a lista de dias entre duas datas (inclusive), reaproveitando os dias
 * já existentes (por data) para não perder o que já foi digitado quando o
 * intervalo é ajustado.
 *
 * Função pura: mesma entrada → mesma saída, sem tocar em estado do React.
 *
 * @param {string} dataInicio - DD/MM/AAAA
 * @param {string} dataFim    - DD/MM/AAAA
 * @param {object[]} diasExistentes - dias já preenchidos antes da mudança de intervalo
 * @returns {{ dias: object[] | null, erro: string | null }}
 */
export function gerarIntervalo(dataInicio, dataFim, diasExistentes = []) {
  const inicio = parseDataBR(dataInicio);
  const fim    = parseDataBR(dataFim);

  if (!inicio || !fim) {
    return { dias: null, erro: 'Data inválida. Use o formato DD/MM/AAAA com uma data existente.' };
  }

  if (inicio > fim) {
    return { dias: null, erro: 'A data de início não pode ser maior que a data final.' };
  }

  const diasPorData = new Map(diasExistentes.map((dia) => [dia.data, dia]));

  const dias = [];
  let dataAtual = new Date(inicio);

  while (dataAtual <= fim) {
    const dataStr = formatarDataBR(dataAtual);
    // Reaproveita o dia já preenchido para essa data, se existir
    dias.push(diasPorData.get(dataStr) || DIA_PADRAO(dataStr));
    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  return { dias, erro: null };
}
