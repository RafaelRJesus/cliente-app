import { useMemo, useState } from 'react'
import { ConfirmacaoInline } from '../components/ConfirmacaoInline'
import { Field } from '../components/Field'
import { Toast } from '../components/Toast'
import { useData } from '../context/DataContext'
import { useCep } from '../hooks/useCep'
import { formatDateTime, maskCep, maskCpf, maskPhone, onlyDigits } from '../lib/format'
import { LIMITES_CLIENTE } from '../lib/limites'
import { validateCliente } from '../lib/validators'

const emptyForm = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
}

const masks = { cpf: maskCpf, telefone: maskPhone, cep: maskCep }

const enderecoResumido = ({ endereco: e }) =>
  e?.cidade ? `${e.logradouro}, ${e.numero} · ${e.cidade}/${e.uf}` : null

export function Clientes() {
  const { clientes, contratos } = useData()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState(null)
  const [confirmandoId, setConfirmandoId] = useState(null)
  const [removendo, setRemovendo] = useState(false)
  const cep = useCep((endereco) => {
    setForm((current) => ({ ...current, ...endereco }))
    setErrors((current) => ({
      ...current,
      cep: undefined,
      logradouro: undefined,
      cidade: undefined,
    }))
  })

  const contratosPorCliente = useMemo(() => {
    const count = {}
    for (const c of contratos.items) count[c.clienteId] = (count[c.clienteId] ?? 0) + 1
    return count
  }, [contratos.items])

  const filtrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return clientes.items
    const digits = onlyDigits(term)
    return clientes.items.filter(
      (c) =>
        c.nome.toLowerCase().includes(term) ||
        (digits && onlyDigits(c.cpf).includes(digits)),
    )
  }, [clientes.items, search])

  function handleChange(event) {
    const { name, value } = event.target
    const mask = masks[name]
    const next = mask ? mask(value) : value
    setForm((current) => ({ ...current, [name]: next }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    if (name === 'cep' && onlyDigits(next).length === 8) cep.consultar(next)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validation = validateCliente(form)
    const cpfJaExiste = clientes.items.some(
      (c) => onlyDigits(c.cpf) === onlyDigits(form.cpf),
    )
    if (!validation.cpf && cpfJaExiste) validation.cpf = 'CPF já cadastrado.'

    if (Object.keys(validation).length) {
      setErrors(validation)
      return
    }

    setSaving(true)
    try {
      await clientes.add({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        telefone: form.telefone,
        cpf: form.cpf,
        endereco: {
          cep: form.cep,
          logradouro: form.logradouro.trim(),
          numero: form.numero.trim(),
          complemento: form.complemento.trim(),
          bairro: form.bairro.trim(),
          cidade: form.cidade.trim(),
          uf: form.uf.trim().toUpperCase(),
        },
        criadoEm: new Date().toISOString(),
      })
      setForm(emptyForm)
      setMessage({ text: 'Cliente cadastrado.' })
    } catch (err) {
      console.error(err)
      setMessage({ text: 'Erro ao salvar o cliente.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(cliente) {
    setRemovendo(true)
    try {
      await clientes.remove(cliente.id)
      setMessage({ text: `${cliente.nome} removido.` })
      setConfirmandoId(null)
    } catch (err) {
      console.error(err)
      setMessage({ text: 'Erro ao remover o cliente.', type: 'error' })
    } finally {
      setRemovendo(false)
    }
  }

  // Sem a lista de contratos carregada não dá para saber se o cliente pode sair.
  const contratosIndisponiveis = contratos.loading || Boolean(contratos.error)

  function motivoBloqueio(qtdContratos) {
    if (contratos.loading) return 'Aguarde: carregando contratos'
    if (contratos.error) return 'Não foi possível verificar os contratos'
    if (qtdContratos > 0) return 'Cliente possui contratos'
    return undefined
  }

  return (
    <>
      <header className="page-header">
        <h1>Clientes</h1>
        <p>Cadastro de clientes para usar nas simulações e contratos.</p>
      </header>

      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="grid-2">
        <section className="card">
          <h2>Novo cliente</h2>
          <form className="form" onSubmit={handleSubmit} noValidate>
            <Field
              label="Nome"
              name="nome"
              maxLength={LIMITES_CLIENTE.nome}
              required
              value={form.nome}
              onChange={handleChange}
              error={errors.nome}
              placeholder="Maria Silva"
            />
            <Field
              label="CPF"
              name="cpf"
              maxLength={LIMITES_CLIENTE.cpf}
              required
              value={form.cpf}
              inputMode="numeric"
              onChange={handleChange}
              error={errors.cpf}
              placeholder="000.000.000-00"
            />
            <div className="form-row">
              <Field
                label="E-mail"
                name="email"
                maxLength={LIMITES_CLIENTE.email}
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="maria@email.com"
              />
              <Field
                label="Telefone"
                name="telefone"
                maxLength={LIMITES_CLIENTE.telefone}
                type="tel"
                required
                value={form.telefone}
                onChange={handleChange}
                error={errors.telefone}
                placeholder="(51) 99999-9999"
              />
            </div>
            <fieldset className="fieldset">
              <legend>Endereço</legend>
              <div className="form-row form-row-cep">
                <Field
                  label="CEP"
                  name="cep"
                  maxLength={LIMITES_CLIENTE.cep}
                  required
                  value={form.cep}
                  inputMode="numeric"
                  onChange={handleChange}
                  error={errors.cep || cep.error}
                  placeholder="00000-000"
                  hint={cep.status === 'loading' ? 'Buscando endereço...' : undefined}
                />
                <Field
                  label="Número"
                  name="numero"
                  maxLength={LIMITES_CLIENTE.numero}
                  required
                  value={form.numero}
                  onChange={handleChange}
                  error={errors.numero}
                />
              </div>
              <Field
                label="Logradouro"
                name="logradouro"
                maxLength={LIMITES_CLIENTE.logradouro}
                required
                value={form.logradouro}
                onChange={handleChange}
                error={errors.logradouro}
              />
              <div className="form-row">
                <Field
                  label="Complemento"
                  name="complemento"
                  maxLength={LIMITES_CLIENTE.complemento}
                  value={form.complemento}
                  onChange={handleChange}
                />
                <Field
                  label="Bairro"
                  name="bairro"
                  maxLength={LIMITES_CLIENTE.bairro}
                  value={form.bairro}
                  onChange={handleChange}
                />
              </div>
              <div className="form-row form-row-uf">
                <Field
                  label="Cidade"
                  name="cidade"
                  maxLength={LIMITES_CLIENTE.cidade}
                  required
                  value={form.cidade}
                  onChange={handleChange}
                  error={errors.cidade}
                />
                <Field
                  label="UF"
                  name="uf"
                  required
                  value={form.uf}
                  maxLength={LIMITES_CLIENTE.uf}
                  onChange={handleChange}
                  error={errors.uf}
                />
              </div>
            </fieldset>

            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setForm(emptyForm)
                  setErrors({})
                }}
              >
                Limpar
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Carteira de clientes</h2>
            <span className="pill">{clientes.items.length}</span>
          </div>

          <input
            className="search"
            type="search"
            placeholder="Buscar por nome ou CPF"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {clientes.loading && <p className="empty">Carregando...</p>}
          {clientes.error && <p className="empty">{clientes.error}</p>}
          {!clientes.loading && !clientes.error && filtrados.length === 0 && (
            <p className="empty">Nenhum cliente encontrado.</p>
          )}

          <ul className="list">
            {filtrados.map((cliente) => {
              const qtdContratos = contratosPorCliente[cliente.id] ?? 0
              return (
                <li key={cliente.id} className="list-item">
                  <div>
                    <strong>{cliente.nome}</strong>
                    <span className="muted">CPF {cliente.cpf}</span>
                    <span className="muted">
                      {cliente.email} · {cliente.telefone}
                    </span>
                    {enderecoResumido(cliente) && (
                      <span className="muted">{enderecoResumido(cliente)}</span>
                    )}
                    <span className="muted small">
                      Desde {formatDateTime(cliente.criadoEm)} · {qtdContratos}{' '}
                      contrato(s)
                    </span>
                  </div>
                  {confirmandoId === cliente.id ? (
                    <ConfirmacaoInline
                      titulo={`Remover ${cliente.nome}?`}
                      ocupado={removendo}
                      rotuloConfirmar="Sim, remover"
                      onConfirmar={() => handleRemove(cliente)}
                      onCancelar={() => setConfirmandoId(null)}
                    >
                      Essa ação não pode ser desfeita.
                    </ConfirmacaoInline>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={contratosIndisponiveis || qtdContratos > 0}
                      title={motivoBloqueio(qtdContratos)}
                      onClick={() => setConfirmandoId(cliente.id)}
                    >
                      Remover
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </>
  )
}
