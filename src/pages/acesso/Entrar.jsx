import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field } from '../../components/Field'
import { useAuth } from '../../context/AuthContext'
import { ADMIN_LOCAL } from '../../lib/auth'
import { storageMode } from '../../lib/store'
import { AcessoLayout } from './AcessoLayout'
import { BotaoGoogle } from './BotaoGoogle'

export function Entrar() {
  const { entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await entrar(email, senha)
    } catch (err) {
      setErro(err.message)
      setEnviando(false)
    }
  }

  return (
    <AcessoLayout titulo="Entrar" subtitulo="Use o e-mail e a senha da sua conta.">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          error={erro}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <BotaoGoogle />
      <p className="acesso-links">
        <Link to="/criar-conta">Criar conta</Link>
        <Link to="/esqueci-senha">Esqueci a senha</Link>
      </p>
      {storageMode === 'local' && (
        <p className="muted small">
          Modo local (sem Firebase): entre com {ADMIN_LOCAL.email} / {ADMIN_LOCAL.senha}
        </p>
      )}
    </AcessoLayout>
  )
}
