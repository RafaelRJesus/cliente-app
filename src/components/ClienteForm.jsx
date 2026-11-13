import { useState } from 'react'
import { useCep } from '../hooks/useCep'
import { maskCep, maskCpf, maskPhone, onlyDigits } from '../lib/format'
import { LIMITES_CLIENTE } from '../lib/limites'
import { validateCliente } from '../lib/validators'
import { Field } from './Field'

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

// Formulário de cadastro usado pela equipe (tela Clientes) e pelo cliente que
// cria a própria conta. `validar` acrescenta checagens de quem usa (ex.: CPF
// repetido) e `onSalvar` recebe o cliente já no formato gravado.
export function ClienteForm({
  inicial = {},
  travados = [],
  validar = () => ({}),
  onSalvar,
  rotuloEnviar = 'Cadastrar',
  limparDepois = true,
}) {
  const [form, setForm] = useState({ ...emptyForm, ...inicial })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const cep = useCep((endereco) => {
    setForm((current) => ({ ...current, ...endereco }))
    setErrors((current) => ({
      ...current,
      cep: undefined,
      logradouro: undefined,
      cidade: undefined,
    }))
  })

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
    for (const [campo, msg] of Object.entries(validar(form))) {
      if (!validation[campo]) validation[campo] = msg
    }
    if (Object.keys(validation).length) {
      setErrors(validation)
      return
    }

    setSaving(true)
    try {
      const erros = await onSalvar({
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
      if (erros) setErrors(erros)
      else if (limparDepois) setForm({ ...emptyForm, ...inicial })
    } finally {
      setSaving(false)
    }
  }

  return (
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
        readOnly={travados.includes('cpf')}
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
          readOnly={travados.includes('email')}
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
          {saving ? 'Salvando...' : rotuloEnviar}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setForm({ ...emptyForm, ...inicial })
            setErrors({})
          }}
        >
          Limpar
        </button>
      </div>
    </form>
  )
}
