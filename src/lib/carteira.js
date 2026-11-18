import { saldoDevedor, situacaoContrato } from './credito.js'

const soma = (lista, fn) =>
  Math.round(lista.reduce((acc, x) => acc + fn(x), 0) * 100) / 100

const vencidas = (contrato, hoje) =>
  contrato.parcelas.filter((p) => !p.pagaEm && p.vencimento < hoje)

/** Totais de uma lista de contratos (de um cliente ou da carteira). */
export function totaisDosContratos(contratos, hoje) {
  const atrasadas = contratos.flatMap((c) => vencidas(c, hoje))
  return {
    contratos: contratos.length,
    ativos: contratos.filter((c) => situacaoContrato(c, hoje) !== 'quitado').length,
    valorContratado: soma(contratos, (c) => c.valor),
    saldo: soma(contratos, saldoDevedor),
    parcelasVencidas: atrasadas.length,
    valorVencido: soma(atrasadas, (p) => p.valor),
  }
}

/** A pior situação entre os contratos manda: um atrasado deixa o cliente "em atraso". */
export function situacaoDoCliente(contratos, hoje) {
  if (contratos.length === 0) return 'sem contrato'
  const situacoes = contratos.map((c) => situacaoContrato(c, hoje))
  if (situacoes.includes('em atraso')) return 'em atraso'
  if (situacoes.includes('em dia')) return 'em dia'
  return 'quitado'
}

/**
 * Visão da carteira por cliente. Contrato cujo cliente não está na lista
 * (cadastro apagado ou antigo) entra num grupo próprio, com o nome gravado
 * no contrato, para nenhum saldo sumir da conta.
 */
export function carteiraPorCliente(clientes, contratos, hoje) {
  const porId = new Map()
  for (const c of clientes) {
    porId.set(c.id, { id: c.id, nome: c.nome, cpf: c.cpf, cadastrado: true, lista: [] })
  }
  for (const k of contratos) {
    if (!porId.has(k.clienteId)) {
      porId.set(k.clienteId, {
        id: k.clienteId,
        nome: k.clienteNome,
        cpf: null,
        cadastrado: false,
        lista: [],
      })
    }
    porId.get(k.clienteId).lista.push(k)
  }

  return [...porId.values()]
    .map(({ lista, ...cliente }) => ({
      ...cliente,
      ...totaisDosContratos(lista, hoje),
      situacao: situacaoDoCliente(lista, hoje),
    }))
    .sort((a, b) => b.saldo - a.saldo || a.nome.localeCompare(b.nome))
}
