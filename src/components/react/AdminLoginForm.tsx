import { useEffect, useState } from 'react';
import { toast } from '../../lib/toast';
import {
  clearAuthErrorFromUrl,
  fetchCsrfToken,
  showAuthError,
} from '../../lib/auth-client';

type Props = {
  authError?: string | null;
};

export function AdminLoginForm({ authError }: Props) {
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bootError, setBootError] = useState('');

  useEffect(() => {
    fetchCsrfToken()
      .then(setCsrfToken)
      .catch(() => {
        const message = 'No se pudo conectar con el servidor de autenticación.';
        setBootError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authError) return;
    showAuthError(authError);
    clearAuthErrorFromUrl();
  }, [authError]);

  if (loading) {
    return (
      <div className="card gothic-frame mx-auto w-full max-w-md text-center">
        <p className="text-muted">Preparando formulario...</p>
      </div>
    );
  }

  if (bootError || !csrfToken) {
    return (
      <div className="card gothic-frame mx-auto w-full max-w-md text-center">
        <p className="font-heading text-2xl font-semibold tracking-[0.08em]">No se pudo iniciar sesión</p>
        <p className="mt-2 text-sm text-muted">
          {bootError || 'Revisa que AUTH_SECRET esté configurado en .env'}
        </p>
      </div>
    );
  }

  return (
    <form
      method="POST"
      action="/api/auth/callback/credentials"
      onSubmit={() => setSubmitting(true)}
      className="card gothic-frame-double mx-auto w-full max-w-md space-y-5"
    >
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value="/admin" />

      <div>
        <p className="section-eyebrow">Panel admin</p>
        <h1 className="font-heading mt-2 text-4xl font-semibold tracking-[0.1em]">Ortiga Tattoo</h1>
        <div className="divider-crimson mt-4" />
        <p className="mt-3 text-sm text-muted">Inicia sesión para gestionar el estudio.</p>
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="username">
          Usuario
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          className="input-field"
          autoComplete="username"
        />
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="input-field"
          autoComplete="current-password"
        />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>
      <a href="/" className="block text-center font-mono text-xs uppercase tracking-[0.14em] text-muted hover:text-accent">
        ← Volver al sitio
      </a>
    </form>
  );
}
