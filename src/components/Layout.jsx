import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PAPEIS } from '../lib/perfis'
import { storageMode } from '../lib/store'

const LINKS = [
  { to: '/', label: 'Visão geral', end: true, para: ['admin', 'gestor'] },
  { to: '/clientes', label: 'Clientes', para: ['admin', 'gestor'] },
  {
    to: '/simulador',
    label: 'Simulador de crédito',
    para: ['admin', 'gestor', 'cliente'],
  },
  { to: '/contratos', label: 'Contratos', para: ['admin', 'gestor'] },
  { to: '/contratos', label: 'Meus contratos', para: ['cliente'] },
  { to: '/gestores', label: 'Gestores', para: ['admin'] },
]

export function Layout() {
  const { perfil, sair } = useAuth()
  const links = LINKS.filter((l) => l.para.includes(perfil.papel))

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
            <NavLink key={link.label} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="usuario">
          <strong>{perfil.nome}</strong>
          <small>
            {PAPEIS[perfil.papel]} · {perfil.email}
          </small>
          <button type="button" className="link-button" onClick={sair}>
            Sair
          </button>
        </div>

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
