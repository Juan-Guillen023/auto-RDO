import { supabase } from '../services/supabaseClient';
import { SupabaseRelatorioRepository } from './SupabaseRelatorioRepository';

/**
 * Raiz de composição: o ÚNICO lugar do app que sabe qual implementação de
 * RelatorioRepository está em uso. Para trocar de armazenamento (ex: IndexedDB
 * offline, API própria), só esta linha muda.
 *
 * @type {import('./RelatorioRepository').RelatorioRepository | null}
 */
export const relatorioRepository = supabase ? new SupabaseRelatorioRepository(supabase) : null;
