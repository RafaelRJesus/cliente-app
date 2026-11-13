import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ParcelasTable } from '../components/ParcelasTable'
import { StatusBadge } from '../components/StatusBadge'
import { Toast } from '../components/Toast'
import { useData } from '../context/DataContext'
import { calcularAtraso, saldoDevedor, situacaoContrato } from '../lib/credito'
import { formatDate, formatMoney, formatPercent, today } from '../lib/format'
import { PRODUTOS } from '../lib/produtos'

const nomeProduto = (c) => PRODUTOS[c.produto ?? 'pessoal']?.nome ?? c.produto

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

function ListaContratos() {
  const { contratos } = useData()
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState('todos')
  const hoje = today()

  const linhas = useMemo(
    () =>
      contratos.items.map((c) => ({
        ...c,
        situacao: situacaoContrato(c, hoje),
        saldo: saldoDevedor(c),
      })),
    [contratos.items, hoje],
  )
  const visiveis =
    filtro === 'todos' ? linhas : linhas.filter((c) => c.situacao === filtro)

  return (
    <>
      <header className="page-header page-header-row">
        <div>
          <h1>Contratos</h1>
          <p>Contratos gerados a partir do simulador.</p>
        </div>
        <Link to="/simulador" className="btn btn-primary">
          Nova simulação
        </Link>
      </header>

      <section className="card">
        <div className="tabs">
          {['todos', 'em dia', 'em atraso', 'quitado'].map((opcao) => (
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

        {contratos.loading && <p className="empty">Carregando...</p>}
        {!contratos.loading && visiveis.length === 0 && (
          <p className="empty">Nenhum contrato nesta situação.</p>
        )}

        {visiveis.length > 0 && (
          <div className="table-wrap">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Produto</th>
                  <th>Contratação</th>
                  <th>Sistema</th>
                  <th className="num">Valor</th>
                  <th className="num">Saldo devedor</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/contratos/${c.id}`)}>
                    <td>{c.clienteNome}</td>
                    <td>{nomeProduto(c)}</td>
                    <td>{formatDate(c.dataContratacao)}</td>
                    <td>
                      {c.sistema} · {c.prazo}x
                    </td>
                    <td className="num">{formatMoney(c.valor)}</td>
                    <td className="num">{formatMoney(c.saldo)}</td>
                    <td>
                      <StatusBadge status={c.situacao} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function DetalheContrato({ contrato }) {
  const { contratos } = useData()
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

  return (
    <>
      <header className="page-header">
        <Link to="/contratos" className="back">
          ← Contratos
        </Link>
        <h1>{contrato.clienteNome}</h1>
        <p>
          {nomeProduto(contrato)} · contrato {contrato.id.slice(0, 8).toUpperCase()} ·{' '}
          <StatusBadge status={situacaoContrato(contrato, hoje)} />
        </p>
      </header>

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
