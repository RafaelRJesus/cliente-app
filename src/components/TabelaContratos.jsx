import { Link, useNavigate } from 'react-router-dom'
import { formatDate, formatMoney } from '../lib/format'
import { formatarNumeroContrato } from '../lib/numeroContrato'
import { nomeProduto } from '../lib/produtos'
import { StatusBadge } from './StatusBadge'

// linhas: contratos já com situacao e saldo calculados.
export function TabelaContratos({ linhas, mostrarCliente = true }) {
  const navigate = useNavigate()

  return (
    <div className="table-wrap">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Contrato</th>
            {mostrarCliente && <th>Cliente</th>}
            <th>Produto</th>
            <th>Contratação</th>
            <th>Sistema</th>
            <th className="num">Valor</th>
            <th className="num">Saldo devedor</th>
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((c) => (
            <tr key={c.id} onClick={() => navigate(`/contratos/${c.id}`)}>
              <td className="numero-contrato">
                {mostrarCliente ? (
                  formatarNumeroContrato(c)
                ) : (
                  <Link to={`/contratos/${c.id}`} className="row-link">
                    {formatarNumeroContrato(c)}
                  </Link>
                )}
              </td>
              {mostrarCliente && (
                <td>
                  {/* o link dá acesso por teclado e leitor de tela; a linha toda segue clicável */}
                  <Link to={`/contratos/${c.id}`} className="row-link">
                    {c.clienteNome}
                  </Link>
                </td>
              )}
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
  )
}
