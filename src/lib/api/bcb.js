import { cached, getJson as get } from './http'

// A primeira consulta do dia na Olinda costuma levar bem mais que 10s.
const getJson = (url) => get(url, { timeout: 40_000 })

// Taxas médias por instituição publicadas pelo Banco Central (API Olinda).
const BASE = 'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata'

function resumir(linhas) {
  const porModalidade = {}
  for (const l of linhas) (porModalidade[l.Modalidade] ??= []).push(l)

  return Object.fromEntries(
    Object.entries(porModalidade).map(([modalidade, itens]) => {
      const taxas = itens.map((i) => i.TaxaJurosAoMes).sort((a, b) => a - b)
      return [
        modalidade,
        {
          mediana: taxas[Math.floor(taxas.length / 2)],
          menor: taxas[0],
          maior: taxas.at(-1),
          instituicoes: taxas.length,
        },
      ]
    }),
  )
}

async function semanal() {
  const [ultimo] = (
    await getJson(
      `${BASE}/TaxasJurosDiariaPorInicioPeriodo?$top=1&$orderby=InicioPeriodo desc&$format=json`,
    )
  ).value
  const { value } = await getJson(
    `${BASE}/TaxasJurosDiariaPorInicioPeriodo?$filter=InicioPeriodo eq '${ultimo.InicioPeriodo}' and Segmento eq 'PESSOA FÍSICA'&$top=5000&$format=json&$select=Modalidade,TaxaJurosAoMes`,
  )
  return {
    periodo: `${ultimo.InicioPeriodo} a ${ultimo.FimPeriodo}`,
    taxas: resumir(value),
  }
}

async function mensal() {
  const [ultimo] = (
    await getJson(
      `${BASE}/TaxasJurosMensalPorMes?$top=1&$orderby=anoMes desc&$format=json`,
    )
  ).value
  const { value } = await getJson(
    `${BASE}/TaxasJurosMensalPorMes?$filter=anoMes eq '${ultimo.anoMes}'&$top=5000&$format=json&$select=Modalidade,TaxaJurosAoMes`,
  )
  return { periodo: ultimo.Mes, taxas: resumir(value) }
}

// Junta as duas publicações (imobiliário só sai na mensal).
export const carregarTaxasMercado = () =>
  cached('bcb:taxas', 12, async () => {
    const publicacoes = await Promise.allSettled([semanal(), mensal()])
    const ok = publicacoes.filter((p) => p.status === 'fulfilled').map((p) => p.value)
    // não guarda resultado parcial no cache
    if (ok.length < publicacoes.length)
      throw new Error('Taxas do Banco Central incompletas')

    const resultado = {}
    for (const { taxas, periodo } of ok) {
      for (const [k, v] of Object.entries(taxas)) resultado[k] = { ...v, periodo }
    }
    return resultado
  })
