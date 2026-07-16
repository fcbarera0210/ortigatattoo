export function MobileNav() {
  return (
    <div className="lg:hidden">
      <details className="relative">
        <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-border bg-surface text-ink [&::-webkit-details-marker]:hidden">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Menú</span>
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface/95 py-2 shadow-lg backdrop-blur-md">
          <a href="/" className="block px-4 py-2.5 text-sm text-muted hover:text-ink">Inicio</a>
          <a href="/disponibles" className="block px-4 py-2.5 text-sm text-muted hover:text-ink">Disponibles</a>
          <a href="/cuidados" className="block px-4 py-2.5 text-sm text-muted hover:text-ink">Cuidados</a>
          <a href="/mis-reservas" className="block px-4 py-2.5 text-sm text-muted hover:text-ink">Mis reservas</a>
          <a
            href="/reservar"
            className="mx-2 mt-1 block rounded-md bg-ink px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-bg"
          >
            Reservar
          </a>
        </div>
      </details>
    </div>
  );
}
