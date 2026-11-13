import { onlyDigits } from './format'

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

  return errors
}
