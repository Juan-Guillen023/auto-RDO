import { supabase } from './supabaseClient';

/**
 * Adaptador de autenticação: o único arquivo que conhece `supabase.auth`.
 * O resto do app fala em "entrar", "cadastrar", "sair" e recebe erros já em
 * português — trocar de provedor de login significa reescrever só este arquivo.
 */

const MENSAGENS_DE_ERRO = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  user_already_exists: 'Já existe uma conta com este e-mail. Use "Entrar".',
  weak_password: 'Senha fraca. Use pelo menos 6 caracteres.',
  email_not_confirmed: 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  email_address_invalid: 'E-mail inválido.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos e tente novamente.',
};

class ErroDeAutenticacao extends Error {}

function traduzirErro(error) {
  return new ErroDeAutenticacao(
    MENSAGENS_DE_ERRO[error.code] ?? 'Não foi possível completar a operação. Tente novamente.'
  );
}

/**
 * @typedef {{ id: string, email: string }} Usuario
 */

/** @param {import('@supabase/supabase-js').User | undefined} user */
function paraUsuario(user) {
  return user ? { id: user.id, email: user.email } : null;
}

/**
 * @param {string} email
 * @param {string} senha
 * @returns {Promise<Usuario>}
 */
export async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw traduzirErro(error);
  return paraUsuario(data.user);
}

/**
 * Cria a conta. Se o projeto exigir confirmação de e-mail, não há sessão
 * ainda — o chamador deve avisar o usuário para checar a caixa de entrada.
 * @param {string} email
 * @param {string} senha
 * @returns {Promise<{ precisaConfirmarEmail: boolean }>}
 */
export async function cadastrar(email, senha) {
  const { data, error } = await supabase.auth.signUp({ email, password: senha });
  if (error) throw traduzirErro(error);
  return { precisaConfirmarEmail: !data.session };
}

export async function sair() {
  const { error } = await supabase.auth.signOut();
  if (error) throw traduzirErro(error);
}

/**
 * Observa login/logout (inclusive em outras abas e a sessão restaurada ao
 * abrir o app). Chama `callback` imediatamente com o estado atual.
 * @param {(usuario: Usuario | null) => void} callback
 * @returns {() => void} função para cancelar a observação
 */
export function observarUsuario(callback) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
    callback(paraUsuario(sessao?.user));
  });
  return () => data.subscription.unsubscribe();
}
