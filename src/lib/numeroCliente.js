import { doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'

// Número do cliente: sequencial e único, guardado em contadores/clientes.
// O cliente e o contador são gravados na mesma transação; as regras do
// Firestore conferem que o número é exatamente o próximo.

const CONTADOR = 'rjbank:contador-clientes'

export const formatarNumeroCliente = (numero) =>
  numero ? String(numero).padStart(7, '0') : '—'

/** Grava um cadastro novo (id = CPF) já com o próximo número. */
export async function gravarClienteNumerado(cpf, dados) {
  const contador = doc(db, 'contadores', 'clientes')
  return runTransaction(db, async (tx) => {
    const atual = await tx.get(contador)
    const numero = (atual.exists() ? atual.data().ultimo : 0) + 1
    tx.set(contador, { ultimo: numero })
    // set num CPF que já existe vira alteração, e as regras recusam
    tx.set(doc(db, 'clientes', cpf), { ...dados, numero })
    return numero
  })
}

/** Dá número a um cadastro antigo que ainda não tem. */
export async function numerarClienteExistente(cpf) {
  const contador = doc(db, 'contadores', 'clientes')
  return runTransaction(db, async (tx) => {
    const atual = await tx.get(contador)
    const numero = (atual.exists() ? atual.data().ultimo : 0) + 1
    tx.set(contador, { ultimo: numero })
    tx.update(doc(db, 'clientes', cpf), { numero })
    return numero
  })
}

// Modo local (sem Firebase)
export function proximoNumeroLocal() {
  const numero = Number(localStorage.getItem(CONTADOR) ?? 0) + 1
  localStorage.setItem(CONTADOR, String(numero))
  return numero
}
