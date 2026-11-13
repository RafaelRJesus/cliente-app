import { onlyDigits } from './format'
import { LIMITES_CLIENTE } from './limites'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidCpf(value) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  const digit = (length) => {
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (length + 1 - i)
    }
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export function isValidPhone(value) {
  const digits = onlyDigits(value)
  return digits.length === 10 || digits.length === 11
}

export function validateCliente(form) {
  const errors = {}

  if (!form.nome.trim()) errors.nome = 'Informe o nome.'

  if (!form.email.trim()) errors.email = 'Informe o e-mail.'
  else if (!EMAIL_REGEX.test(form.email)) errors.email = 'E-mail inválido.'

  if (!form.telefone.trim()) errors.telefone = 'Informe o telefone.'
  else if (!isValidPhone(form.telefone)) errors.telefone = 'Telefone inválido.'

  if (!form.cpf.trim()) errors.cpf = 'Informe o CPF.'
  else if (!isValidCpf(form.cpf)) errors.cpf = 'CPF inválido.'

  if (!isValidCep(form.cep)) errors.cep = 'CEP inválido.'
  if (!form.logradouro?.trim()) errors.logradouro = 'Informe o logradouro.'
  if (!form.numero?.trim()) errors.numero = 'Informe o número.'
  if (!form.cidade?.trim()) errors.cidade = 'Informe a cidade.'
  if (!/^[A-Za-z]{2}$/.test(form.uf ?? '')) errors.uf = 'UF inválida.'

  // Segunda barreira além do maxLength dos inputs (ex.: valor colado por script).
  for (const [campo, max] of Object.entries(LIMITES_CLIENTE)) {
    if (!errors[campo] && (form[campo] ?? '').length > max) {
      errors[campo] = `Máximo de ${max} caracteres.`
    }
  }

  return errors
}

// Placa antiga (ABC1234) ou Mercosul (ABC1D23).
const PLACA_REGEX = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/

export const normalizarPlaca = (value = '') =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '')

export const isValidPlaca = (value) => PLACA_REGEX.test(normalizarPlaca(value))

export const tipoPlaca = (value) => {
  const placa = normalizarPlaca(value)
  if (!isValidPlaca(placa)) return null
  return /\d/.test(placa[4]) ? 'antiga' : 'Mercosul'
}

export const isValidCep = (value) => onlyDigits(value).length === 8
