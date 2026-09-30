import { createClient } from '@supabase/supabase-js';

// Ambas são PÚBLICAS por natureza (vão parar no navegador de qualquer forma).
// Quem protege os dados são as policies de RLS no banco — nunca coloque aqui
// a chave secreta / service_role.
const url = import.meta.env.VITE_SUPABASE_URL;
const chavePublica = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurado = Boolean(url && chavePublica);

/** Cliente único do app, ou null se as variáveis de ambiente não existirem. */
export const supabase = supabaseConfigurado ? createClient(url, chavePublica) : null;
