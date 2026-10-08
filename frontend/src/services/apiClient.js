import { supabase } from './supabaseClient';
import { MODO_OFFLINE } from '../config/modo';

// VITE_API_BASE aponta para um backend local durante testes (veja .env.example).
// Sem ela, usa a produção.
const API_BASE = (import.meta.env.VITE_API_BASE || 'https://auto-rdo.onrender.com/api').replace(/\/$/, '');

/** Erro HTTP da API, com o status e a mensagem que o backend mandou. */
export class ErroApi extends Error {
  /** @param {number} status @param {string} [mensagem] */
  constructor(status, mensagem) {
    super(mensagem || `Falha na requisição (status ${status})`);
    this.name = 'ErroApi';
    this.status = status;
  }
}

// getSession() renova sozinho um token expirado, então o token enviado é sempre válido
async function tokenDaSessao() {
  // Offline o servidor local aceita qualquer token: só esta máquina chega nele
  if (MODO_OFFLINE) return 'local';
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ErroApi(401, 'Sessão expirada. Entre novamente.');
  return session.access_token;
}

/**
 * O plano gratuito do Render desliga o servidor após ~15 min ocioso e leva
 * ~1 min para religar. Um GET na abertura do app faz esse tempo correr
 * enquanto o usuário faz login e preenche o formulário, e não no clique em
 * "Gerar PDF". Usa a rota pública "/", fora de /api, que exigiria token.
 * Fire-and-forget: se falhar, a requisição real acorda o servidor do mesmo jeito.
 */
export function acordarServidor() {
  // Offline o servidor é local e já está de pé
  if (MODO_OFFLINE) return;
  fetch(new URL(API_BASE).origin, { cache: 'no-store' }).catch(() => {});
}

/**
 * POST autenticado para a API. Único ponto do app que sabe a URL do backend
 * e como se autenticar nele.
 * @param {string} rota - ex: '/gerar-rdo'
 * @param {object} corpo
 * @returns {Promise<Response>} só respostas 2xx; as demais viram ErroApi
 */
export async function postJson(rota, corpo) {
  const response = await fetch(`${API_BASE}${rota}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await tokenDaSessao()}`,
    },
    body: JSON.stringify(corpo),
  });

  if (!response.ok) {
    const corpoErro = await response.json().catch(() => null);
    throw new ErroApi(response.status, corpoErro?.error);
  }
  return response;
}
