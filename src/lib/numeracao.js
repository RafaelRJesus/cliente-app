// Regras puras de numeração (sem Firebase), usadas pelo app e pela API de massa.

import { CODIGOS_PRODUTO, prefixoDoContrato, RISCO_PADRAO } from './catalogo.js'

// Número do contrato com 13 dígitos: PPP CCCCCCC SSS
//   PPP     = prefixo: 1º dígito é o risco (1 = RSP, 2 = FFC) e os dois
//             seguintes, o produto (01 pessoal ... 05 pix)
//   CCCCCCC = número do cliente
//   SSS     = sequência do contrato daquele cliente (001 a 999)

// Prefixos do risco Respawn (RSP), o padrão. Contratos antigos usam estes.
export const PREFIXOS = Object.fromEntries(
  Object.keys(CODIGOS_PRODUTO).map((produto) => [produto, prefixoDoContrato(produto)]),
)

export function montarNumeroContrato(
  produto,
  numeroCliente,
  sequencia,
  risco = RISCO_PADRAO,
) {
  const prefixo = prefixoDoContrato(produto, risco)
  if (!numeroCliente) throw new Error('Cliente sem número.')
  if (sequencia > 999) throw new Error('Cliente chegou ao limite de 999 contratos.')
  return (
    prefixo + String(numeroCliente).padStart(7, '0') + String(sequencia).padStart(3, '0')
  )
}

/** 1010000025003 → 101.0000025.003; contrato antigo cai no id curto. */
export function formatarNumeroContrato(contrato) {
  const n = contrato.numeroContrato
  if (!n) return contrato.id.slice(0, 8).toUpperCase()
  return `${n.slice(0, 3)}.${n.slice(3, 10)}.${n.slice(10)}`
}

export const formatarNumeroCliente = (numero) =>
  numero ? String(numero).padStart(7, '0') : '—'
