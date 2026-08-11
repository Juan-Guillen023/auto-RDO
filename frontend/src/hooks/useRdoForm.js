import { useState } from 'react';
import { mascaraData, mascaraHora } from '../utils/mascaras';
import { atualizarDia, atualizarAtividade } from '../utils/diasUtils';
import { useDateRange } from './useDateRange';


const CAMPOS_INICIAIS = {
  cliente: '',
  projeto: '',
  task: '',
  po: '',
  tecnico: '',
  servico: '',
  escopo: '',
  dataInicio: '',
  dataFim: '',
};

export function useRdoForm() {
  const [campos, setCampos] = useState(CAMPOS_INICIAIS);
  const [diasDados, setDiasDados] = useState([]);
  const [erro, setErro] = useState(null);

  // Delega a geração de dias para o hook especializado (SRP)
  useDateRange(campos.dataInicio, campos.dataFim, diasDados, {
    onDiasGerados: (dias) => { setDiasDados(dias); setErro(null); },
    onErro: (msg) => setErro(msg),
  });

  const handleCampoChange = (nome, valor) => {
    const valorFormatado =
      nome === 'dataInicio' || nome === 'dataFim' ? mascaraData(valor) : valor;
    setCampos((prev) => ({ ...prev, [nome]: valorFormatado }));
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
        atividades: [...dia.atividades, { titulo: '', texto: '', status: 'concluido', imagens: [] }],
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

  const handleImageUpload = (indexDia, indexAtiv, files) => {
    Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
          })
      )
    ).then((base64Images) => {
      setDiasDados((prev) =>
        atualizarAtividade(prev, indexDia, indexAtiv, (ativ) => ({
          ...ativ,
          imagens: [...ativ.imagens, ...base64Images],
        }))
      );
    });
  };

  const removerImagem = (indexDia, indexAtiv, indexImagem) => {
    setDiasDados((prev) =>
      atualizarAtividade(prev, indexDia, indexAtiv, (ativ) => ({
        ...ativ,
        imagens: ativ.imagens.filter((_, k) => k !== indexImagem),
      }))
    );
  };

  const restaurarRascunho = (draft) => {
    if (!draft?.campos || !draft?.diasDados) return;
    setCampos(draft.campos);
    setDiasDados(draft.diasDados);
    setErro(null);
  };

  const limparFormulario = () => {
    setCampos(CAMPOS_INICIAIS);
    setDiasDados([]);
    setErro(null);
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
    restaurarRascunho,
    limparFormulario,
  };
}