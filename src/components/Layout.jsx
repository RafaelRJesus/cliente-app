import { NavLink, Outlet } from 'react-router-dom'
import { storageMode } from '../lib/store'

const links = [
  { to: '/', label: 'Visão geral', end: true },
  { to: '/clientes', label: 'Clientes' },
  { to: '/simulador', label: 'Simulador de crédito' },
  { to: '/contratos', label: 'Contratos' },
]

export function Layout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">R</span>
          <div>
            <strong>RJ Bank</strong>
            <small>ambiente de simulação</small>
          </div>
        </div>

        <nav className="nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <p className="sidebar-footer">
          {storageMode === 'firestore' ? 'Dados no Firestore' : 'Dados no navegador'}
          <br />
          Use apenas dados fictícios.
        </p>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
