import { Link, useNavigate } from 'react-router-dom'
import { formatMoney, maskCpf } from '../lib/format'
import { StatusBadge } from './StatusBadge'

// linhas: saída de carteiraPorCliente().
export function TabelaPorCliente({ linhas }) {
  const navigate = useNavigate()

  return (
    <div className="table-wrap">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>CPF</th>
            <th className="num">Contratos</th>
            <th className="num">Valor contratado</th>
            <th className="num">Saldo devedor</th>
            <th className="num">Parcelas vencidas</th>
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} onClick={() => navigate(`/clientes/${l.id}`)}>
              <td>
                <Link to={`/clientes/${l.id}`} className="row-link">
                  {l.nome}
                </Link>
                {!l.cadastrado && <span className="muted small"> (sem cadastro)</span>}
              </td>
              <td>{l.cpf ?? (l.id.length === 11 ? maskCpf(l.id) : '—')}</td>
              <td className="num">
                {l.ativos} de {l.contratos}
              </td>
              <td className="num">{formatMoney(l.valorContratado)}</td>
              <td className="num">{formatMoney(l.saldo)}</td>
              <td className="num">
                {l.parcelasVencidas ? (
                  <span className="texto-perigo">
                    {l.parcelasVencidas} · {formatMoney(l.valorVencido)}
                  </span>
                ) : (
                  0
                )}
              </td>
              <td>
                <StatusBadge status={l.situacao} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
