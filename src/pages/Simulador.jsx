import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field } from '../components/Field'
import { ParcelasTable } from '../components/ParcelasTable'
import { useData } from '../context/DataContext'
import { simular } from '../lib/credito'
import { formatMoney, formatPercent, today } from '../lib/format'

const LIMITES = { valorMin: 100, valorMax: 1_000_000, prazoMax: 120, taxaMax: 15 }

function validar(params) {
  const errors = {}
  if (!(params.valor >= LIMITES.valorMin && params.valor <= LIMITES.valorMax)) {
    errors.valor = `Entre ${formatMoney(LIMITES.valorMin)} e ${formatMoney(LIMITES.valorMax)}.`
  }
  if (!(params.taxa >= 0 && params.taxa <= LIMITES.taxaMax)) {
    errors.taxa = `Entre 0% e ${LIMITES.taxaMax}% a.m.`
  }
  if (!(
    Number.isInteger(params.prazo) &&
    params.prazo >= 1 &&
    params.prazo <= LIMITES.prazoMax
  )) {
    errors.prazo = `De 1 a ${LIMITES.prazoMax} meses.`
  }
  if (!params.dataContratacao) errors.dataContratacao = 'Informe a data.'
  return errors
}

export function Simulador() {
  const { clientes, contratos } = useData()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    clienteId: '',
    valor: '10000',
    taxa: '2.5',
    prazo: '12',
    sistema: 'PRICE',
    dataContratacao: today(),
  })
  const [salvando, setSalvando] = useState(false)
  const [erroCliente, setErroCliente] = useState('')

  const params = {
    valor: Number(form.valor),
    taxa: Number(form.taxa),
    prazo: Number(form.prazo),
    dataContratacao: form.dataContratacao,
  }
  const errors = validar(params)
  const valido = Object.keys(errors).length === 0

  const resultado = valido
    ? simular({
        valor: params.valor,
        taxaMensal: params.taxa / 100,
        prazo: params.prazo,
        sistema: form.sistema,
        dataContratacao: params.dataContratacao,
      })
    : null

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (name === 'clienteId') setErroCliente('')
  }

  async function contratar() {
    const cliente = clientes.items.find((c) => c.id === form.clienteId)
    if (!cliente) {
      setErroCliente('Selecione o cliente para contratar.')
      return
    }

    setSalvando(true)
    try {
      const contrato = await contratos.add({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        valor: params.valor,
        taxaMensal: params.taxa / 100,
        prazo: params.prazo,
        sistema: form.sistema,
        dataContratacao: params.dataContratacao,
        iof: resultado.iof,
        cetMensal: resultado.cetMensal,
        parcelas: resultado.parcelas,
        criadoEm: new Date().toISOString(),
      })
      navigate(`/contratos/${contrato.id}`)
    } catch (err) {
      console.error(err)
      setErroCliente('Erro ao gravar o contrato.')
      setSalvando(false)
    }
  }

  const fieldErro = (name) => (form[name] === '' ? undefined : errors[name])

  return (
    <>
      <header className="page-header">
        <h1>Simulador de crédito</h1>
        <p>Empréstimo pessoal com tabela Price ou SAC, IOF e CET.</p>
      </header>

      <div className="grid-sim">
        <section className="card">
          <h2>Parâmetros</h2>
          <div className="form">
            <Field
              label="Cliente"
              name="clienteId"
              as="select"
              value={form.clienteId}
              onChange={handleChange}
              error={erroCliente}
            >
              <option value="">Selecione...</option>
              {clientes.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} - {c.cpf}
                </option>
              ))}
            </Field>
            {clientes.items.length === 0 && (
              <p className="muted small">
                Nenhum cliente ainda. <Link to="/clientes">Cadastre um</Link> para
                contratar.
              </p>
            )}

            <Field
              label="Valor solicitado (R$)"
              name="valor"
              type="number"
              min="0"
              step="100"
              value={form.valor}
              onChange={handleChange}
              error={fieldErro('valor')}
            />
            <div className="form-row">
              <Field
                label="Taxa (% a.m.)"
                name="taxa"
                type="number"
                min="0"
                step="0.01"
                value={form.taxa}
                onChange={handleChange}
                error={fieldErro('taxa')}
              />
              <Field
                label="Prazo (meses)"
                name="prazo"
                type="number"
                min="1"
                step="1"
                value={form.prazo}
                onChange={handleChange}
                error={fieldErro('prazo')}
              />
            </div>
            <div className="form-row">
              <Field
                label="Sistema"
                name="sistema"
                as="select"
                value={form.sistema}
                onChange={handleChange}
              >
                <option value="PRICE">Price (parcelas fixas)</option>
                <option value="SAC">SAC (amortização constante)</option>
              </Field>
              <Field
                label="Contratação"
                name="dataContratacao"
                type="date"
                value={form.dataContratacao}
                onChange={handleChange}
                error={errors.dataContratacao}
              />
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Resultado</h2>
          {!resultado ? (
            <p className="empty">Ajuste os parâmetros para ver a simulação.</p>
          ) : (
            <>
              <div className="kpis">
                <div className="kpi">
                  <span>{form.sistema === 'PRICE' ? 'Parcela' : '1ª parcela'}</span>
                  <strong>{formatMoney(resultado.parcelas[0].valor)}</strong>
                </div>
                <div className="kpi">
                  <span>Valor liberado</span>
                  <strong>{formatMoney(resultado.valorLiberado)}</strong>
                </div>
                <div className="kpi">
                  <span>Total a pagar</span>
                  <strong>{formatMoney(resultado.totalPago)}</strong>
                </div>
              </div>

              <dl className="resume">
                <div>
                  <dt>Juros totais</dt>
                  <dd>{formatMoney(resultado.totalJuros)}</dd>
                </div>
                <div>
                  <dt>IOF</dt>
                  <dd>{formatMoney(resultado.iof)}</dd>
                </div>
                <div>
                  <dt>Taxa anual</dt>
                  <dd>{formatPercent((1 + params.taxa / 100) ** 12 - 1)}</dd>
                </div>
                <div>
                  <dt>CET</dt>
                  <dd>
                    {formatPercent(resultado.cetMensal)} a.m. ·{' '}
                    {formatPercent(resultado.cetAnual)} a.a.
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={contratar}
                disabled={salvando}
              >
                {salvando ? 'Gravando...' : 'Contratar'}
              </button>
            </>
          )}
        </section>
      </div>

      {resultado && (
        <section className="card">
          <h2>Cronograma de parcelas</h2>
          <ParcelasTable parcelas={resultado.parcelas} />
        </section>
      )}
    </>
  )
}
