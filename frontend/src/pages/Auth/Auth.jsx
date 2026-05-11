import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

function Auth({ onNavigate }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.displayName);
      }
      onNavigate('my-plants');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__logo">🌿</div>
        <h1 className="auth__title">
          {mode === 'login' ? 'Welcome back' : 'Join Plantopia'}
        </h1>
        <p className="auth__subtitle">
          {mode === 'login'
            ? 'Sign in to access your plant collection'
            : 'Create an account to track your plants'}
        </p>

        <form className="auth__form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label className="auth__label">
              Display Name
              <input
                className="auth__input"
                type="text"
                value={form.displayName}
                onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
                placeholder="Your name"
              />
            </label>
          )}
          <label className="auth__label">
            Email *
            <input
              className="auth__input"
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>
          <label className="auth__label">
            Password *
            <input
              className="auth__input"
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder={mode === 'register' ? 'Min 8 characters' : 'Your password'}
              required
              minLength={mode === 'register' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <p className="auth__error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary auth__submit"
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="auth__toggle">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="auth__toggle-btn"
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
