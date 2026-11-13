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

// Campo de formulário -> número. Vazio ou inválido vira null (nunca 0).
export function lerNumero(value) {
  if (value == null || String(value).trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/
const MES_ABREVIADO = /^([A-Za-zÀ-ú]{3})-(\d{4})$/

// O Banco Central publica dois formatos de período:
// semanal "2026-10-23 a 2026-10-29" e mensal "Set-2026".
export function formatPeriodoReferencia(periodo) {
  const datas = periodo.split(' a ')
  if (datas.every((d) => DATA_ISO.test(d))) return datas.map(formatDate).join(' a ')

  const mensal = periodo.match(MES_ABREVIADO)
  if (mensal) return `${mensal[1].toLowerCase()}/${mensal[2]}`

  return periodo
}
