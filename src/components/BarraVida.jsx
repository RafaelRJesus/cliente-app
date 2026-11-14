const MAX_BLOCOS = 48

// Barra de progresso em blocos, como a barra de vida de um jogo: cada bloco
// é uma parcela (ou um grupo delas, em contratos longos).
export function BarraVida({ pagas, total, rotulo, className = '' }) {
  const blocos = Math.max(1, Math.min(total, MAX_BLOCOS))
  let cheios = total > 0 ? Math.round((pagas / total) * blocos) : 0
  if (pagas > 0 && cheios === 0) cheios = 1
  if (pagas < total && cheios === blocos) cheios = blocos - 1

  return (
    <div
      className={`vida ${className}`.trim()}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={pagas}
      aria-valuetext={`${pagas} de ${total} parcelas pagas`}
      style={{ '--blocos': blocos }}
    >
      {Array.from({ length: blocos }, (_, i) => (
        <span key={i} className={i < cheios ? 'cheio' : undefined} />
      ))}
    </div>
  )
}
