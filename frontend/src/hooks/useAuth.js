import { useEffect, useState } from 'react';
import { observarUsuario } from '../services/authService';

/**
 * Usuário logado no momento, sincronizado com o provedor de autenticação.
 * `carregando` fica true só até a primeira resposta (sessão salva ou não).
 *
 * Aqui o useEffect é o uso correto: é uma assinatura de um sistema externo,
 * com limpeza no retorno.
 *
 * @returns {{ usuario: import('../services/authService').Usuario | null, carregando: boolean }}
 */
export function useAuth() {
  const [estado, setEstado] = useState({ usuario: null, carregando: true });

  useEffect(() => {
    return observarUsuario((usuario) => setEstado({ usuario, carregando: false }));
  }, []);

  return estado;
}
