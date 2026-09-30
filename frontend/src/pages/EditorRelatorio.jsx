import { useEffect, useState } from 'react';
import FormularioRelatorio from './FormularioRelatorio';
import styles from './EditorRelatorio.module.css';

/**
 * Carrega o relatório e só então monta o formulário — assim o formulário
 * nasce com os dados certos e nunca lida com "ainda carregando".
 *
 * Deve ser renderizado com `key={id}`: trocar de relatório recria o componente
 * do zero, em vez de reaproveitar o estado do anterior.
 *
 * @param {{
 *   repositorio: import('../repositories/RelatorioRepository').RelatorioRepository,
 *   id: string,
 *   novo: boolean,
 *   onVoltar: () => void,
 * }} props
 */
function EditorRelatorio({ repositorio, id, novo, onVoltar }) {
  const [carga, setCarga] = useState(() =>
    novo
      ? { estado: 'pronto', relatorio: { id, status: 'em_andamento' } }
      : { estado: 'carregando' }
  );

  useEffect(() => {
    if (novo) return;

    // Se o usuário sair antes de a resposta chegar, ela é ignorada
    let cancelado = false;
    repositorio.abrir(id).then(
      (relatorio) => !cancelado && setCarga({ estado: 'pronto', relatorio }),
      (err) => {
        console.error('Erro ao abrir relatório:', err);
        if (!cancelado) setCarga({ estado: 'erro' });
      }
    );
    return () => { cancelado = true; };
  }, [repositorio, id, novo]);

  if (carga.estado === 'carregando') {
    return <p className={styles.estado}>Abrindo relatório...</p>;
  }

  if (carga.estado === 'erro') {
    return (
      <div className={styles.estado} role="alert">
        <p>Não foi possível abrir este relatório. Verifique sua conexão.</p>
        <button type="button" className={styles.btnVoltar} onClick={onVoltar}>
          ← Voltar para Meus relatórios
        </button>
      </div>
    );
  }

  return <FormularioRelatorio relatorio={carga.relatorio} repositorio={repositorio} onVoltar={onVoltar} />;
}

export default EditorRelatorio;
