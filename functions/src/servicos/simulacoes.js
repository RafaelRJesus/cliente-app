// Simulação sem gravar nada: um ou vários prazos lado a lado (planos).

import { PRODUTOS } from '../../../src/lib/produtos.js'
import { pedidoInvalido } from '../erros.js'
import { calcular, lerParametros } from './contratos.js'

const MAX_PLANOS = 24

export function simularPlanos(ctx, entrada = {}) {
  const hoje = ctx.hoje()
  const prazos = entrada.prazos ?? [entrada.prazo ?? null]
  if (!Array.isArray(prazos) || prazos.length < 1 || prazos.length > MAX_PLANOS) {
    throw pedidoInvalido(`prazos deve ter de 1 a ${MAX_PLANOS} itens.`)
  }
  const anoAtual = Number(hoje.slice(0, 4))
  return prazos.map((prazo) => {
    const p = lerParametros(
      { ...entrada, prazo: prazo ?? undefined, situacao: undefined },
      hoje,
    )
    const { resultado, detalhes } = calcular(p, anoAtual, ctx.aleatorio)
    return {
      produto: p.produto,
      nomeProduto: PRODUTOS[p.produto].nome,
      prazo: p.prazo,
      sistema: p.sistema,
      taxaMensal: p.taxa / 100,
      valorSolicitado: p.valor,
      valorFinanciado: resultado.valorFinanciado,
      valorLiberado: resultado.valorLiberado,
      primeiraParcela: resultado.parcelas[0].valor,
      ultimaParcela: resultado.parcelas.at(-1).valor,
      iof: resultado.iof,
      totalPago: resultado.totalPago,
      totalJuros: resultado.totalJuros,
      cetMensal: resultado.cetMensal,
      cetAnual: resultado.cetAnual,
      detalhes,
      ...(entrada.cronograma ? { parcelas: resultado.parcelas } : {}),
    }
  })
}
