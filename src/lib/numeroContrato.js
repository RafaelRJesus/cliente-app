import { collection, doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'

// Número do contrato com 13 dígitos: PPP CCCCCCC SSS
//   PPP     = prefixo do produto
//   CCCCCCC = número do cliente
//   SSS     = sequência do contrato daquele cliente (001 a 999)
export const PREFIXOS = {
  pessoal: '101',
  consignado: '102',
  veiculo: '103',
  imovel: '104',
  pix: '105',
}

export function montarNumeroContrato(produto, numeroCliente, sequencia) {
  if (!PREFIXOS[produto]) throw new Error(`Produto sem prefixo: ${produto}`)
  if (!numeroCliente) throw new Error('Cliente sem número.')
  if (sequencia > 999) throw new Error('Cliente chegou ao limite de 999 contratos.')
  return (
    PREFIXOS[produto] +
    String(numeroCliente).padStart(7, '0') +
    String(sequencia).padStart(3, '0')
  )
}

/** 1010000025003 → 101.0000025.003; contrato antigo cai no id curto. */
export function formatarNumeroContrato(contrato) {
  const n = contrato.numeroContrato
  if (!n) return contrato.id.slice(0, 8).toUpperCase()
  return `${n.slice(0, 3)}.${n.slice(3, 10)}.${n.slice(10)}`
}

/** Grava o contrato com o próximo número do cliente, numa transação. */
export async function gravarContratoNumerado(dados) {
  const clienteRef = doc(db, 'clientes', dados.clienteId)
  const contratoRef = doc(collection(db, 'contratos'))
  return runTransaction(db, async (tx) => {
    const cliente = await tx.get(clienteRef)
    if (!cliente.exists()) throw new Error('Cliente não encontrado.')
    const { numero, ultimoContrato = 0 } = cliente.data()
    const sequencia = ultimoContrato + 1
    const numeroContrato = montarNumeroContrato(dados.produto, numero, sequencia)
    tx.update(clienteRef, { ultimoContrato: sequencia })
    const gravado = { ...dados, numeroContrato, sequencia }
    tx.set(contratoRef, gravado)
    return { id: contratoRef.id, ...gravado }
  })
}
