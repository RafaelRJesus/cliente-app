import { diffDays, saldoDevedor, situacaoContrato } from './credito'
import { nomeProduto } from './produtos'

const centavos = (n) => Math.round(n * 100) / 100

/** Contratos com parcela vencida, do atraso mais antigo para o mais novo. */
export function contratosEmAtraso(contratos, hoje) {
  return contratos
    .map((c) => {
      const vencidas = c.parcelas.filter((p) => !p.pagaEm && p.vencimento < hoje)
      if (vencidas.length === 0) return null
      const maisAntiga = vencidas.reduce((a, b) => (a.vencimento < b.vencimento ? a : b))
      return {
        contrato: c,
        parcelas: vencidas.length,
        valor: centavos(vencidas.reduce((acc, p) => acc + p.valor, 0)),
        diasAtraso: diffDays(maisAntiga.vencimento, hoje),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.diasAtraso - a.diasAtraso || b.valor - a.valor)
}

/** Parcelas em aberto que ainda não venceram, da mais próxima para a mais distante. */
export function proximasParcelas(contratos, hoje, limite = 6) {
  return contratos
    .flatMap((c) =>
      c.parcelas
        .filter((p) => !p.pagaEm && p.vencimento >= hoje)
        .map((p) => ({ ...p, contrato: c, diasPara: diffDays(hoje, p.vencimento) })),
    )
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, limite)
}

/** Quantos contratos estão em dia, em atraso e quitados. */
export function composicaoCarteira(contratos, hoje) {
  const conta = { 'em dia': 0, 'em atraso': 0, quitado: 0 }
  for (const c of contratos) conta[situacaoContrato(c, hoje)] += 1
  return conta
}

/** Saldo a receber por produto, do maior para o menor. Quitados ficam de fora. */
export function saldoPorProduto(contratos, hoje) {
  const grupos = new Map()
  for (const c of contratos) {
    if (situacaoContrato(c, hoje) === 'quitado') continue
    const id = c.produto ?? 'pessoal'
    const g = grupos.get(id) ?? { id, nome: nomeProduto(c), contratos: 0, saldo: 0 }
    g.contratos += 1
    g.saldo = centavos(g.saldo + saldoDevedor(c))
    grupos.set(id, g)
  }
  return [...grupos.values()].sort((a, b) => b.saldo - a.saldo)
}

export function quandoVence(dias) {
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return 'vence amanhã'
  return `vence em ${dias} dias`
}

export const textoAtraso = (dias) =>
  dias === 1 ? '1 dia de atraso' : `${dias} dias de atraso`
