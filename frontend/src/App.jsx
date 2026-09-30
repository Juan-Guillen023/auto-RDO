import { useState } from 'react';
import ListaRelatorios from './pages/ListaRelatorios';
import EditorRelatorio from './pages/EditorRelatorio';
import { relatorioRepository } from './repositories';

/**
 * Navegação entre "Meus relatórios" e o editor.
 *
 * É também aqui que o repositório é INJETADO nas telas: elas o recebem por
 * props e nunca importam uma implementação concreta — o que permite testá-las
 * com um repositório falso.
 */
function App() {
  const [tela, setTela] = useState({ nome: 'lista' });

  const voltarParaLista = () => setTela({ nome: 'lista' });

  if (tela.nome === 'editor') {
    return (
      <EditorRelatorio
        key={tela.id}
        repositorio={relatorioRepository}
        id={tela.id}
        novo={tela.novo}
        onVoltar={voltarParaLista}
      />
    );
  }

  return (
    <ListaRelatorios
      repositorio={relatorioRepository}
      onAbrir={(id) => setTela({ nome: 'editor', id, novo: false })}
      // O id nasce no navegador: o relatório só vai para o banco no primeiro salvamento
      onNovo={() => setTela({ nome: 'editor', id: crypto.randomUUID(), novo: true })}
    />
  );
}

export default App;
