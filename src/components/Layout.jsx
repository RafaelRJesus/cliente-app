import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PAPEIS } from '../lib/perfis'
import { storageMode } from '../lib/store'
import { Logo } from './Logo'

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
  { to: '/usuarios', label: 'Usuários', para: ['admin'] },
  { to: '/gestores', label: 'Gestores', para: ['admin'] },
]

export function Layout() {
  const { perfil, sair } = useAuth()
  const navigate = useNavigate()
  // sem isso, quem sai na Visão geral (/) cairia na página de entrada
  const sairDoApp = async () => {
    await sair()
    navigate('/entrar', { replace: true })
  }
  const links = LINKS.filter((l) => l.para.includes(perfil.papel))

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo />
          <div>
            <strong>Respawn</strong>
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
          <small>{PAPEIS[perfil.papel]}</small>
          <small>{perfil.email}</small>
          <button type="button" className="link-button" onClick={sairDoApp}>
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
