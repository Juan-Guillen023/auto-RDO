import { useEffect, useRef } from 'react';

const DIA_PADRAO = (dataStr) => ({
  data: dataStr,
  horaInicio: '08:00',
  horaFim: '17:00',
  atividades: [{ titulo: '', texto: '', status: 'concluido', imagens: [] }],
});

/**
 * Gera a lista de dias entre duas datas (inclusive), reaproveitando os dias
 * já existentes (por data) para não perder o que já foi digitado quando o
 * intervalo é ajustado.
 *
 * @param {string} dataInicio - DD/MM/AAAA
 * @param {string} dataFim    - DD/MM/AAAA
 * @param {object[]} diasExistentes - dias já preenchidos antes da mudança de intervalo
 * @returns {{ dias: object[], erro: string | null }}
 */
export function gerarIntervalo(dataInicio, dataFim, diasExistentes = []) {
  const [diaI, mesI, anoI] = dataInicio.split('/');
  const [diaF, mesF, anoF] = dataFim.split('/');

  const inicio = new Date(`${anoI}-${mesI}-${diaI}T00:00:00`);
  const fim    = new Date(`${anoF}-${mesF}-${diaF}T00:00:00`);

  if (inicio > fim) {
    return { dias: null, erro: 'A data de início não pode ser maior que a data final.' };
  }

  const diasPorData = new Map(diasExistentes.map((dia) => [dia.data, dia]));

  const dias = [];
  let dataAtual = new Date(inicio);

  while (dataAtual <= fim) {
    const dd   = String(dataAtual.getDate()).padStart(2, '0');
    const mm   = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const aaaa = dataAtual.getFullYear();
    const dataStr = `${dd}/${mm}/${aaaa}`;
    // Reaproveita o dia já preenchido para essa data, se existir
    dias.push(diasPorData.get(dataStr) || DIA_PADRAO(dataStr));
    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  return { dias, erro: null };
}

/**
 * Hook que observa o intervalo de datas e notifica via callback
 * quando uma lista de dias válida for gerada. Preserva os dias já
 * preenchidos (via `diasAtuais`) sem disparar o efeito a cada edição
 * de atividade — só quando o intervalo de datas muda.
 *
 * @param {string} dataInicio
 * @param {string} dataFim
 * @param {object[]} diasAtuais
 * @param {{ onDiasGerados: (dias: object[]) => void, onErro: (msg: string) => void }} callbacks
 */
export function useDateRange(dataInicio, dataFim, diasAtuais, { onDiasGerados, onErro }) {
  const diasAtuaisRef = useRef(diasAtuais);
  diasAtuaisRef.current = diasAtuais;

  useEffect(() => {
    if (dataInicio.length !== 10 || dataFim.length !== 10) return;

    const { dias, erro } = gerarIntervalo(dataInicio, dataFim, diasAtuaisRef.current);

    if (erro) {
      onErro(erro);
    } else {
      onDiasGerados(dias);
    }
  }, [dataInicio, dataFim]);
}