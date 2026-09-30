import { useState } from 'react';
import { mascaraData, mascaraHora } from '../utils/mascaras';
import { atualizarDia, atualizarAtividade } from '../utils/diasUtils';
import { gerarIntervalo } from '../utils/intervaloDias';
import { comprimirImagem } from '../utils/imagens';
import { novaAtividade } from '../constants/atividade';


const CAMPOS_INICIAIS = {
  cliente: '',
  projeto: '',
  task: '',
  po: '',
  tecnico: '',
  servico: '',
  escopo: '',
  localizacao: '',
  dataInicio: '',
  dataFim: '',
};

/**
 * Estado e ações do formulário de um relatório.
 * @param {{ campos?: object, diasDados?: object[] }} [inicial] - relatório aberto (ausente = novo)
 */
export function useRdoForm(inicial) {
  // Mescla com os padrões: relatórios salvos antes de um campo novo existir continuam válidos
  const [campos, setCampos] = useState(() => ({ ...CAMPOS_INICIAIS, ...inicial?.campos }));
  const [diasDados, setDiasDados] = useState(() => inicial?.diasDados ?? []);
  const [erro, setErro] = useState(null);

  const handleCampoChange = (nome, valor) => {
    const ehData = nome === 'dataInicio' || nome === 'dataFim';
    const novosCampos = { ...campos, [nome]: ehData ? mascaraData(valor) : valor };
    setCampos(novosCampos);

    // Os dias são consequência direta de o usuário mudar uma data, então são
    // recalculados aqui no evento — sem useEffect "vigiando" as datas.
    if (ehData) aplicarIntervalo(novosCampos.dataInicio, novosCampos.dataFim);
  };

  const aplicarIntervalo = (dataInicio, dataFim) => {
    if (dataInicio.length !== 10 || dataFim.length !== 10) return;

    const { dias, erro: erroIntervalo } = gerarIntervalo(dataInicio, dataFim, diasDados);
    setErro(erroIntervalo);
    if (dias) setDiasDados(dias);
  };

  const handleDiaChange = (indexDia, campo, valor) => {
    const valorFormatado = campo.includes('hora') ? mascaraHora(valor) : valor;
    // DRY: usa atualizarDia em vez de duplicar o prev.map
    setDiasDados((prev) => atualizarDia(prev, indexDia, (dia) => ({ ...dia, [campo]: valorFormatado })));
  };

  const handleAtividadeChange = (indexDia, indexAtiv, campo, valor) => {
    // DRY: usa atualizarAtividade em vez de duplicar o prev.map aninhado
    setDiasDados((prev) => atualizarAtividade(prev, indexDia, indexAtiv, (ativ) => ({ ...ativ, [campo]: valor })));
  };

  const addNovaAtividade = (indexDia) => {
    setDiasDados((prev) =>
      atualizarDia(prev, indexDia, (dia) => ({
        ...dia,
        atividades: [...dia.atividades, novaAtividade()],
      }))
    );
  };

  const removerAtividade = (indexDia, indexAtiv) => {
    setDiasDados((prev) =>
      atualizarDia(prev, indexDia, (dia) => {
        if (dia.atividades.length <= 1) return dia;
        return { ...dia, atividades: dia.atividades.filter((_, j) => j !== indexAtiv) };
      })
    );
  };

  const handleImageUpload = async (indexDia, indexAtiv, files) => {
    // allSettled: uma foto com formato não suportado não impede as outras de entrarem
    const resultados = await Promise.allSettled(Array.from(files).map((file) => comprimirImagem(file)));
    const imagens = resultados.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const falhas = resultados.length - imagens.length;

    if (imagens.length > 0) {
      setDiasDados((prev) =>
        atualizarAtividade(prev, indexDia, indexAtiv, (ativ) => ({
          ...ativ,
          imagens: [...ativ.imagens, ...imagens],
        }))
      );
    }

    if (falhas > 0) {
      setErro(`${falhas} imagem(ns) não puderam ser carregadas. Use JPG, PNG ou WebP.`);
    }
  };

  const removerImagem = (indexDia, indexAtiv, indexImagem) => {
    setDiasDados((prev) =>
      atualizarAtividade(prev, indexDia, indexAtiv, (ativ) => ({
        ...ativ,
        imagens: ativ.imagens.filter((_, k) => k !== indexImagem),
      }))
    );
  };

  return {
    campos,
    diasDados,
    erro,
    handleCampoChange,
    handleDiaChange,
    handleAtividadeChange,
    addNovaAtividade,
    removerAtividade,
    handleImageUpload,
    removerImagem,
  };
}