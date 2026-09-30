/**
 * LEGADO: rascunho único no localStorage, usado antes de os relatórios irem
 * para o banco. Mantido só para ler e importar o que ficou salvo nos
 * navegadores. Pode ser removido quando não houver mais rascunhos antigos.
 */
const DRAFT_KEY = 'autorde:draft:v1';

/**
 * Lê e desserializa o rascunho salvo.
 * Retorna null se não houver rascunho ou se o dado estiver corrompido.
 * @returns {{ schemaVersion: number, savedAt: string, campos: object, diasDados: object[] } | null}
 */
export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return migrateDraft(parsed);
  } catch {
    // JSON corrompido — limpa o storage para evitar falhas futuras
    clearDraft();
    return null;
  }
}

/**
 * Remove o rascunho salvo do localStorage.
 */
export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Falha silenciosa — não deve interromper o fluxo do usuário
  }
}

/**
 * Aplica migrações de schema para compatibilidade com versões anteriores.
 * Adicione novos cases aqui conforme o schema evolui.
 * @param {object} draft
 * @returns {object | null}
 */
function migrateDraft(draft) {
  if (!draft || typeof draft.schemaVersion === 'undefined') return null;

  return draft;
}