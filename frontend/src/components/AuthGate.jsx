import { useState } from 'react';
import { supabaseConfigurado } from '../services/supabaseClient';
import { MODO_OFFLINE, USUARIO_LOCAL } from '../config/modo';
import { sair } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { UsuarioContext } from '../contexts/UsuarioContext';
import LoginScreen from './LoginScreen';
import styles from './AuthGate.module.css';

/**
 * Só renderiza `children` para um usuário logado. O App protegido não precisa
 * saber que existe autenticação (responsabilidade única).
 */
function AuthGate({ children }) {
  // Offline não há login: o usuário é quem está neste computador
  if (MODO_OFFLINE) {
    return (
      <UsuarioContext value={USUARIO_LOCAL}>
        <header className={styles.barra}>
          <span className={styles.email}>Modo offline · relatórios salvos neste computador</span>
        </header>
        {children}
      </UsuarioContext>
    );
  }

  // Sem configuração, o hook de sessão nem pode rodar — falha visível em vez de tela branca
  if (!supabaseConfigurado) {
    return (
      <p className={styles.estado} role="alert">
        Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
        no arquivo .env.local e reinicie o servidor.
      </p>
    );
  }

  return <PortaoDeSessao>{children}</PortaoDeSessao>;
}

function PortaoDeSessao({ children }) {
  const { usuario, carregando } = useAuth();

  if (carregando) return <p className={styles.estado}>Carregando...</p>;
  if (!usuario) return <LoginScreen />;

  return (
    <UsuarioContext value={usuario}>
      <BarraDoUsuario email={usuario.email} />
      {children}
    </UsuarioContext>
  );
}

function BarraDoUsuario({ email }) {
  const [saindo, setSaindo] = useState(false);

  const handleSair = async () => {
    setSaindo(true);
    try {
      await sair();
    } catch (err) {
      console.error('Erro ao sair:', err);
      setSaindo(false);
    }
  };

  return (
    <header className={styles.barra}>
      <span className={styles.email}>{email}</span>
      <button type="button" className={styles.btnSair} onClick={handleSair} disabled={saindo}>
        {saindo ? 'Saindo...' : 'Sair'}
      </button>
    </header>
  );
}

export default AuthGate;
