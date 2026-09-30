import { useState } from 'react';
import { entrar, cadastrar } from '../services/authService';
import styles from './LoginScreen.module.css';

const MODOS = {
  entrar: {
    titulo: 'Entrar',
    botao: 'Entrar',
    botaoCarregando: 'Entrando...',
    alternar: 'Não tem conta? Criar conta',
    autoComplete: 'current-password',
  },
  cadastrar: {
    titulo: 'Criar conta',
    botao: 'Criar conta',
    botaoCarregando: 'Criando conta...',
    alternar: 'Já tem conta? Entrar',
    autoComplete: 'new-password',
  },
};

/**
 * Tela de login/cadastro. Não precisa avisar ninguém quando der certo:
 * o useAuth (no AuthGate) percebe a nova sessão e troca a tela sozinho.
 */
function LoginScreen() {
  const [modo, setModo] = useState('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);

  const textos = MODOS[modo];

  const alternarModo = () => {
    setModo((atual) => (atual === 'entrar' ? 'cadastrar' : 'entrar'));
    setErro(null);
    setAviso(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setAviso(null);

    try {
      if (modo === 'entrar') {
        await entrar(email.trim(), senha);
      } else {
        const { precisaConfirmarEmail } = await cadastrar(email.trim(), senha);
        if (precisaConfirmarEmail) {
          setAviso('Conta criada! Enviamos um link de confirmação para o seu e-mail.');
          setModo('entrar');
        }
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className={styles.pagina}>
      <form className={styles.cartao} onSubmit={handleSubmit}>
        <h1 className={styles.marca}>Relatório Diário de Obra</h1>
        <h2 className={styles.titulo}>{textos.titulo}</h2>

        <label className={styles.campo}>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus
          />
        </label>

        <label className={styles.campo}>
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={textos.autoComplete}
            minLength={6}
            required
          />
        </label>

        {erro && <p className={styles.erro} role="alert">{erro}</p>}
        {aviso && <p className={styles.aviso} role="status">{aviso}</p>}

        <button type="submit" className={styles.btnPrincipal} disabled={enviando}>
          {enviando ? textos.botaoCarregando : textos.botao}
        </button>

        <button type="button" className={styles.btnLink} onClick={alternarModo} disabled={enviando}>
          {textos.alternar}
        </button>
      </form>
    </main>
  );
}

export default LoginScreen;
