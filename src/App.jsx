import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { CompletarCadastro } from './pages/acesso/CompletarCadastro'
import { ConfirmarEmail } from './pages/acesso/ConfirmarEmail'
import { CriarConta } from './pages/acesso/CriarConta'
import { Entrar } from './pages/acesso/Entrar'
import { EsqueciSenha } from './pages/acesso/EsqueciSenha'
import { Clientes } from './pages/Clientes'
import { Contratos } from './pages/Contratos'
import { Dashboard } from './pages/Dashboard'
import { Simulador } from './pages/Simulador'

export default function App() {
  const { user, perfil, carregando, equipe, erro, sair } = useAuth()

  if (carregando) return <p className="empty tela-cheia">Carregando...</p>

  if (!user) {
    return (
      <Routes>
        <Route path="entrar" element={<Entrar />} />
        <Route path="criar-conta" element={<CriarConta />} />
        <Route path="esqueci-senha" element={<EsqueciSenha />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    )
  }

  if (!user.verificado) return <ConfirmarEmail />
  if (erro) {
    return (
      <div className="empty tela-cheia">
        <p>
          {erro}{' '}
          <button type="button" className="link-button" onClick={sair}>
            Sair
          </button>
        </p>
      </div>
    )
  }
  if (!perfil) return <CompletarCadastro />

  return (
    <DataProvider key={perfil.uid}>
      <Routes>
        <Route element={<Layout />}>
          <Route
            index
            element={equipe ? <Dashboard /> : <Navigate to="/contratos" replace />}
          />
          {equipe && <Route path="clientes" element={<Clientes />} />}
          <Route path="simulador" element={<Simulador />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="contratos/:id" element={<Contratos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}
