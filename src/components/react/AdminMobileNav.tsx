import { useEffect, useRef, useState } from 'react';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/agenda', label: 'Agenda' },
  { href: '/admin/servicios', label: 'Servicios' },
  { href: '/admin/flash', label: 'Flash' },
  { href: '/admin/disponibilidad', label: 'Disponibilidad' },
  { href: '/admin/clientes', label: 'Clientes' },
  { href: '/admin/galeria', label: 'Galería' },
  { href: '/admin/cuidados', label: 'Cuidados' },
  { href: '/admin/configuracion', label: 'Config' },
  { href: '/', label: 'Sitio público', muted: true },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AdminMobileNavProps = {
  pathname: string;
};

export function AdminMobileNav({ pathname }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/csrf', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken ?? ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative lg:hidden">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center border border-border bg-surface text-ink"
        aria-expanded={open}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-2rem))] border border-border bg-surface/95 py-2 shadow-lg backdrop-blur-md">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={
                isActive(pathname, link.href)
                  ? 'admin-nav-link admin-nav-link-active block'
                  : link.muted
                    ? 'admin-nav-link block text-muted'
                    : 'admin-nav-link block'
              }
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}

          <form method="post" action="/api/auth/signout" className="mt-2 border-t border-border px-1 pt-1">
            {csrfToken && <input type="hidden" name="csrfToken" value={csrfToken} />}
            <input type="hidden" name="callbackUrl" value="/admin/login" />
            <button
              type="submit"
              disabled={!csrfToken}
              className="admin-nav-link block w-full text-left text-danger disabled:opacity-50"
            >
              Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
