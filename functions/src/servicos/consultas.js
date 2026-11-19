// Consultas para achar massa pronta: cliente por CPF/número/e-mail, clientes sem
// contrato, contratos por número, CPF, produto, situação ou faixa de números.

import { situacaoContrato } from '../../../src/lib/credito.js'
import { situacaoDoCliente, totaisDosContratos } from '../../../src/lib/carteira.js'
import { onlyDigits } from '../../../src/lib/format.js'
import { riscoDoContrato, RISCOS } from '../../../src/lib/catalogo.js'
import { PREFIXOS } from '../../../src/lib/numeracao.js'
import { naoEncontrado, pedidoInvalido } from '../erros.js'
import { resumoContrato, SITUACOES } from './contratos.js'
import { buscarContratoPorNumero } from './pagamentos.js'

const LIMITE_MAX = 100

const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

function lerLimite(limite, padrao = 20) {
  const n = limite == null ? padrao : Number(limite)
  if (!Number.isInteger(n) || n < 1 || n > LIMITE_MAX) {
    throw pedidoInvalido(`limite deve ser um inteiro de 1 a ${LIMITE_MAX}.`)
  }
  return n
}

function embaralhar(lista, aleatorio) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

const contratosDoCliente = async (ctx, clienteId) =>
  docs(await ctx.db.collection('contratos').where('clienteId', '==', clienteId).get())

/** GET /clientes?cpf=|numero=|email= — o cliente com os contratos e a situação. */
export async function consultarCliente(ctx, { cpf, numero, email }) {
  const db = ctx.db.collection('clientes')
  let cliente
  if (cpf) {
    const snap = await db.doc(onlyDigits(cpf)).get()
    if (snap.exists) cliente = { id: snap.id, ...snap.data() }
  } else if (numero) {
    const lista = docs(await db.where('numero', '==', Number(numero)).limit(1).get())
    cliente = lista[0]
  } else if (email) {
    const lista = docs(
      await db.where('email', '==', String(email).toLowerCase()).limit(1).get(),
    )
    cliente = lista[0]
  } else {
    throw pedidoInvalido('Informe cpf, numero ou email.')
  }
  if (!cliente) throw naoEncontrado('Cliente não encontrado.')

  const hoje = ctx.hoje()
  const contratos = await contratosDoCliente(ctx, cliente.id)
  return {
    cliente,
    situacao: situacaoDoCliente(contratos, hoje),
    totais: totaisDosContratos(contratos, hoje),
    contratos: contratos.map((c) => resumoContrato(c, hoje)),
  }
}

/** GET /clientes/sem-contrato — cadastros prontos para receber contrato. */
export async function clientesSemContrato(ctx, { limite, aleatorio } = {}) {
  const n = lerLimite(limite)
  const todos = docs(await ctx.db.collection('clientes').get()).filter(
    (c) => c.numero && !c.ultimoContrato,
  )
  const ordenados = aleatorio
    ? embaralhar(todos, ctx.aleatorio)
    : todos.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  return ordenados.slice(0, n)
}

/**
 * GET /contratos — filtros combináveis: numero, cpf, produto, situacao, de/ate
 * (faixa de números de contrato), limite e aleatorio=true para sortear.
 */
export async function buscarContratos(ctx, filtros = {}) {
  const hoje = ctx.hoje()
  if (filtros.numero) {
    const { contrato } = await buscarContratoPorNumero(ctx, filtros.numero)
    return [resumoContrato(contrato, hoje)]
  }
  const n = lerLimite(filtros.limite)
  const { produto, situacao } = filtros
  if (produto && !PREFIXOS[produto]) {
    throw pedidoInvalido(
      `Produto inválido. Use um de: ${Object.keys(PREFIXOS).join(', ')}.`,
    )
  }
  if (situacao && !SITUACOES.includes(situacao)) {
    throw pedidoInvalido(`situacao deve ser uma de: ${SITUACOES.join(', ')}.`)
  }
  const risco = filtros.risco ? String(filtros.risco).toUpperCase() : null
  if (risco && !RISCOS[risco]) {
    throw pedidoInvalido(`risco inválido. Use um de: ${Object.keys(RISCOS).join(', ')}.`)
  }

  let consulta = ctx.db.collection('contratos')
  if (filtros.cpf) consulta = consulta.where('clienteId', '==', onlyDigits(filtros.cpf))
  else if (produto) consulta = consulta.where('produto', '==', produto)
  let lista = docs(await consulta.get())

  if (produto) lista = lista.filter((c) => c.produto === produto)
  if (filtros.de) lista = lista.filter((c) => c.numeroContrato >= onlyDigits(filtros.de))
  if (filtros.ate)
    lista = lista.filter((c) => c.numeroContrato <= onlyDigits(filtros.ate))
  if (situacao) lista = lista.filter((c) => situacaoContrato(c, hoje) === situacao)
  if (risco) lista = lista.filter((c) => riscoDoContrato(c) === risco)

  const ordenada = filtros.aleatorio
    ? embaralhar(lista, ctx.aleatorio)
    : lista.sort((a, b) => (a.numeroContrato ?? '').localeCompare(b.numeroContrato ?? ''))
  return ordenada.slice(0, n).map((c) => resumoContrato(c, hoje))
}

/** GET /contratos/{numero} — o documento completo, com as parcelas. */
export async function obterContrato(ctx, numero) {
  const { contrato } = await buscarContratoPorNumero(ctx, numero)
  const hoje = ctx.hoje()
  return { ...contrato, situacao: resumoContrato(contrato, hoje).situacao }
}
