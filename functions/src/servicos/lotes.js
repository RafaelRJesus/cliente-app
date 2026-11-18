// Lote: tudo o que uma chamada da API gerou, para dar para consultar e apagar depois.
// Fica em massaLotes/{id}; os clientes e contratos são gravados iguais aos da tela.

import { naoEncontrado } from '../erros.js'

const COLECAO = 'massaLotes'

/** Id de lote novo (o documento só é gravado quando algo entra nele). */
export const novoLoteId = (ctx) => ctx.db.collection(COLECAO).doc().id

/** Junta clientes (CPF) e contratos (id) ao lote, criando o lote se preciso. */
export async function registrarNoLote(
  ctx,
  loteId,
  { clientes = [], contratos = [] },
  descricao,
) {
  const ref = ctx.db.collection(COLECAO).doc(loteId)
  await ctx.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const atual = snap.exists
      ? snap.data()
      : {
          criadoEm: ctx.agora().toISOString(),
          descricao: descricao ?? '',
          clientes: [],
          contratos: [],
        }
    tx.set(ref, {
      ...atual,
      atualizadoEm: ctx.agora().toISOString(),
      clientes: [...new Set([...atual.clientes, ...clientes])],
      contratos: [...new Set([...atual.contratos, ...contratos])],
    })
  })
}

const resumo = (id, dados) => ({
  id,
  descricao: dados.descricao,
  criadoEm: dados.criadoEm,
  atualizadoEm: dados.atualizadoEm,
  clientes: dados.clientes.length,
  contratos: dados.contratos.length,
})

export async function listarLotes(ctx) {
  const snap = await ctx.db.collection(COLECAO).get()
  return snap.docs
    .map((d) => resumo(d.id, d.data()))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
}

export async function obterLote(ctx, loteId) {
  const snap = await ctx.db.collection(COLECAO).doc(loteId).get()
  if (!snap.exists) throw naoEncontrado(`Lote ${loteId} não encontrado.`)
  return { id: snap.id, ...snap.data() }
}

/**
 * Apaga os contratos e clientes do lote. Cliente que ganhou contrato fora do
 * lote ou que já tem acesso ao app fica, para não sumir nada que não é massa.
 */
export async function apagarLote(ctx, loteId) {
  const lote = await obterLote(ctx, loteId)
  const db = ctx.db
  const contratosDoLote = new Set(lote.contratos)

  const mantidos = []
  const clientesApagar = []
  for (const cpf of lote.clientes) {
    const [contratos, usuarios] = await Promise.all([
      db.collection('contratos').where('clienteId', '==', cpf).get(),
      db.collection('usuarios').where('clienteId', '==', cpf).get(),
    ])
    const contratoDeFora = contratos.docs.some((d) => !contratosDoLote.has(d.id))
    if (contratoDeFora || !usuarios.empty) {
      mantidos.push({
        cpf,
        motivo: contratoDeFora ? 'tem contrato fora do lote' : 'tem acesso ao app',
      })
    } else clientesApagar.push(cpf)
  }

  // o Firestore aceita até 500 operações por batch
  const refs = [
    ...lote.contratos.map((id) => db.collection('contratos').doc(id)),
    ...clientesApagar.map((cpf) => db.collection('clientes').doc(cpf)),
  ]
  for (let i = 0; i < refs.length; i += 450) {
    const batch = db.batch()
    refs.slice(i, i + 450).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }

  if (mantidos.length) {
    const dadosLote = { ...lote }
    delete dadosLote.id
    await db
      .collection(COLECAO)
      .doc(loteId)
      .set({
        ...dadosLote,
        clientes: mantidos.map((m) => m.cpf),
        contratos: [],
        atualizadoEm: ctx.agora().toISOString(),
      })
  } else {
    await db.collection(COLECAO).doc(loteId).delete()
  }

  return {
    loteId,
    contratosApagados: lote.contratos.length,
    clientesApagados: clientesApagar.length,
    clientesMantidos: mantidos,
  }
}
