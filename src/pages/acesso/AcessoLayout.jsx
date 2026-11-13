export function AcessoLayout({ titulo, subtitulo, children }) {
  return (
    <div className="acesso">
      <div className="acesso-card card">
        <div className="brand brand-claro">
          <span className="brand-logo">R</span>
          <div>
            <strong>RJ Bank</strong>
            <small>ambiente de simulação</small>
          </div>
        </div>
        <h1>{titulo}</h1>
        {subtitulo && <p className="muted">{subtitulo}</p>}
        {children}
      </div>
    </div>
  )
}
