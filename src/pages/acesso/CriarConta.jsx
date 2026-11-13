import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field } from '../../components/Field'
import { useAuth } from '../../context/AuthContext'
import { EMAIL_REGEX } from '../../lib/validators'
import { AcessoLayout } from './AcessoLayout'

export function CriarConta() {
  const { criarConta } = useAuth()
  const [form, setForm] = useState({ email: '', senha: '', confirmacao: '' })
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)

  const mudar = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setErros((er) => ({ ...er, [e.target.name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const novos = {}
    if (!EMAIL_REGEX.test(form.email.trim())) novos.email = 'E-mail inválido.'
    if (form.senha.length < 6)
      novos.senha = 'A senha precisa ter pelo menos 6 caracteres.'
    else if (form.senha !== form.confirmacao)
      novos.confirmacao = 'As senhas não conferem.'
    if (Object.keys(novos).length) return setErros(novos)

    setEnviando(true)
    try {
      await criarConta(form.email, form.senha)
    } catch (err) {
      setErros(
        err.code === 'auth/weak-password'
          ? { senha: err.message }
          : { email: err.message },
      )
      setEnviando(false)
    }
  }

  return (
    <AcessoLayout
      titulo="Criar conta"
      subtitulo="Clientes criam a própria conta. Gestores usam o e-mail cadastrado pelo administrador."
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={mudar}
          error={erros.email}
        />
        <Field
          label="Senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          value={form.senha}
          onChange={mudar}
          error={erros.senha}
          hint="Pelo menos 6 caracteres."
        />
        <Field
          label="Repita a senha"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          value={form.confirmacao}
          onChange={mudar}
          error={erros.confirmacao}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
          {enviando ? 'Criando...' : 'Criar conta'}
        </button>
      </form>
      <p className="acesso-links">
        <Link to="/entrar">Já tenho conta</Link>
      </p>
    </AcessoLayout>
  )
}
