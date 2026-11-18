import { collection, doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'
import { montarNumeroContrato } from './numeracao'

export { PREFIXOS, formatarNumeroContrato, montarNumeroContrato } from './numeracao'

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
