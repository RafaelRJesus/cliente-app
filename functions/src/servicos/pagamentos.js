// Pagamento de parcelas pela API, com os mesmos encargos de atraso da tela Contratos
// (multa de 2% e juros de mora de 1% a.m. pro rata, de calcularAtraso).

import { calcularAtraso } from '../../../src/lib/credito.js'
import { FORMAS_PAGAMENTO } from '../../../src/lib/pagamento.js'
import { naoEncontrado, pedidoInvalido, conflito } from '../erros.js'
import { resumoContrato } from './contratos.js'

const ESCOLHAS = ['proxima', 'vencidas', 'todas']

/** Quais parcelas pagar: números [1, 2], ou "proxima", "vencidas" ou "todas" as abertas. */
export function escolherParcelas(contrato, escolha, hoje) {
  const abertas = contrato.parcelas.filter((p) => !p.pagaEm)
  if (Array.isArray(escolha)) {
    const numeros = new Set(escolha)
    const pedidas = contrato.parcelas.filter((p) => numeros.has(p.numero))
    if (pedidas.length !== numeros.size)
      throw pedidoInvalido('Há parcela que não existe no contrato.')
    const jaPagas = pedidas.filter((p) => p.pagaEm).map((p) => p.numero)
    if (jaPagas.length) throw conflito('Há parcela já paga.', { parcelas: jaPagas })
    return pedidas
  }
  if (escolha === 'proxima') return abertas.slice(0, 1)
  if (escolha === 'vencidas') return abertas.filter((p) => p.vencimento < hoje)
  if (escolha === 'todas') return abertas
  throw pedidoInvalido(
    `parcelas deve ser uma lista de números ou: ${ESCOLHAS.join(', ')}.`,
  )
}

export async function buscarContratoPorNumero(ctx, numeroContrato) {
  const snap = await ctx.db
    .collection('contratos')
    .where('numeroContrato', '==', String(numeroContrato).replace(/\D/g, ''))
    .limit(1)
    .get()
  if (snap.empty) throw naoEncontrado(`Contrato ${numeroContrato} não encontrado.`)
  const doc = snap.docs[0]
  return { ref: doc.ref, contrato: { id: doc.id, ...doc.data() } }
}

/** POST /contratos/{numero}/pagamentos */
export async function pagarParcelas(ctx, numeroContrato, entrada = {}) {
  const hoje = ctx.hoje()
  const { parcelas: escolha = 'proxima', formaPagamento = 'pix' } = entrada
  const dataPagamento = entrada.dataPagamento ?? hoje
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) {
    throw pedidoInvalido('dataPagamento deve estar no formato AAAA-MM-DD.')
  }
  if (!FORMAS_PAGAMENTO.some((f) => f.id === formaPagamento)) {
    throw pedidoInvalido('formaPagamento inválida.')
  }

  const { ref } = await buscarContratoPorNumero(ctx, numeroContrato)
  return ctx.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const contrato = { id: snap.id, ...snap.data() }
    const pagar = escolherParcelas(contrato, escolha, hoje)
    if (pagar.length === 0)
      throw conflito('Nenhuma parcela em aberto para pagar com essa escolha.')

    const numeros = new Set(pagar.map((p) => p.numero))
    const pagamentos = []
    const parcelas = contrato.parcelas.map((p) => {
      if (!numeros.has(p.numero)) return p
      const atraso = calcularAtraso(p, dataPagamento)
      pagamentos.push({ parcela: p.numero, vencimento: p.vencimento, ...atraso })
      return { ...p, pagaEm: dataPagamento, valorPago: atraso.total, formaPagamento }
    })
    // a tela grava só o campo parcelas (é o único que as regras deixam mudar)
    tx.update(ref, { parcelas })
    return {
      contrato: resumoContrato({ ...contrato, parcelas }, hoje),
      dataPagamento,
      formaPagamento,
      pagamentos,
      totalPago: Math.round(pagamentos.reduce((a, p) => a + p.total, 0) * 100) / 100,
    }
  })
}
