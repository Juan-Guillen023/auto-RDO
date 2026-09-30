import { supabase } from '../services/supabaseClient';
import { MODO_OFFLINE, USUARIO_LOCAL } from '../config/modo';
import { SupabaseRelatorioRepository } from './SupabaseRelatorioRepository';
import { IndexedDbRelatorioRepository } from './IndexedDbRelatorioRepository';

/**
 * Raiz de composição: o ÚNICO lugar do app que sabe qual implementação de
 * RelatorioRepository está em uso. Para trocar de armazenamento (ex: IndexedDB
 * offline, API própria), só esta linha muda.
 *
 * @type {import('./RelatorioRepository').RelatorioRepository | null}
 */
export const relatorioRepository = MODO_OFFLINE
  ? new IndexedDbRelatorioRepository({ usuario: USUARIO_LOCAL })
  : supabase ? new SupabaseRelatorioRepository(supabase) : null;
