// Marca do Respawn: a seta de "voltar ao jogo" em volta do ponto de partida.
export function Logo({ className = 'brand-logo' }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path
          d="M17.6 9A6 6 0 1 1 12 6"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="square"
        />
        <path d="M11 2.6 15.2 6 11 9.4Z" fill="currentColor" />
        <rect x="10.4" y="10.4" width="3.2" height="3.2" fill="currentColor" />
      </svg>
    </span>
  )
}
