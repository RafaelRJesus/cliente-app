// Fórmulas de mercado (Price, SAC, IOF de pessoa física, CET).
// Valores simulados, sem regra específica de nenhuma instituição.

export const IOF_DIARIO = 0.000082 // 0,0082% ao dia (PF)
export const IOF_ADICIONAL = 0.0038 // 0,38% sobre o valor
export const IOF_DIAS_MAX = 365

export const MULTA_ATRASO = 0.02 // 2%
export const JUROS_MORA_MES = 0.01 // 1% a.m., pro rata die

const round2 = (n) => Math.round(n * 100) / 100

export function addMonths(isoDate, months) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return d.toISOString().slice(0, 10)
}

export function diffDays(from, to) {
  const ms = new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

export function parcelaPrice(valor, taxa, prazo) {
  if (taxa === 0) return valor / prazo
  return (valor * taxa) / (1 - (1 + taxa) ** -prazo)
}

export function gerarParcelas({ valor, taxaMensal, prazo, sistema, dataContratacao }) {
  const parcelas = []
  let saldo = valor
  const pmt = parcelaPrice(valor, taxaMensal, prazo)
  const amortizacaoSac = valor / prazo

  for (let numero = 1; numero <= prazo; numero++) {
    const juros = round2(saldo * taxaMensal)
    // a última parcela absorve a diferença de centavos dos arredondamentos
    const amortizacao =
      numero === prazo ? saldo : round2(sistema === 'SAC' ? amortizacaoSac : pmt - juros)

    saldo = round2(saldo - amortizacao)
    parcelas.push({
      numero,
      vencimento: addMonths(dataContratacao, numero),
      amortizacao,
      juros,
      valor: round2(amortizacao + juros),
      saldo,
      pagaEm: null,
      valorPago: null,
    })
  }

  return parcelas
}

export function calcularIof(parcelas, dataContratacao) {
  const valorBase = parcelas.reduce((acc, p) => acc + p.amortizacao, 0)
  const diario = parcelas.reduce((acc, p) => {
    const dias = Math.min(diffDays(dataContratacao, p.vencimento), IOF_DIAS_MAX)
    return acc + p.amortizacao * IOF_DIARIO * dias
  }, 0)
  return round2(valorBase * IOF_ADICIONAL + diario)
}

// Taxa que zera o fluxo: valor liberado = soma das parcelas descontadas.
export function calcularCetMensal(valorLiberado, parcelas) {
  const vp = (taxa) =>
    parcelas.reduce((acc, p, i) => acc + p.valor / (1 + taxa) ** (i + 1), 0)

  let min = 0
  let max = 1
  for (let i = 0; i < 100; i++) {
    const mid = (min + max) / 2
    if (vp(mid) > valorLiberado) min = mid
    else max = mid
  }
  return (min + max) / 2
}

export const anualizar = (taxaMensal) => (1 + taxaMensal) ** 12 - 1

export function simular({ valor, taxaMensal, prazo, sistema, dataContratacao }) {
  const parcelas = gerarParcelas({ valor, taxaMensal, prazo, sistema, dataContratacao })
  const iof = calcularIof(parcelas, dataContratacao)
  const totalPago = round2(parcelas.reduce((acc, p) => acc + p.valor, 0))
  const cetMensal = calcularCetMensal(valor - iof, parcelas)

  return {
    parcelas,
    iof,
    valorLiberado: round2(valor - iof),
    totalPago,
    totalJuros: round2(totalPago - valor),
    cetMensal,
    cetAnual: anualizar(cetMensal),
  }
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/

export function calcularAtraso(parcela, dataPagamento) {
  const semEncargos = { dias: 0, multa: 0, juros: 0, total: parcela.valor }
  if (!DATA_ISO.test(dataPagamento ?? '')) return semEncargos

  const dias = diffDays(parcela.vencimento, dataPagamento)
  if (dias <= 0) return semEncargos

  const multa = round2(parcela.valor * MULTA_ATRASO)
  const juros = round2(parcela.valor * (JUROS_MORA_MES / 30) * dias)
  return { dias, multa, juros, total: round2(parcela.valor + multa + juros) }
}

export function situacaoContrato(contrato, hoje) {
  const abertas = contrato.parcelas.filter((p) => !p.pagaEm)
  if (abertas.length === 0) return 'quitado'
  if (abertas.some((p) => p.vencimento < hoje)) return 'em atraso'
  return 'em dia'
}

export function saldoDevedor(contrato) {
  return round2(
    contrato.parcelas.filter((p) => !p.pagaEm).reduce((acc, p) => acc + p.amortizacao, 0),
  )
}
