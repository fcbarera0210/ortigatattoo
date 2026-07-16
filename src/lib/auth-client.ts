import { toast } from './toast';

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  MissingCSRF: 'La sesión expiró. Intenta de nuevo.',
  CredentialsSignin: 'Usuario o contraseña incorrectos.',
  Configuration: 'Error de configuración del servidor.',
  AccessDenied: 'Acceso denegado.',
  SessionRequired: 'Debes iniciar sesión para continuar.',
};

export async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('csrf');
  const data = await res.json();
  return data.csrfToken ?? '';
}

function getErrorFromLocation(location: string): string | null {
  try {
    const url = new URL(location, window.location.origin);
    return url.searchParams.get('error');
  } catch {
    return null;
  }
}

export async function signInWithCredentials(input: {
  username: string;
  password: string;
  callbackUrl?: string;
  csrfToken: string;
}): Promise<{ ok: true; redirectTo: string } | { ok: false; errorCode: string | null }> {
  const body = new URLSearchParams({
    csrfToken: input.csrfToken,
    username: input.username.trim(),
    password: input.password,
    callbackUrl: input.callbackUrl ?? '/admin',
  });

  const res = await fetch('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'manual',
  });

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('Location') ?? '';
    const errorCode = getErrorFromLocation(location);
    if (errorCode) {
      return { ok: false, errorCode };
    }
    return { ok: true, redirectTo: location || '/admin' };
  }

  if (res.ok) {
    return { ok: true, redirectTo: '/admin' };
  }

  return { ok: false, errorCode: 'Configuration' };
}

export async function signOutAdmin(): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  await fetch('/api/auth/signout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl: '/admin/login',
    }).toString(),
    credentials: 'same-origin',
    redirect: 'manual',
  });
}

export function showAuthError(errorCode: string | null | undefined, fallback = 'Error al iniciar sesión.') {
  if (!errorCode) {
    toast.error(fallback);
    return;
  }
  toast.error(AUTH_ERROR_MESSAGES[errorCode] ?? fallback);
}

export function clearAuthErrorFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('error')) return;
  url.searchParams.delete('error');
  url.searchParams.delete('code');
  window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
}
