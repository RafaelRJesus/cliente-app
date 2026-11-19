// Contratos de massa: a mesma conta do Simulador (simular de credito.js),
// as mesmas validações de produto e a mesma numeração do app.

import { addMonths, simular, situacaoContrato } from '../../../src/lib/credito.js'
import {
  classificarContrato,
  RISCO_PADRAO,
  RISCOS,
  tipoDoContrato,
} from '../../../src/lib/catalogo.js'
import { montarNumeroContrato } from '../../../src/lib/numeracao.js'
import { PRODUTOS, validarProduto } from '../../../src/lib/produtos.js'
import { FORMAS_PAGAMENTO } from '../../../src/lib/pagamento.js'
import { CRIADO_POR } from '../contexto.js'
import { naoEncontrado, pedidoInvalido } from '../erros.js'
import { gerarPlaca } from '../geradores.js'
import { criarUmCliente, MAX_POR_CHAMADA } from './clientes.js'
import { registrarNoLote } from './lotes.js'

// Valor e prazo usados quando a chamada não informa.
const PADROES = {
  pessoal: { valor: 5_000, prazo: 12 },
  consignado: { valor: 10_000, prazo: 24 },
  veiculo: { valor: 20_000, prazo: 36 },
  imovel: { valor: 150_000, prazo: 120 },
  pix: { valor: 1_000, prazo: 6 },
}

export const SITUACOES = ['em dia', 'em atraso', 'quitado']

const round2 = (n) => Math.round(n * 100) / 100

export function addDays(iso, dias) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

const ehData = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Normaliza e confere os parâmetros de um contrato (o que vem no corpo do POST). */
export function lerParametros(entrada = {}, hoje) {
  const produto = entrada.produto ?? 'pessoal'
  const regra = PRODUTOS[produto]
  if (!regra) {
    throw pedidoInvalido(
      `Produto inválido. Use um de: ${Object.keys(PRODUTOS).join(', ')}.`,
    )
  }
  const risco = String(entrada.risco ?? RISCO_PADRAO).toUpperCase()
  if (!RISCOS[risco]) {
    throw pedidoInvalido(`risco inválido. Use um de: ${Object.keys(RISCOS).join(', ')}.`)
  }
  const valor = entrada.valor ?? PADROES[produto].valor
  const prazo = entrada.prazo ?? PADROES[produto].prazo
  const taxa = entrada.taxaMensal ?? regra.taxaPadrao // em % ao mês, como na tela
  const sistema = (entrada.sistema ?? 'PRICE').toUpperCase()
  if (!['PRICE', 'SAC'].includes(sistema))
    throw pedidoInvalido('sistema deve ser PRICE ou SAC.')

  // situação desejada → quantas parcelas pagas e vencidas
  const situacao = entrada.situacao ?? null
  if (situacao && !SITUACOES.includes(situacao)) {
    throw pedidoInvalido(`situacao deve ser uma de: ${SITUACOES.join(', ')}.`)
  }
  let pagas = entrada.parcelasPagas ?? 0
  let vencidas = entrada.parcelasVencidas ?? 0
  if (situacao === 'quitado') {
    pagas = prazo
    vencidas = 0
  } else if (situacao === 'em atraso' && vencidas === 0) vencidas = 1
  else if (situacao === 'em dia') vencidas = 0

  for (const [nome, n] of [
    ['parcelasPagas', pagas],
    ['parcelasVencidas', vencidas],
  ]) {
    if (!Number.isInteger(n) || n < 0)
      throw pedidoInvalido(`${nome} deve ser um inteiro >= 0.`)
  }
  if (Number.isInteger(prazo) && pagas + vencidas > prazo) {
    throw pedidoInvalido('parcelasPagas + parcelasVencidas não pode passar do prazo.')
  }

  // Sem data informada, volta no tempo o suficiente para as parcelas pagas e
  // vencidas já terem vencido (5 dias de folga), e a seguinte ainda não.
  let dataContratacao = entrada.dataContratacao
  if (dataContratacao == null) {
    const meses = pagas + vencidas
    dataContratacao = meses ? addDays(addMonths(hoje, -meses), -5) : hoje
  } else if (!ehData(dataContratacao)) {
    throw pedidoInvalido('dataContratacao deve estar no formato AAAA-MM-DD.')
  }

  const formaPagamento = entrada.formaPagamento ?? 'pix'
  if (!FORMAS_PAGAMENTO.some((f) => f.id === formaPagamento)) {
    throw pedidoInvalido('formaPagamento inválida.')
  }

  return {
    produto,
    risco,
    valor,
    prazo,
    taxa,
    sistema,
    dataContratacao,
    parcelasPagas: pagas,
    convenio: entrada.convenio ?? 'inss',
    detalhes: entrada.detalhes ?? {},
    formaPagamento,
  }
}

/** Garantia e dados extras do produto, no formato que detalhesDoProduto (Simulador) grava. */
function montarDetalhes(p, primeiraParcela, anoAtual, aleatorio) {
  const d = p.detalhes
  switch (p.produto) {
    case 'consignado': {
      const convenio = PRODUTOS.consignado.convenios[p.convenio]
      if (!convenio) {
        throw pedidoInvalido(
          `convenio inválido. Use um de: ${Object.keys(PRODUTOS.consignado.convenios).join(', ')}.`,
        )
      }
      // renda com folga para a parcela caber na margem de 35%
      const renda =
        d.renda ?? Math.ceil((primeiraParcela / PRODUTOS.consignado.margem) * 1.25)
      return { convenio: convenio.nome, renda }
    }
    case 'veiculo':
      return {
        placa: d.placa ?? gerarPlaca(aleatorio),
        veiculo: d.veiculo ?? 'Veículo de teste (massa)',
        anoModelo: d.anoModelo ?? anoAtual - 3,
        codigoFipe: d.codigoFipe ?? '000000-0',
        valorFipe: d.valorFipe ?? Math.ceil((p.valor / PRODUTOS.veiculo.ltv) * 1.25),
        referenciaFipe: d.referenciaFipe ?? 'massa de teste',
      }
    case 'imovel':
      return {
        tipoImovel: d.tipoImovel ?? 'Casa',
        valorImovel: d.valorImovel ?? Math.ceil((p.valor / PRODUTOS.imovel.ltv) * 1.25),
      }
    case 'pix':
      return { valorPix: p.valor, iofFinanciado: true }
    default:
      return {}
  }
}

/** Faz a conta e valida como o Simulador. Devolve o resultado e os detalhes do produto. */
export function calcular(p, anoAtual, aleatorio = Math.random) {
  const regra = PRODUTOS[p.produto]
  const basicosOk =
    typeof p.valor === 'number' && p.valor > 0 && Number.isInteger(p.prazo) && p.prazo > 0
  if (!basicosOk)
    throw pedidoInvalido('valor e prazo devem ser positivos (prazo inteiro).')

  const resultado = simular({
    valor: p.valor,
    taxaMensal: p.taxa / 100,
    prazo: p.prazo,
    sistema: p.sistema,
    dataContratacao: p.dataContratacao,
    iofFinanciado: Boolean(regra.iofFinanciado),
  })
  const detalhes = montarDetalhes(p, resultado.parcelas[0].valor, anoAtual, aleatorio)
  const erros = validarProduto(
    {
      produto: p.produto,
      valor: p.valor,
      prazo: p.prazo,
      taxa: p.taxa,
      primeiraParcela: resultado.parcelas[0].valor,
      garantia: detalhes,
      consignado: { renda: detalhes.renda },
    },
    anoAtual,
  )
  if (Object.keys(erros).length)
    throw pedidoInvalido('Parâmetros fora das regras do produto.', erros)
  return { resultado, detalhes }
}

/** Documento do contrato igual ao que o Simulador grava (contratos.add). */
export function montarContrato(p, cliente, ctx) {
  const anoAtual = Number(ctx.hoje().slice(0, 4))
  const { resultado, detalhes } = calcular(p, anoAtual, ctx.aleatorio)
  const parcelas = resultado.parcelas.map((parcela) =>
    parcela.numero <= p.parcelasPagas
      ? {
          ...parcela,
          pagaEm: parcela.vencimento,
          valorPago: parcela.valor,
          formaPagamento: p.formaPagamento,
        }
      : parcela,
  )
  return {
    clienteId: cliente.id,
    clienteNome: cliente.nome,
    produto: p.produto,
    ...classificarContrato(p.produto, p.risco),
    detalhes,
    valor: resultado.valorFinanciado,
    taxaMensal: p.taxa / 100,
    prazo: p.prazo,
    sistema: p.sistema,
    dataContratacao: p.dataContratacao,
    iof: resultado.iof,
    cetMensal: resultado.cetMensal,
    parcelas,
    criadoEm: ctx.agora().toISOString(),
    criadoPor: CRIADO_POR,
  }
}

/** Grava com o próximo número do cliente, numa transação (como gravarContratoNumerado). */
async function gravarNumerado(ctx, dados) {
  const db = ctx.db
  const clienteRef = db.collection('clientes').doc(dados.clienteId)
  const contratoRef = db.collection('contratos').doc()
  return db.runTransaction(async (tx) => {
    const cliente = await tx.get(clienteRef)
    if (!cliente.exists) throw naoEncontrado('Cliente não encontrado.')
    const { numero, ultimoContrato = 0 } = cliente.data()
    const sequencia = ultimoContrato + 1
    const numeroContrato = montarNumeroContrato(
      dados.produto,
      numero,
      sequencia,
      dados.risco,
    )
    tx.update(clienteRef, { ultimoContrato: sequencia })
    const gravado = { ...dados, numeroContrato, sequencia }
    tx.set(contratoRef, gravado)
    return { id: contratoRef.id, ...gravado }
  })
}

async function buscarCliente(ctx, cpf) {
  const id = String(cpf).replace(/\D/g, '')
  const snap = await ctx.db.collection('clientes').doc(id).get()
  if (!snap.exists) throw naoEncontrado(`Cliente com CPF ${cpf} não encontrado.`)
  const cliente = { id: snap.id, ...snap.data() }
  if (!cliente.numero)
    throw pedidoInvalido('Cliente sem número: numere o cadastro no app antes.')
  return cliente
}

export const resumoContrato = (c, hoje) => ({
  id: c.id,
  numeroContrato: c.numeroContrato,
  clienteId: c.clienteId,
  clienteNome: c.clienteNome,
  produto: c.produto,
  tipo: tipoDoContrato(c),
  risco: c.risco ?? RISCO_PADRAO,
  razaoEspecial: c.razaoEspecial ?? null,
  valor: c.valor,
  prazo: c.prazo,
  dataContratacao: c.dataContratacao,
  situacao: situacaoContrato(c, hoje),
  parcelasPagas: c.parcelas.filter((x) => x.pagaEm).length,
  parcelasVencidas: c.parcelas.filter((x) => !x.pagaEm && x.vencimento < hoje).length,
  saldoDevedor: round2(
    c.parcelas.filter((x) => !x.pagaEm).reduce((a, x) => a + x.amortizacao, 0),
  ),
})

/**
 * POST /contratos: com cpf, todos os contratos vão para esse cliente;
 * sem cpf, cada contrato ganha um cliente novo (que também entra no lote).
 */
export async function criarContratos(ctx, entrada) {
  const { quantidade = 1, cpf, uf = 'RS', loteId, descricao } = entrada
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_POR_CHAMADA) {
    throw pedidoInvalido(`quantidade deve ser um inteiro de 1 a ${MAX_POR_CHAMADA}.`)
  }
  const hoje = ctx.hoje()
  const p = lerParametros(entrada, hoje)
  // valida antes de gravar qualquer coisa (não deixa cliente órfão por parâmetro errado)
  calcular(p, Number(hoje.slice(0, 4)), ctx.aleatorio)

  const clienteFixo = cpf ? await buscarCliente(ctx, cpf) : null
  const clientesNovos = []
  const contratos = []
  try {
    for (let i = 0; i < quantidade; i++) {
      let cliente = clienteFixo
      if (!cliente) {
        cliente = await criarUmCliente(ctx, { uf })
        clientesNovos.push(cliente.id)
      }
      contratos.push(await gravarNumerado(ctx, montarContrato(p, cliente, ctx)))
    }
  } finally {
    if (clientesNovos.length || contratos.length) {
      await registrarNoLote(
        ctx,
        loteId,
        { clientes: clientesNovos, contratos: contratos.map((c) => c.id) },
        descricao,
      )
    }
  }
  return contratos.map((c) => resumoContrato(c, hoje))
}
