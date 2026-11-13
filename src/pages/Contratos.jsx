import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ConfirmacaoInline } from '../components/ConfirmacaoInline'
import { ParcelasTable } from '../components/ParcelasTable'
import { StatusBadge } from '../components/StatusBadge'
import { TabelaContratos } from '../components/TabelaContratos'
import { TabelaPorCliente } from '../components/TabelaPorCliente'
import { Toast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { carteiraPorCliente, totaisDosContratos } from '../lib/carteira'
import { calcularAtraso, saldoDevedor, situacaoContrato } from '../lib/credito'
import { formatDate, formatMoney, formatPercent, today } from '../lib/format'
import { nomeProduto } from '../lib/produtos'

export function Contratos() {
  const { id } = useParams()
  const { contratos } = useData()
  const contrato = contratos.items.find((c) => c.id === id)

  if (id && contratos.loading) return <p className="empty">Carregando...</p>
  if (id && !contrato) {
    return (
      <p className="empty">
        Contrato não encontrado. <Link to="/contratos">Voltar</Link>
      </p>
    )
  }

  return contrato ? <DetalheContrato contrato={contrato} /> : <ListaContratos />
}

const SITUACOES = ['todos', 'em dia', 'em atraso', 'quitado']

function ListaContratos() {
  const { contratos, clientes } = useData()
  const { equipe } = useAuth()
  const [params, setParams] = useSearchParams()
  const [filtro, setFiltro] = useState('todos')
  const hoje = today()
  // a visão fica na URL para dar para voltar e compartilhar
  const porCliente = equipe && params.get('visao') === 'cliente'

  const linhas = useMemo(
    () =>
      contratos.items.map((c) => ({
        ...c,
        situacao: situacaoContrato(c, hoje),
        saldo: saldoDevedor(c),
      })),
    [contratos.items, hoje],
  )
  const clientesComTotais = useMemo(
    () => (porCliente ? carteiraPorCliente(clientes.items, contratos.items, hoje) : []),
    [porCliente, clientes.items, contratos.items, hoje],
  )
  const totais = useMemo(
    () => totaisDosContratos(contratos.items, hoje),
    [contratos.items, hoje],
  )

  const filtrar = (lista) =>
    filtro === 'todos' ? lista : lista.filter((c) => c.situacao === filtro)
  const visiveis = filtrar(porCliente ? clientesComTotais : linhas)
  const carregando = contratos.loading || (porCliente && clientes.loading)

  return (
    <>
      <header className="page-header page-header-row">
        <div>
          <h1>{equipe ? 'Contratos' : 'Meus contratos'}</h1>
          <p>
            {equipe
              ? 'Carteira de crédito: por contrato ou por cliente.'
              : 'Acompanhe suas parcelas e registre pagamentos.'}
          </p>
        </div>
        <Link to="/simulador" className="btn btn-primary">
          {equipe ? 'Nova simulação' : 'Simular crédito'}
        </Link>
      </header>

      {equipe && (
        <div className="kpis kpis-4">
          <div className="kpi">
            <span>Contratos ativos</span>
            <strong>
              {totais.ativos} de {totais.contratos}
            </strong>
          </div>
          <div className="kpi">
            <span>Valor contratado</span>
            <strong>{formatMoney(totais.valorContratado)}</strong>
          </div>
          <div className="kpi">
            <span>Saldo devedor</span>
            <strong>{formatMoney(totais.saldo)}</strong>
          </div>
          <div className={totais.parcelasVencidas ? 'kpi kpi-danger' : 'kpi'}>
            <span>Parcelas vencidas</span>
            <strong>
              {totais.parcelasVencidas} · {formatMoney(totais.valorVencido)}
            </strong>
          </div>
        </div>
      )}

      <section className="card">
        <div className="barra-filtros">
          <div className="tabs">
            {SITUACOES.map((opcao) => (
              <button
                key={opcao}
                type="button"
                className={filtro === opcao ? 'tab active' : 'tab'}
                onClick={() => setFiltro(opcao)}
              >
                {opcao}
              </button>
            ))}
          </div>
          {equipe && (
            <div className="alternar" role="group" aria-label="Visão da carteira">
              <button
                type="button"
                aria-pressed={!porCliente}
                onClick={() => setParams({}, { replace: true })}
              >
                Por contrato
              </button>
              <button
                type="button"
                aria-pressed={porCliente}
                onClick={() => setParams({ visao: 'cliente' }, { replace: true })}
              >
                Por cliente
              </button>
            </div>
          )}
        </div>

        {carregando && <p className="empty">Carregando...</p>}
        {!carregando && visiveis.length === 0 && (
          <p className="empty">
            {porCliente
              ? 'Nenhum cliente nesta situação.'
              : 'Nenhum contrato nesta situação.'}
          </p>
        )}

        {!carregando &&
          visiveis.length > 0 &&
          (porCliente ? (
            <TabelaPorCliente linhas={visiveis} />
          ) : (
            <TabelaContratos linhas={visiveis} />
          ))}
      </section>
    </>
  )
}

function DetalheContrato({ contrato }) {
  const { contratos } = useData()
  const { equipe } = useAuth()
  const navigate = useNavigate()
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [parcelaSelecionada, setParcelaSelecionada] = useState(null)
  const [dataPagamento, setDataPagamento] = useState(today())
  const [pagando, setPagando] = useState(false)
  const [message, setMessage] = useState(null)

  const hoje = today()
  const pagas = contrato.parcelas.filter((p) => p.pagaEm).length
  const atraso = parcelaSelecionada && calcularAtraso(parcelaSelecionada, dataPagamento)

  function abrirPagamento(parcela) {
    setParcelaSelecionada(parcela)
    setDataPagamento(today())
  }

  async function confirmarPagamento() {
    setPagando(true)
    try {
      const parcelas = contrato.parcelas.map((p) =>
        p.numero === parcelaSelecionada.numero
          ? { ...p, pagaEm: dataPagamento, valorPago: atraso.total }
          : p,
      )
      await contratos.update(contrato.id, { parcelas })
      setMessage({ text: `Parcela ${parcelaSelecionada.numero} paga.` })
      setParcelaSelecionada(null)
    } catch (err) {
      console.error(err)
      setMessage({ text: 'Erro ao registrar o pagamento.', type: 'error' })
    } finally {
      setPagando(false)
    }
  }

  async function excluir() {
    setExcluindo(true)
    try {
      await contratos.remove(contrato.id)
      navigate('/contratos', { replace: true })
    } catch (err) {
      console.error(err)
      setMessage({ text: 'Erro ao excluir o contrato.', type: 'error' })
      setExcluindo(false)
    }
  }

  return (
    <>
      <header className="page-header page-header-row">
        <div>
          <Link to="/contratos" className="back">
            ← Contratos
          </Link>
          <h1>{contrato.clienteNome}</h1>
          <p>
            {nomeProduto(contrato)} · contrato {contrato.id.slice(0, 8).toUpperCase()} ·{' '}
            <StatusBadge status={situacaoContrato(contrato, hoje)} />
          </p>
        </div>
        {equipe && !confirmarExclusao && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmarExclusao(true)}
          >
            Excluir contrato
          </button>
        )}
      </header>

      {confirmarExclusao && (
        <section className="card card-danger">
          <ConfirmacaoInline
            titulo="Excluir este contrato?"
            ocupado={excluindo}
            onConfirmar={excluir}
            onCancelar={() => setConfirmarExclusao(false)}
          >
            O contrato e o histórico de {pagas} parcela(s) paga(s) serão apagados. Essa
            ação não pode ser desfeita.
          </ConfirmacaoInline>
        </section>
      )}

      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="kpis kpis-4">
        <div className="kpi">
          <span>Valor contratado</span>
          <strong>{formatMoney(contrato.valor)}</strong>
        </div>
        <div className="kpi">
          <span>Saldo devedor</span>
          <strong>{formatMoney(saldoDevedor(contrato))}</strong>
        </div>
        <div className="kpi">
          <span>Parcelas pagas</span>
          <strong>
            {pagas} de {contrato.prazo}
          </strong>
        </div>
        <div className="kpi">
          <span>Taxa · CET</span>
          <strong>
            {formatPercent(contrato.taxaMensal)} · {formatPercent(contrato.cetMensal)}
          </strong>
        </div>
      </div>

      <DetalhesProduto contrato={contrato} />

      {parcelaSelecionada && (
        <section className="card card-highlight">
          <h2>Pagamento da parcela {parcelaSelecionada.numero}</h2>
          <div className="pay">
            <div className="field">
              <label htmlFor="dataPagamento">Data do pagamento</label>
              <input
                id="dataPagamento"
                type="date"
                value={dataPagamento}
                min={contrato.dataContratacao}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </div>
            <dl className="resume">
              <div>
                <dt>Vencimento</dt>
                <dd>{formatDate(parcelaSelecionada.vencimento)}</dd>
              </div>
              <div>
                <dt>Valor da parcela</dt>
                <dd>{formatMoney(parcelaSelecionada.valor)}</dd>
              </div>
              <div>
                <dt>Dias em atraso</dt>
                <dd>{atraso.dias}</dd>
              </div>
              <div>
                <dt>Multa (2%)</dt>
                <dd>{formatMoney(atraso.multa)}</dd>
              </div>
              <div>
                <dt>Juros de mora (1% a.m.)</dt>
                <dd>{formatMoney(atraso.juros)}</dd>
              </div>
              <div className="total">
                <dt>Total</dt>
                <dd>{formatMoney(atraso.total)}</dd>
              </div>
            </dl>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={pagando || !dataPagamento}
              onClick={confirmarPagamento}
            >
              {pagando ? 'Registrando...' : 'Confirmar pagamento'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setParcelaSelecionada(null)}
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Parcelas · {contrato.sistema}</h2>
        <ParcelasTable
          parcelas={contrato.parcelas}
          hoje={hoje}
          onPagar={abrirPagamento}
        />
      </section>
    </>
  )
}

function DetalhesProduto({ contrato }) {
  const d = contrato.detalhes
  if (!d || Object.keys(d).length === 0) return null

  const itens = {
    consignado: [
      ['Convênio', d.convenio],
      ['Renda líquida', formatMoney(d.renda)],
    ],
    veiculo: [
      ['Placa', d.placa],
      ['Veículo', `${d.veiculo} (${d.anoModelo})`],
      ['FIPE', `${formatMoney(d.valorFipe)} · ${d.codigoFipe} · ${d.referenciaFipe}`],
    ],
    pix: [
      ['Valor do Pix', formatMoney(d.valorPix)],
      ['IOF financiado', formatMoney(contrato.valor - d.valorPix)],
    ],
    imovel: [
      ['Imóvel', d.tipoImovel],
      ['Valor do imóvel', formatMoney(d.valorImovel)],
    ],
  }[contrato.produto]

  if (!itens) return null
  return (
    <section className="card">
      <h2>Garantia e dados do produto</h2>
      <dl className="resume resume-inline">
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
