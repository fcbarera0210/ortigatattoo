export function MobileNav() {
  return (
    <div className="lg:hidden">
      <details className="relative">
        <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center border border-border bg-surface text-ink [&::-webkit-details-marker]:hidden">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Menú</span>
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-2rem))] border border-border bg-surface/95 py-2 shadow-lg backdrop-blur-md">
          <a href="/" className="nav-link block px-4 py-2.5">Inicio</a>
          <a href="/disponibles" className="nav-link block px-4 py-2.5">Disponibles</a>
          <a href="/cuidados" className="nav-link block px-4 py-2.5">Cuidados</a>
          <a href="/mis-reservas" className="nav-link block px-4 py-2.5">Mis reservas</a>
          <a href="/reservar" className="btn-primary mx-2 mt-2 block text-center">
            Reservar
          </a>
        </div>
      </details>
    </div>
  );
}
