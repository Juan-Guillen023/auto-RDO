import { useRef, useEffect, useCallback } from 'react';
import styles from './RichTextEditor.module.css';

const TAMANHOS = [8, 10, 12, 14, 18, 24];

/**
 * Remove qualquer <span> de tamanho de fonte já existente dentro de um
 * fragmento, mantendo o texto e outras tags (b/i/u). O editor só usa <span>
 * pra tamanho de fonte, então é seguro desembrulhar todos.
 */
function removerSpansDeTamanho(fragment) {
  fragment.querySelectorAll('span').forEach((span) => {
    const pai = span.parentNode;
    while (span.firstChild) pai.insertBefore(span.firstChild, span);
    pai.removeChild(span);
  });
}

/**
 * Editor de texto simples com negrito, itálico, sublinhado e tamanho de
 * fonte. Guarda o conteúdo como HTML (compatível com o parser do backend
 * em backend/utils/richText.js, que gera o PDF e o resumo pra IA a partir
 * dele).
 */
function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);
  const focado = useRef(false);
  const rangeSalvo = useRef(null);

  // Sincroniza conteúdo vindo de fora (restaurar rascunho, limpar formulário)
  // sem sobrescrever o que o usuário está digitando.
  useEffect(() => {
    const el = editorRef.current;
    if (el && !focado.current && el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const emitirChange = useCallback(() => {
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const aplicarComando = (comando) => {
    editorRef.current.focus();
    document.execCommand(comando, false, null);
    emitirChange();
  };

  // O <select> nativo rouba o foco/seleção do editor assim que é clicado
  // (antes do onChange disparar), então salvamos a seleção no mousedown
  // — momento em que ela ainda está intacta — pra reaplicar depois.
  const salvarSelecaoAtual = () => {
    const selecao = window.getSelection();
    if (
      selecao &&
      selecao.rangeCount > 0 &&
      editorRef.current &&
      editorRef.current.contains(selecao.anchorNode)
    ) {
      rangeSalvo.current = selecao.getRangeAt(0).cloneRange();
    }
  };

  const aplicarTamanho = (px) => {
    const editor = editorRef.current;
    const range = rangeSalvo.current;
    if (!range || range.collapsed) return;

    editor.focus();
    const selecao = window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(range);

    // Extrai sempre (em vez de surroundContents) pra funcionar tanto com
    // seleções simples quanto cruzando outras tags (negrito, spans antigos etc.)
    const conteudo = range.extractContents();
    removerSpansDeTamanho(conteudo);

    const span = document.createElement('span');
    span.style.fontSize = `${px}px`;
    span.appendChild(conteudo);
    range.insertNode(span);

    selecao.removeAllRanges();
    rangeSalvo.current = null;
    emitirChange();
  };

  const colarComoTextoPuro = (e) => {
    e.preventDefault();
    const texto = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, texto);
  };

  // Evita que o clique no botão tire o foco/seleção do editor antes do onClick disparar
  const manterFoco = (e) => e.preventDefault();

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.btn}
          onMouseDown={manterFoco}
          onClick={() => aplicarComando('bold')}
          title="Negrito"
        >
          <b>N</b>
        </button>
        <button
          type="button"
          className={styles.btn}
          onMouseDown={manterFoco}
          onClick={() => aplicarComando('italic')}
          title="Itálico"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          className={styles.btn}
          onMouseDown={manterFoco}
          onClick={() => aplicarComando('underline')}
          title="Sublinhado"
        >
          <u>S</u>
        </button>
        <select
          className={styles.tamanho}
          defaultValue=""
          onMouseDown={salvarSelecaoAtual}
          onChange={(e) => {
            if (e.target.value) aplicarTamanho(Number(e.target.value));
            e.target.value = '';
          }}
          title="Tamanho da fonte (selecione o texto antes)"
        >
          <option value="" disabled>
            Tamanho
          </option>
          {TAMANHOS.map((px) => (
            <option key={px} value={px}>
              {px}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onFocus={() => {
          focado.current = true;
        }}
        onBlur={() => {
          focado.current = false;
        }}
        onInput={emitirChange}
        onPaste={colarComoTextoPuro}
      />
    </div>
  );
}

export default RichTextEditor;
