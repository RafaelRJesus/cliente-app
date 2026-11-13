const variants = {
  'em dia': 'ok',
  quitado: 'neutral',
  'em atraso': 'danger',
  paga: 'ok',
  aberta: 'neutral',
  vencida: 'danger',
  ativo: 'ok',
  bloqueado: 'danger',
  pronta: 'ok',
  importada: 'ok',
  ignorada: 'neutral',
  'com erro': 'danger',
}

export function StatusBadge({ status }) {
  return (
    <span className={`status status-${variants[status] ?? 'neutral'}`}>{status}</span>
  )
}
