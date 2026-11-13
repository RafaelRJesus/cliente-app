import { onlyDigits } from './format'

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/**
 * Procura cliente pelo nome (sem acento, palavras em qualquer ordem), pelo CPF
 * (com ou sem pontuação, a partir de 3 dígitos) ou pelo número do cliente.
 * Número igual vem primeiro, depois CPF, depois nome.
 */
export function buscarClientes(clientes, termo, limite = Infinity) {
  const busca = normalizar(termo)
  if (!busca) return clientes.slice(0, limite)

  const digitos = onlyDigits(busca)
  const soNumeros = digitos && /^[\d.\-\s/]+$/.test(busca)
  const palavras = busca.split(/\s+/)

  const pontuar = (c) => {
    if (soNumeros) {
      if (c.numero && c.numero === Number(digitos)) return 3
      if (digitos.length >= 3 && onlyDigits(c.cpf).includes(digitos)) return 2
      return 0
    }
    const nome = normalizar(c.nome)
    if (!palavras.every((p) => nome.includes(p))) return 0
    return nome.startsWith(busca) ? 1.5 : 1
  }

  return clientes
    .map((c) => ({ c, pontos: pontuar(c) }))
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.c.nome.localeCompare(b.c.nome))
    .slice(0, limite)
    .map((x) => x.c)
}
