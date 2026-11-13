const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatMoney = (value) => brl.format(value ?? 0)
export const formatPercent = (value) => pct.format(value ?? 0)

export function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const onlyDigits = (value = '') => value.replace(/\D/g, '')

export function maskCpf(value) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(value) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

// Data local no formato AAAA-MM-DD (o mesmo usado nos vencimentos).
export const today = () => new Date().toLocaleDateString('sv-SE')

export const maskCep = (value) =>
  onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')

export function maskPlaca(value) {
  const placa = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7)
  return placa.length > 3 ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa
}
