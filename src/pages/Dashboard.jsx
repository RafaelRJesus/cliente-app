import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { totaisDosContratos } from '../lib/carteira'
import { formatMoney, today } from '../lib/format'
import { formatarNumeroContrato } from '../lib/numeroContrato'
import {
  composicaoCarteira,
  contratosEmAtraso,
  proximasParcelas,
  quandoVence,
  saldoPorProduto,
  textoAtraso,
} from '../lib/painel'

const MAX_ATRASOS = 5

const SITUACOES = [
  { id: 'em dia', rotulo: () => 'em dia', classe: 'em-dia' },
  { id: 'em atraso', rotulo: () => 'em atraso', classe: 'em-atraso' },
  { id: 'quitado', rotulo: (n) => (n === 1 ? 'quitado' : 'quitados'), classe: 'quitado' },
]

const linkSituacao = (id) => `/contratos?situacao=${encodeURIComponent(id)}`

const dataPorExtenso = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function Dashboard() {
  const { clientes, contratos } = useData()
  const hoje = today()
  const lista = contratos.items

  const painel = useMemo(
    () => ({
      totais: totaisDosContratos(lista, hoje),
      atrasos: contratosEmAtraso(lista, hoje),
      proximas: proximasParcelas(lista, hoje),
      composicao: composicaoCarteira(lista, hoje),
      produtos: saldoPorProduto(lista, hoje),
      comContrato: new Set(lista.map((c) => c.clienteId)).size,
    }),
    [lista, hoje],
  )
  const { totais, atrasos, proximas, composicao, produtos } = painel
  const vazio = !contratos.loading && lista.length === 0
  const maiorSaldo = produtos[0]?.saldo || 1
  const data = dataPorExtenso.format(new Date(`${hoje}T12:00:00`))

  return (
    <>
      <header className="page-header page-header-row">
        <div>
          <h1>Visão geral</h1>
          <p className="primeira-maiuscula">{data}</p>
        </div>
        <div className="acoes">
          <Link to="/clientes" className="btn btn-ghost">
            Cadastrar cliente
          </Link>
          <Link to="/simulador" className="btn btn-primary">
            Nova simulação
          </Link>
        </div>
      </header>

      <div className="kpis kpis-4">
        <div className="kpi">
          <span>A receber</span>
          <strong>{formatMoney(totais.saldo)}</strong>
          <small>de {formatMoney(totais.valorContratado)} contratados</small>
        </div>
        <div className="kpi">
          <span>Contratos ativos</span>
          <strong>{totais.ativos}</strong>
          <small>
            {composicao.quitado} {composicao.quitado === 1 ? 'quitado' : 'quitados'}
          </small>
        </div>
        <div className={totais.parcelasVencidas ? 'kpi kpi-danger' : 'kpi'}>
          <span>Parcelas vencidas</span>
          <strong>{totais.parcelasVencidas}</strong>
          <small>{formatMoney(totais.valorVencido)} em atraso</small>
        </div>
        <div className="kpi">
          <span>Clientes</span>
          <strong>{clientes.items.length}</strong>
          <small>{painel.comContrato} com contrato</small>
        </div>
      </div>

      {!vazio && lista.length > 0 && (
        <section className="card" aria-labelledby="titulo-situacao">
          <h2 id="titulo-situacao">Situação dos contratos</h2>
          <div className="composicao" aria-hidden="true">
            {SITUACOES.map((s) =>
              composicao[s.id] ? (
                <span
                  key={s.id}
                  className={`composicao-${s.classe}`}
                  style={{ flexGrow: composicao[s.id] }}
                />
              ) : null,
            )}
          </div>
          <ul className="legenda">
            {SITUACOES.map((s) => (
              <li key={s.id}>
                <Link to={linkSituacao(s.id)}>
                  <span className={`ponto composicao-${s.classe}`} aria-hidden="true" />
                  <strong>{composicao[s.id]}</strong> {s.rotulo(composicao[s.id])}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={vazio ? undefined : 'painel-grade'}>
        {!vazio && (
          <section className="card" aria-labelledby="titulo-atraso">
            <div className="card-titulo">
              <h2 id="titulo-atraso">Cobrar primeiro</h2>
              {atrasos.length > MAX_ATRASOS && (
                <Link to={linkSituacao('em atraso')}>Ver os {atrasos.length}</Link>
              )}
            </div>
            {atrasos.length === 0 ? (
              <p className="empty">Nenhuma parcela atrasada. A carteira está em dia.</p>
            ) : (
              <ul className="list">
                {atrasos
                  .slice(0, MAX_ATRASOS)
                  .map(({ contrato, parcelas, valor, diasAtraso }) => (
                    <li key={contrato.id} className="list-item">
                      <div>
                        <Link to={`/contratos/${contrato.id}`} className="list-titulo">
                          {contrato.clienteNome}
                        </Link>
                        <span className="muted">
                          {parcelas} {parcelas === 1 ? 'parcela' : 'parcelas'} no contrato{' '}
                          {formatarNumeroContrato(contrato)}
                        </span>
                      </div>
                      <div className="list-valor">
                        <strong className="valor-atraso">{formatMoney(valor)}</strong>
                        <span>{textoAtraso(diasAtraso)}</span>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        )}

        <section className="card" aria-labelledby="titulo-proximos">
          <h2 id="titulo-proximos">Próximos vencimentos</h2>
          {vazio && (
            <p className="empty">
              Nenhum contrato ainda. Comece{' '}
              <Link to="/clientes">cadastrando um cliente</Link> e depois faça uma{' '}
              <Link to="/simulador">simulação</Link>.
            </p>
          )}
          {!vazio && proximas.length === 0 && (
            <p className="empty">Nenhuma parcela a vencer.</p>
          )}
          <ul className="list">
            {proximas.map((p) => (
              <li key={`${p.contrato.id}-${p.numero}`} className="list-item">
                <div>
                  <Link to={`/contratos/${p.contrato.id}`} className="list-titulo">
                    {p.contrato.clienteNome}
                  </Link>
                  <span className="muted">
                    Parcela {p.numero} de {p.contrato.parcelas.length}
                  </span>
                </div>
                <div className="list-valor">
                  <strong>{formatMoney(p.valor)}</strong>
                  <span className={p.diasPara <= 1 ? 'vence-logo' : undefined}>
                    {quandoVence(p.diasPara)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {produtos.length > 0 && (
        <section className="card" aria-labelledby="titulo-produtos">
          <h2 id="titulo-produtos">A receber por produto</h2>
          <table className="por-produto">
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col">Ativos</th>
                <th scope="col">Saldo devedor</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.nome}</th>
                  <td>{p.contratos}</td>
                  <td>
                    <span className="por-produto-valor">{formatMoney(p.saldo)}</span>
                    <span
                      className="por-produto-barra"
                      style={{ width: `${(p.saldo / maiorSaldo) * 100}%` }}
                      aria-hidden="true"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}
