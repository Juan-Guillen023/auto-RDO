const { createClient } = require('@supabase/supabase-js');

/**
 * Verificador de token que pergunta ao próprio Supabase se a sessão é válida.
 * Usa a chave PÚBLICA: validar um token não exige privilégio nenhum.
 *
 * @param {string} url
 * @param {string} chavePublica
 * @returns {import('./autenticar').VerificarToken}
 */
function criarVerificadorSupabase(url, chavePublica) {
  const supabase = createClient(url, chavePublica, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return async (token) => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      // 4xx = o token é que é ruim; qualquer outra coisa é falha de verificação
      if (error.status >= 400 && error.status < 500) return null;
      throw error;
    }
    return { id: data.user.id, email: data.user.email };
  };
}

module.exports = { criarVerificadorSupabase };
