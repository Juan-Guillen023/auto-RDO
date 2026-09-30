import { useCallback, useEffect, useRef, useState } from 'react';
import { ConflitoDeVersaoError } from '../repositories/RelatorioRepository';

const ATRASO_AUTO_SAVE_MS = 5_000;

/**
 * @typedef {'salvo' | 'pendente' | 'salvando' | 'erro' | 'conflito'} EstadoSalvamento
 */

/**
 * Salva o relatório no repositório: automaticamente, alguns segundos depois
 * da última alteração, ou sob demanda via `salvar()`.
 *
 * Detecção de alteração por REFERÊNCIA: como o formulário atualiza o estado
 * de forma imutável, "mudou desde o último salvamento?" é só comparar se
 * `campos`/`diasDados` ainda são os mesmos objetos que foram salvos — sem
 * percorrer nem serializar nada.
 *
 * @param {{
 *   repositorio: import('../repositories/RelatorioRepository').RelatorioRepository,
 *   id: string,
 *   status: import('../repositories/RelatorioRepository').StatusRelatorio,
 *   campos: object,
 *   diasDados: object[],
 * }} params
 */
export function useRelatorioPersistence({ repositorio, id, status, campos, diasDados }) {
  // O estado inicial (recém-aberto do banco, ou vazio se novo) conta como "salvo"
  const [versaoSalva, setVersaoSalva] = useState({ campos, diasDados, status });
  const [salvando, setSalvando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  // Conflito é definitivo nesta tela: tentar de novo falharia sempre
  const [conflito, setConflito] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState(null);

  const temAlteracoes =
    campos !== versaoSalva.campos ||
    diasDados !== versaoSalva.diasDados ||
    status !== versaoSalva.status;

  // `salvar` lê sempre o estado mais recente sem precisar ser recriado a cada tecla
  const atualRef = useRef({ campos, diasDados, status });
  useEffect(() => {
    atualRef.current = { campos, diasDados, status };
  });

  const salvar = useCallback(async () => {
    const snapshot = atualRef.current;
    setSalvando(true);
    try {
      await repositorio.salvar({ id, ...snapshot });
      // Marca como salvo exatamente o que foi enviado; o que for digitado
      // durante o envio continua "pendente" e entra no próximo salvamento
      setVersaoSalva(snapshot);
      setUltimoSalvamento(new Date());
      setFalhou(false);
      return true;
    } catch (err) {
      console.error('Erro ao salvar relatório:', err);
      if (err instanceof ConflitoDeVersaoError) setConflito(true);
      setFalhou(true);
      return false;
    } finally {
      setSalvando(false);
    }
  }, [repositorio, id]);

  // Debounce: cada alteração reinicia o cronômetro; salva quando o usuário para.
  // `falhou` nas dependências faz uma falha agendar nova tentativa
  // (exceto conflito, em que insistir não adianta).
  useEffect(() => {
    if (!temAlteracoes || conflito) return;
    const timer = setTimeout(salvar, ATRASO_AUTO_SAVE_MS);
    return () => clearTimeout(timer);
  }, [campos, diasDados, status, temAlteracoes, falhou, conflito, salvar]);

  // Avisa o navegador antes de fechar a aba com alterações não salvas
  useEffect(() => {
    if (!temAlteracoes) return;
    const avisar = (e) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [temAlteracoes]);

  /** @type {EstadoSalvamento} */
  const estado = conflito ? 'conflito' : salvando ? 'salvando' : falhou ? 'erro' : temAlteracoes ? 'pendente' : 'salvo';

  return { estado, temAlteracoes, ultimoSalvamento, salvar };
}
