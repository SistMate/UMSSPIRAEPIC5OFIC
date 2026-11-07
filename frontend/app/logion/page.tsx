
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, Mail, LogIn } from 'lucide-react';
import { signIn } from '../../lib/supabase-auth';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Completa tu correo electrónico y contraseña.');
      return;
    }

    try {
      setLoading(true);

      await signIn(email.trim(), password);

      router.replace('/vacantes');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesión.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <LogIn size={30} />
          </div>

          <h1>Bienvenido a UMSSPIRA</h1>

          <p>
            Ingresa a tu cuenta para continuar y descubrir
            oportunidades laborales.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>

            <div className="input-container">
              <Mail size={19} />

              <input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>

            <div className="input-container">
              <LockKeyhole size={19} />

              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <footer className="login-footer">
          <p>UMSSPIRA · Portal de oportunidades laborales</p>
        </footer>
      </section>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #f3f5f9;
          font-family: Arial, sans-serif;
        }

        .login-container {
          width: 100%;
          max-width: 440px;
          padding: 40px;
          background: #ffffff;
          border-radius: 18px;
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-logo {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: white;
          background: #2563eb;
          border-radius: 18px;
        }

        .login-header h1 {
          margin: 0 0 12px;
          color: #172033;
          font-size: 25px;
          font-weight: 700;
        }

        .login-header p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .form-group label {
          color: #334155;
          font-size: 14px;
          font-weight: 600;
        }

        .input-container {
          height: 50px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 14px;
          border: 1px solid #dbe2ea;
          border-radius: 10px;
          color: #64748b;
          transition: border-color 0.2s;
        }

        .input-container:focus-within {
          border-color: #2563eb;
        }

        .input-container input {
          width: 100%;
          height: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #172033;
          font-size: 14px;
        }

        .input-container input::placeholder {
          color: #94a3b8;
        }

        .password-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
        }

        .login-error {
          padding: 12px;
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          font-size: 13px;
        }

        .login-button {
          height: 50px;
          margin-top: 4px;
          border: none;
          border-radius: 10px;
          background: #2563eb;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .login-button:hover {
          background: #1d4ed8;
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #edf0f4;
          text-align: center;
        }

        .login-footer p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        @media (max-width: 480px) {
          .login-container {
            padding: 28px 22px;
          }

          .login-header h1 {
            font-size: 22px;
          }
        }
      `}</style>
    </main>
  );
}
