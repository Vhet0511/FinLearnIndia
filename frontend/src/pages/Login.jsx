import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { authenticate, getRole, homePathForRole, setRole } from '../auth.js';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Already signed in (demo session): go straight to the right dashboard.
  const existingRole = getRole();
  if (existingRole) {
    return <Navigate to={homePathForRole(existingRole)} replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    // Trim the username only; the password is used exactly as typed.
    const role = authenticate(username.trim(), password);

    if (!role) {
      setError('Invalid username or password.');
      return;
    }

    setError('');
    setRole(role);
    navigate(homePathForRole(role), { replace: true });
  };

  return (
    <main className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <Logo />
        </div>
        <h1 className="auth__title">Welcome back</h1>
        <p className="auth__subtitle">Log in to continue your financial learning journey.</p>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--block">
            Log In
          </button>
        </form>

        <p className="auth__demo">
          Prototype only. Demo accounts: <code>admin / admin</code> and <code>user / user</code>.
        </p>

        <Link to="/" className="auth__back">&larr; Back to home</Link>
      </div>
    </main>
  );
}