import { useEffect, useState } from 'react'
import { ConfirmacaoInline } from '../components/ConfirmacaoInline'
import { Field } from '../components/Field'
import { Toast } from '../components/Toast'
import { formatDateTime } from '../lib/format'
import { perfis } from '../lib/perfis'
import { EMAIL_REGEX } from '../lib/validators'

// Só o admin chega aqui. Cadastrar um gestor = liberar o e-mail dele; a pessoa
// cria a conta com esse e-mail e, depois de confirmar, entra como gestor.
export function Gestores() {
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState({ nome: '', email: '' })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState(null)
  const [message, setMessage] = useState(null)

  const [versao, setVersao] = useState(0)
  const recarregar = () => setVersao((v) => v + 1)

  useEffect(() => {
    let ativo = true
    perfis
      .listarGestores()
      .then((gestores) => {
        if (ativo) setLista(gestores.sort((a, b) => a.nome.localeCompare(b.nome)))
      })
      .catch((err) => {
        console.error(err)
        if (ativo)
          setMessage({ text: 'Não foi possível carregar os gestores.', type: 'error' })
      })
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [versao])

  const mudar = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setErros((er) => ({ ...er, [e.target.name]: undefined }))
  }

  async function cadastrar(event) {
    event.preventDefault()
    const email = form.email.trim().toLowerCase()
    const novos = {}
    if (!form.nome.trim()) novos.nome = 'Informe o nome.'
    if (!EMAIL_REGEX.test(email)) novos.email = 'E-mail inválido.'
    else if (lista.some((g) => g.email === email))
      novos.email = 'Esse e-mail já é gestor.'
    if (Object.keys(novos).length) return setErros(novos)

    setSalvando(true)
    try {
      await perfis.convidarGestor(email, form.nome.trim())
      setForm({ nome: '', email: '' })
      setMessage({
        text: 'Gestor cadastrado. Peça para ele criar a conta com esse e-mail.',
      })
      recarregar()
    } catch (err) {
      console.error(err)
      setMessage({ text: 'Erro ao cadastrar o gestor.', type: 'error' })
    } finally {
      setSalvando(false)
    }
  }

  async function remover(email) {
    try {
      await perfis.removerGestor(email)
      setMessage({ text: 'Gestor removido.' })
      setRemovendo(null)
      recarregar()
    } catch (err) {
      console.error(err)
      setMessage({ text: 'Erro ao remover o gestor.', type: 'error' })
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>Gestores</h1>
        <p>Quem pode ver e cuidar de toda a carteira. Só o administrador cadastra.</p>
      </header>

      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="grid-2">
        <section className="card">
          <h2>Novo gestor</h2>
          <form className="form" onSubmit={cadastrar} noValidate>
            <Field
              label="Nome"
              name="nome"
              maxLength={120}
              required
              value={form.nome}
              onChange={mudar}
              error={erros.nome}
            />
            <Field
              label="E-mail"
              name="email"
              type="email"
              maxLength={160}
              required
              value={form.email}
              onChange={mudar}
              error={erros.email}
              hint="A pessoa cria a conta com este e-mail e entra como gestor."
            />
            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Cadastrar gestor'}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Gestores cadastrados</h2>
            <span className="pill">{lista.length}</span>
          </div>
          {carregando && <p className="empty">Carregando...</p>}
          {!carregando && lista.length === 0 && (
            <p className="empty">Nenhum gestor cadastrado.</p>
          )}
          <ul className="list">
            {lista.map((g) => (
              <li key={g.email} className="list-item">
                <div>
                  <strong>{g.nome}</strong>
                  <span className="muted">{g.email}</span>
                  <span className="muted small">Desde {formatDateTime(g.criadoEm)}</span>
                </div>
                {removendo === g.email ? (
                  <ConfirmacaoInline
                    titulo={`Remover ${g.nome}?`}
                    rotuloConfirmar="Sim, remover"
                    onConfirmar={() => remover(g.email)}
                    onCancelar={() => setRemovendo(null)}
                  >
                    Ele perde o acesso à carteira na hora.
                  </ConfirmacaoInline>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setRemovendo(g.email)}
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
