import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field } from '../../components/Field'
import { useAuth } from '../../context/AuthContext'
import { AcessoLayout } from './AcessoLayout'

export function EsqueciSenha() {
  const { redefinirSenha } = useAuth()
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErro('')
    try {
      await redefinirSenha(email)
      setEnviado(true)
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <AcessoLayout titulo="Esqueci a senha">
      {enviado ? (
        <p role="status">
          Se existir uma conta com {email}, enviamos um link para criar uma senha nova.
        </p>
      ) : (
        <form className="form" onSubmit={handleSubmit} noValidate>
          <Field
            label="E-mail"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={erro}
          />
          <button type="submit" className="btn btn-primary btn-block">
            Enviar link
          </button>
        </form>
      )}
      <p className="acesso-links">
        <Link to="/entrar">Voltar para o login</Link>
      </p>
    </AcessoLayout>
  )
}
