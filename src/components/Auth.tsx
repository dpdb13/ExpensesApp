import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

type View = 'login' | 'register' | 'reset' | 'new-password';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

interface AuthProps {
  initialView?: View;
}

export function Auth({ initialView = 'login' }: AuthProps) {
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();
  const [view, setView] = useState<View>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (view === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : error.message);
      }
    } else if (view === 'register') {
      if (!PASSWORD_REGEX.test(password)) {
        setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName);
      if (error) {
        setError(error.message);
      } else {
        setMessage('¡Cuenta creada! Ya puedes entrar.');
        setView('login');
      }
    } else if (view === 'reset') {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Te hemos enviado un email para restablecer tu contraseña.');
      }
    } else if (view === 'new-password') {
      if (!PASSWORD_REGEX.test(password)) {
        setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        setLoading(false);
        return;
      }
      const { error } = await updatePassword(password);
      if (error) {
        setError(error.message);
      }
    }

    setLoading(false);
  };

  const switchView = (newView: View) => {
    setView(newView);
    setError('');
    setMessage('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/ExpensesApp/logo.png" alt="Logo" className="auth-logo" />
          <h1>Gastos Compartidos</h1>
          <p>Gestiona gastos con tus amigos</p>
        </div>

        {view !== 'reset' && view !== 'new-password' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${view === 'login' ? 'active' : ''}`}
              onClick={() => switchView('login')}
            >
              Iniciar sesión
            </button>
            <button
              className={`auth-tab ${view === 'register' ? 'active' : ''}`}
              onClick={() => switchView('register')}
            >
              Crear cuenta
            </button>
          </div>
        )}

        {view === 'reset' && (
          <div className="auth-reset-header">
            <h2>Restablecer contraseña</h2>
            <p>Te enviaremos un email con un enlace para crear una nueva contraseña.</p>
          </div>
        )}

        {view === 'new-password' && (
          <div className="auth-reset-header">
            <h2>Crea tu nueva contraseña</h2>
            <p>Al menos 8 caracteres, con una mayúscula, una minúscula y un número.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {view === 'register' && (
            <div className="form-group">
              <label>Tu nombre</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Diego"
                className="input"
                required={view === 'register'}
              />
            </div>
          )}

          {view !== 'new-password' && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="input"
                required
              />
            </div>
          )}

          {view !== 'reset' && (
            <div className="form-group">
              <label>{view === 'new-password' ? 'Nueva contraseña' : 'Contraseña'}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                minLength={view === 'login' ? 6 : 8}
              />
            </div>
          )}

          {view === 'new-password' && (
            <div className="form-group">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                minLength={8}
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Cargando...' :
              view === 'login' ? 'Entrar' :
              view === 'register' ? 'Crear cuenta' :
              view === 'new-password' ? 'Guardar contraseña' :
              'Enviar email'}
          </button>

          {view === 'login' && (
            <button
              type="button"
              className="btn-link auth-forgot"
              onClick={() => switchView('reset')}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {view === 'reset' && (
            <button
              type="button"
              className="btn-link auth-forgot"
              onClick={() => switchView('login')}
            >
              ← Volver a iniciar sesión
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
