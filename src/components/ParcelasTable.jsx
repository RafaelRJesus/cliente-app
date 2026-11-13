import { formatDate, formatMoney } from '../lib/format'
import { nomeFormaPagamento } from '../lib/pagamento'
import { StatusBadge } from './StatusBadge'

export function ParcelasTable({ parcelas, hoje, onPagar }) {
  const mostrarStatus = Boolean(hoje)

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Vencimento</th>
            <th className="num">Parcela</th>
            <th className="num">Juros</th>
            <th className="num">Amortização</th>
            <th className="num">Saldo</th>
            {mostrarStatus && <th>Situação</th>}
            {onPagar && <th />}
          </tr>
        </thead>
        <tbody>
          {parcelas.map((p) => {
            const status = p.pagaEm ? 'paga' : p.vencimento < hoje ? 'vencida' : 'aberta'
            return (
              <tr key={p.numero}>
                <td>{p.numero}</td>
                <td>{formatDate(p.vencimento)}</td>
                <td className="num">{formatMoney(p.valor)}</td>
                <td className="num">{formatMoney(p.juros)}</td>
                <td className="num">{formatMoney(p.amortizacao)}</td>
                <td className="num">{formatMoney(p.saldo)}</td>
                {mostrarStatus && (
                  <td>
                    <StatusBadge status={status} />
                    {p.pagaEm && (
                      <span className="muted small">
                        {' '}
                        {formatDate(p.pagaEm)} · {formatMoney(p.valorPago)}
                        {p.formaPagamento && ` · ${nomeFormaPagamento(p.formaPagamento)}`}
                      </span>
                    )}
                  </td>
                )}
                {onPagar && (
                  <td className="num">
                    {!p.pagaEm && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onPagar(p)}
                      >
                        Pagar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
