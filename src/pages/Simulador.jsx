import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field } from '../components/Field'
import { ParcelasTable } from '../components/ParcelasTable'
import { GarantiaImovel } from '../components/simulador/GarantiaImovel'
import { GarantiaVeiculo } from '../components/simulador/GarantiaVeiculo'
import { useData } from '../context/DataContext'
import { useTaxasMercado } from '../hooks/useTaxasMercado'
import { simular } from '../lib/credito'
import { formatDate, formatMoney, formatPercent, lerNumero, today } from '../lib/format'
import { PRODUTOS, referenciaBcb, validarProduto } from '../lib/produtos'
import { isValidPlaca } from '../lib/validators'

const formInicial = {
  clienteId: '',
  produto: 'pessoal',
  convenio: 'inss',
  renda: '',
  valor: '10000',
  taxa: String(PRODUTOS.pessoal.taxaPadrao),
  prazo: '12',
  sistema: 'PRICE',
  dataContratacao: today(),
}

export function Simulador() {
  const { clientes, contratos } = useData()
  const mercado = useTaxasMercado()
  const navigate = useNavigate()
  const [form, setForm] = useState(formInicial)
  const [garantia, setGarantia] = useState({})
  const [taxaManual, setTaxaManual] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroContratar, setErroContratar] = useState('')

  const regra = PRODUTOS[form.produto]
  const referencia = mercado.taxas?.[referenciaBcb(form.produto, form.convenio)]
  const taxaSugerida = referencia?.mediana ?? regra.taxaPadrao
  const taxa = taxaManual ? lerNumero(form.taxa) : taxaSugerida

  const params = {
    valor: lerNumero(form.valor),
    prazo: lerNumero(form.prazo),
    taxa,
    dataContratacao: form.dataContratacao,
  }

  const parametrosBasicosOk =
    params.valor > 0 &&
    Number.isInteger(params.prazo) &&
    params.prazo > 0 &&
    taxa != null &&
    taxa >= 0 &&
    Boolean(form.dataContratacao)
  const resultado = parametrosBasicosOk
    ? simular({
        valor: params.valor,
        taxaMensal: taxa / 100,
        prazo: params.prazo,
        sistema: form.sistema,
        dataContratacao: form.dataContratacao,
        iofFinanciado: Boolean(regra.iofFinanciado),
      })
    : null

  const errors = validarProduto({
    produto: form.produto,
    valor: params.valor,
    prazo: params.prazo,
    taxa,
    primeiraParcela: resultado?.parcelas[0].valor ?? 0,
    garantia: {
      ...garantia,
      valorImovel: Number(garantia.valorImovel) || undefined,
    },
    consignado: { renda: lerNumero(form.renda) },
  })
  if (form.produto === 'veiculo' && !isValidPlaca(garantia.placa)) {
    errors.placa = 'Informe uma placa válida.'
  }
  const podeContratar = resultado && Object.keys(errors).length === 0

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErroContratar('')
  }

  function trocarProduto(produto) {
    setForm((current) => ({
      ...current,
      produto,
      prazo: String(Math.min(Number(current.prazo) || 12, PRODUTOS[produto].prazoMax)),
    }))
    setGarantia({})
    setTaxaManual(false)
    setErroContratar('')
  }

  async function contratar() {
    const cliente = clientes.items.find((c) => c.id === form.clienteId)
    if (!cliente) {
      setErroContratar('Selecione o cliente para contratar.')
      return
    }

    setSalvando(true)
    try {
      const contrato = await contratos.add({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        produto: form.produto,
        detalhes: detalhesDoProduto(form, garantia, params),
        valor: resultado.valorFinanciado,
        taxaMensal: taxa / 100,
        prazo: params.prazo,
        sistema: form.sistema,
        dataContratacao: form.dataContratacao,
        iof: resultado.iof,
        cetMensal: resultado.cetMensal,
        parcelas: resultado.parcelas,
        criadoEm: new Date().toISOString(),
      })
      navigate(`/contratos/${contrato.id}`)
    } catch (err) {
      console.error(err)
      setErroContratar('Erro ao gravar o contrato.')
      setSalvando(false)
    }
  }

  const erroVisivel = (name) => (form[name] === '' ? undefined : errors[name])

  return (
    <>
      <header className="page-header">
        <h1>Simulador de crédito</h1>
        <p>Escolha o produto, ajuste os parâmetros e gere o contrato.</p>
      </header>

      <div className="produtos" role="tablist">
        {Object.entries(PRODUTOS).map(([id, p]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={form.produto === id}
            className={form.produto === id ? 'produto active' : 'produto'}
            onClick={() => trocarProduto(id)}
          >
            <strong>{p.nome}</strong>
            <span>{p.descricao}</span>
          </button>
        ))}
      </div>

      <div className="grid-sim">
        <section className="card">
          <h2>Parâmetros · {regra.nome}</h2>
          <div className="form">
            <Field
              label="Cliente"
              name="clienteId"
              as="select"
              value={form.clienteId}
              onChange={handleChange}
              error={erroContratar}
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

            {form.produto === 'consignado' && (
              <div className="form-row">
                <Field
                  label="Convênio"
                  name="convenio"
                  as="select"
                  value={form.convenio}
                  onChange={handleChange}
                >
                  {Object.entries(PRODUTOS.consignado.convenios).map(([id, c]) => (
                    <option key={id} value={id}>
                      {c.nome}
                    </option>
                  ))}
                </Field>
                <Field
                  label="Renda líquida (R$)"
                  name="renda"
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={form.renda}
                  onChange={handleChange}
                  error={erroVisivel('renda')}
                  hint={
                    Number(form.renda) > 0
                      ? `Margem de ${PRODUTOS.consignado.margem * 100}%: ${formatMoney(Number(form.renda) * PRODUTOS.consignado.margem)}`
                      : undefined
                  }
                />
              </div>
            )}

            {form.produto === 'veiculo' && (
              <GarantiaVeiculo
                garantia={garantia}
                onChange={setGarantia}
                erro={garantia.placa ? errors.garantia : undefined}
              />
            )}

            {form.produto === 'imovel' && (
              <GarantiaImovel
                garantia={garantia}
                onChange={setGarantia}
                erro={garantia.valorImovel ? errors.garantia : undefined}
              />
            )}

            <Field
              label={
                form.produto === 'pix' ? 'Valor do Pix (R$)' : 'Valor solicitado (R$)'
              }
              name="valor"
              type="number"
              min="0"
              step="100"
              value={form.valor}
              onChange={handleChange}
              error={erroVisivel('valor')}
            />
            <div className="form-row">
              <Field
                label="Taxa (% a.m.)"
                name="taxa"
                type="number"
                min="0"
                step="0.01"
                value={taxaManual ? form.taxa : String(taxaSugerida)}
                onChange={(e) => {
                  setTaxaManual(true)
                  handleChange(e)
                }}
                error={errors.taxa}
              />
              <Field
                label={`Prazo (até ${regra.prazoMax} meses)`}
                name="prazo"
                type="number"
                min="1"
                step="1"
                value={form.prazo}
                onChange={handleChange}
                error={erroVisivel('prazo')}
              />
            </div>
            <ReferenciaMercado
              mercado={mercado}
              referencia={referencia}
              obs={regra.referenciaObs}
              taxaManual={taxaManual}
              onUsar={() => setTaxaManual(false)}
            />

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
                  <span>
                    {form.produto === 'pix' ? 'Valor enviado' : 'Valor liberado'}
                  </span>
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
                  <dt>{regra.iofFinanciado ? 'IOF (financiado)' : 'IOF'}</dt>
                  <dd>{formatMoney(resultado.iof)}</dd>
                </div>
                {regra.iofFinanciado && (
                  <div>
                    <dt>Valor financiado (Pix + IOF)</dt>
                    <dd>{formatMoney(resultado.valorFinanciado)}</dd>
                  </div>
                )}
                <div>
                  <dt>Taxa anual</dt>
                  <dd>{formatPercent((1 + taxa / 100) ** 12 - 1)}</dd>
                </div>
                <div>
                  <dt>CET</dt>
                  <dd>
                    {formatPercent(resultado.cetMensal)} a.m. ·{' '}
                    {formatPercent(resultado.cetAnual)} a.a.
                  </dd>
                </div>
              </dl>

              {!podeContratar && (
                <ul className="pendencias">
                  {Object.values(errors).map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={contratar}
                disabled={salvando || !podeContratar}
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

function ReferenciaMercado({ mercado, referencia, obs, taxaManual, onUsar }) {
  if (mercado.carregando)
    return <p className="field-hint">Buscando taxas no Banco Central...</p>
  if (mercado.erro) {
    return (
      <p className="field-hint">
        Banco Central não respondeu; usando a taxa padrão do produto.{' '}
        <button type="button" className="link-button" onClick={mercado.tentarDeNovo}>
          Tentar de novo
        </button>
      </p>
    )
  }
  if (!referencia) return null

  return (
    <div className="referencia">
      <span>
        Mercado (Banco Central,{' '}
        {referencia.periodo.includes('-')
          ? formatPeriodo(referencia.periodo)
          : referencia.periodo}
        ): mediana <strong>{taxaBr(referencia.mediana)}% a.m.</strong> entre{' '}
        {referencia.instituicoes} instituições · menor {taxaBr(referencia.menor)}% · maior{' '}
        {taxaBr(referencia.maior)}%
      </span>
      {obs && <span className="muted small">{obs}</span>}
      {taxaManual && (
        <button type="button" className="link-button" onClick={onUsar}>
          Usar taxa de mercado
        </button>
      )}
    </div>
  )
}

const taxaBr = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const formatPeriodo = (periodo) =>
  periodo
    .split(' a ')
    .map((d) => formatDate(d))
    .join(' a ')

function detalhesDoProduto(form, garantia, params) {
  if (form.produto === 'consignado') {
    return {
      convenio: PRODUTOS.consignado.convenios[form.convenio].nome,
      renda: Number(form.renda),
    }
  }
  if (form.produto === 'veiculo') {
    return {
      placa: garantia.placa,
      veiculo: garantia.descricao,
      anoModelo: garantia.anoModelo,
      codigoFipe: garantia.codigoFipe,
      valorFipe: garantia.valorFipe,
      referenciaFipe: garantia.mesReferencia,
    }
  }
  if (form.produto === 'pix') {
    return { valorPix: params.valor, iofFinanciado: true }
  }
  if (form.produto === 'imovel') {
    return {
      tipoImovel: garantia.tipoImovel ?? 'Casa',
      valorImovel: Number(garantia.valorImovel),
    }
  }
  return {}
}
