import { useEffect, useState } from 'react'
import './App.css'
import { clientesRepository } from './services/clientesRepository'

const emptyForm = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  endereco: '',
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function validate(form) {
  const errors = {}

  if (!form.nome.trim()) {
    errors.nome = 'Informe o nome do cliente.'
  }

  if (!form.email.trim()) {
    errors.email = 'Informe o e-mail.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'E-mail inválido.'
  }

  if (!form.telefone.trim()) {
    errors.telefone = 'Informe o telefone.'
  }

  return errors
}

function App() {
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    clientesRepository
      .list()
      .then((lista) => {
        if (active) setClientes(lista)
      })
      .catch((error) => {
        console.error(error)
        if (active) setLoadError('Não foi possível carregar os clientes.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(timer)
  }, [message])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validation = validate(form)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    const novoCliente = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      cpf: form.cpf.trim(),
      endereco: form.endereco.trim(),
      criadoEm: new Date().toISOString(),
    }

    setSaving(true)
    try {
      const salvo = await clientesRepository.add(novoCliente)
      setClientes((current) => [salvo, ...current])
      setForm(emptyForm)
      setErrors({})
      setMessage('Cliente cadastrado com sucesso!')
    } catch (error) {
      console.error(error)
      setMessage('Erro ao salvar o cliente. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id) {
    try {
      await clientesRepository.remove(id)
      setClientes((current) => current.filter((cliente) => cliente.id !== id))
      setMessage('Cliente removido.')
    } catch (error) {
      console.error(error)
      setMessage('Erro ao remover o cliente.')
    }
  }

  function handleClearForm() {
    setForm(emptyForm)
    setErrors({})
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Cadastro de Clientes</h1>
        <p>Preencha o formulário para registrar novos clientes.</p>
        <p className="notice">
          Projeto de demonstração: use apenas dados fictícios.{' '}
          <span className="badge">
            {clientesRepository.mode === 'firestore'
              ? 'Salvando no Firestore'
              : 'Salvando no navegador'}
          </span>
        </p>
      </header>

      <div className="layout">
        <section className="card">
          <h2>Novo cliente</h2>
          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="nome">Nome *</label>
              <input
                id="nome"
                name="nome"
                type="text"
                value={form.nome}
                onChange={handleChange}
                className={errors.nome ? 'error' : ''}
                placeholder="Ex.: Maria Silva"
              />
              {errors.nome && <p className="error-text">{errors.nome}</p>}
            </div>

            <div className="field">
              <label htmlFor="email">E-mail *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="Ex.: maria@email.com"
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div className="field">
              <label htmlFor="telefone">Telefone *</label>
              <input
                id="telefone"
                name="telefone"
                type="tel"
                value={form.telefone}
                onChange={handleChange}
                className={errors.telefone ? 'error' : ''}
                placeholder="Ex.: (11) 99999-9999"
              />
              {errors.telefone && (
                <p className="error-text">{errors.telefone}</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="cpf">CPF</label>
              <input
                id="cpf"
                name="cpf"
                type="text"
                value={form.cpf}
                onChange={handleChange}
                placeholder="Ex.: 123.456.789-00"
              />
            </div>

            <div className="field">
              <label htmlFor="endereco">Endereço</label>
              <textarea
                id="endereco"
                name="endereco"
                rows={3}
                value={form.endereco}
                onChange={handleChange}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            <div className="actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearForm}
              >
                Limpar
              </button>
            </div>

            {message && <p className="toast">{message}</p>}
          </form>
        </section>

        <section className="card">
          <div className="list-header">
            <h2>Clientes cadastrados</h2>
            <span className="badge">{clientes.length}</span>
          </div>

          {loading ? (
            <div className="empty">Carregando clientes...</div>
          ) : loadError ? (
            <div className="empty">{loadError}</div>
          ) : clientes.length === 0 ? (
            <div className="empty">
              Nenhum cliente cadastrado ainda. Use o formulário ao lado.
            </div>
          ) : (
            <ul className="cliente-list">
              {clientes.map((cliente) => (
                <li key={cliente.id} className="cliente-item">
                  <h3>{cliente.nome}</h3>
                  <p>{cliente.email}</p>
                  <p>{cliente.telefone}</p>
                  {cliente.cpf && <p>CPF: {cliente.cpf}</p>}
                  {cliente.endereco && <p>{cliente.endereco}</p>}
                  <footer>
                    <time dateTime={cliente.criadoEm}>
                      Cadastrado em {formatDate(cliente.criadoEm)}
                    </time>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleRemove(cliente.id)}
                    >
                      Remover
                    </button>
                  </footer>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default App
