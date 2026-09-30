/**
 * Modo de execução, decidido no BUILD: `npm run build:offline` carrega o
 * `.env.offline`. Qualquer outro build (dev, Vercel) continua online.
 *
 * - online:  Supabase (login e relatórios) + backend no Render
 * - offline: servidor local + relatórios no IndexedDB deste computador
 */
export const MODO_OFFLINE = import.meta.env.VITE_MODO === 'offline';

/** Único usuário do modo offline: quem está usando este computador. */
export const USUARIO_LOCAL = Object.freeze({ id: 'local', email: 'local@offline' });
