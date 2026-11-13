import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { saldoDevedor, situacaoContrato } from '../lib/credito'
import { formatDate, formatMoney, today } from '../lib/format'

export function Dashboard() {
  const { clientes, contratos } = useData()
  const hoje = today()

  const resumo = useMemo(() => {
    const abertas = contratos.items.flatMap((c) =>
      c.parcelas
        .filter((p) => !p.pagaEm)
        .map((p) => ({ ...p, contratoId: c.id, clienteNome: c.clienteNome })),
    )
    const vencidas = abertas.filter((p) => p.vencimento < hoje)

    return {
      ativos: contratos.items.filter((c) => situacaoContrato(c, hoje) !== 'quitado')
        .length,
      carteira: contratos.items.reduce((acc, c) => acc + saldoDevedor(c), 0),
      vencidas: vencidas.length,
      valorVencido: vencidas.reduce((acc, p) => acc + p.valor, 0),
      proximas: abertas
        .filter((p) => p.vencimento >= hoje)
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
        .slice(0, 6),
    }
  }, [contratos.items, hoje])

  const vazio = !contratos.loading && contratos.items.length === 0

  return (
    <>
      <header className="page-header">
        <h1>Visão geral</h1>
        <p>Resumo da carteira de crédito simulada.</p>
      </header>

      <div className="kpis kpis-4">
        <div className="kpi">
          <span>Clientes</span>
          <strong>{clientes.items.length}</strong>
        </div>
        <div className="kpi">
          <span>Contratos ativos</span>
          <strong>{resumo.ativos}</strong>
        </div>
        <div className="kpi">
          <span>Carteira (saldo devedor)</span>
          <strong>{formatMoney(resumo.carteira)}</strong>
        </div>
        <div className={resumo.vencidas ? 'kpi kpi-danger' : 'kpi'}>
          <span>Parcelas vencidas</span>
          <strong>
            {resumo.vencidas} · {formatMoney(resumo.valorVencido)}
          </strong>
        </div>
      </div>

      <section className="card">
        <h2>Próximos vencimentos</h2>
        {vazio && (
          <p className="empty">
            Nenhum contrato ainda. Comece{' '}
            <Link to="/clientes">cadastrando um cliente</Link> e depois faça uma{' '}
            <Link to="/simulador">simulação</Link>.
          </p>
        )}
        {!vazio && resumo.proximas.length === 0 && (
          <p className="empty">Nenhuma parcela a vencer.</p>
        )}
        <ul className="list">
          {resumo.proximas.map((p) => (
            <li key={`${p.contratoId}-${p.numero}`} className="list-item">
              <div>
                <strong>{p.clienteNome}</strong>
                <span className="muted">
                  Parcela {p.numero} · vence em {formatDate(p.vencimento)}
                </span>
              </div>
              <Link to={`/contratos/${p.contratoId}`} className="amount">
                {formatMoney(p.valor)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
