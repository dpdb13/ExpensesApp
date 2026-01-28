import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

type View = 'login' | 'register' | 'reset';

export function Auth() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
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

        {view !== 'reset' && (
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

          {view !== 'reset' && (
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                minLength={6}
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
