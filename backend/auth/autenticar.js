/**
 * @typedef {{ id: string, email: string }} UsuarioAutenticado
 * @typedef {(token: string) => Promise<UsuarioAutenticado | null>} VerificarToken
 *   Devolve o usuário, ou null se o token for inválido/expirado.
 *   Lança erro só quando não foi possível verificar (ex: Supabase fora do ar).
 */

/**
 * Middleware que exige `Authorization: Bearer <token>` válido e deixa o
 * usuário em `req.usuario`. Recebe o verificador por parâmetro: em produção
 * ele consulta o Supabase; nos testes, é uma função falsa.
 *
 * @param {VerificarToken} verificarToken
 */
function criarAutenticacao(verificarToken) {
  return async function autenticar(req, res, next) {
    const [esquema, token] = (req.get('Authorization') || '').split(' ');
    if (esquema !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    try {
      const usuario = await verificarToken(token);
      if (!usuario) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });

      req.usuario = usuario;
      next();
    } catch (err) {
      // Falha nossa, não do usuário: 503 em vez de 401, para o frontend
      // não tratar como "sessão expirada" e deslogar à toa
      console.error('Falha ao verificar token:', err);
      res.status(503).json({ error: 'Não foi possível verificar a sessão. Tente novamente.' });
    }
  };
}

module.exports = { criarAutenticacao };
