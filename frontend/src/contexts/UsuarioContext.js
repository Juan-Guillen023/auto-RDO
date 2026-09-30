import { createContext, useContext } from 'react';

/**
 * Usuário logado, disponível para qualquer componente abaixo do AuthGate
 * sem precisar ser repassado por props em cada nível.
 * @type {import('react').Context<import('../services/authService').Usuario | null>}
 */
export const UsuarioContext = createContext(null);

/** @returns {import('../services/authService').Usuario} */
export function useUsuario() {
  const usuario = useContext(UsuarioContext);
  if (!usuario) throw new Error('useUsuario deve ser usado dentro do AuthGate.');
  return usuario;
}
