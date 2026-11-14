import { describe, expect, it } from 'vitest'
import {
  composicaoCarteira,
  contratosEmAtraso,
  proximasParcelas,
  quandoVence,
  saldoPorProduto,
  textoAtraso,
} from './painel'

const HOJE = '2026-11-13'
const parcela = (numero, vencimento, extra = {}) => ({
  numero,
  vencimento,
  valor: 100,
  amortizacao: 80,
  ...extra,
})
const contrato = (id, parcelas, produto) => ({ id, clienteNome: id, parcelas, produto })

const emDia = contrato(
  'em-dia',
  [parcela(1, '2026-11-20'), parcela(2, '2026-12-20')],
  'pix',
)
const atrasoCurto = contrato('curto', [
  parcela(1, '2026-11-10'),
  parcela(2, '2026-12-10'),
])
const atrasoLongo = contrato('longo', [
  parcela(1, '2026-09-13'),
  parcela(2, '2026-10-13'),
  parcela(3, '2026-11-13'),
])
const quitado = contrato('quitado', [parcela(1, '2026-10-01', { pagaEm: '2026-10-01' })])
const carteira = [emDia, atrasoCurto, atrasoLongo, quitado]

describe('contratosEmAtraso', () => {
  it('lista só quem tem parcela vencida, o atraso mais antigo primeiro', () => {
    const lista = contratosEmAtraso(carteira, HOJE)
    expect(lista.map((l) => l.contrato.id)).toEqual(['longo', 'curto'])
  })

  it('conta parcelas e dias pela parcela mais antiga; vencer hoje não é atraso', () => {
    const [longo] = contratosEmAtraso([atrasoLongo], HOJE)
    expect(longo).toMatchObject({ parcelas: 2, valor: 200, diasAtraso: 61 })
  })
})

describe('proximasParcelas', () => {
  it('ordena por vencimento e diz quantos dias faltam', () => {
    const lista = proximasParcelas(carteira, HOJE, 3)
    expect(lista.map((p) => [p.contrato.id, p.diasPara])).toEqual([
      ['longo', 0],
      ['em-dia', 7],
      ['curto', 27],
    ])
  })
})

describe('composicaoCarteira', () => {
  it('conta contratos por situação', () => {
    expect(composicaoCarteira(carteira, HOJE)).toEqual({
      'em dia': 1,
      'em atraso': 2,
      quitado: 1,
    })
  })
})

describe('saldoPorProduto', () => {
  it('agrupa o saldo devedor por produto e ignora quitados', () => {
    expect(saldoPorProduto(carteira, HOJE)).toEqual([
      { id: 'pessoal', nome: 'Crédito pessoal', contratos: 2, saldo: 400 },
      { id: 'pix', nome: 'Pix parcelado', contratos: 1, saldo: 160 },
    ])
  })
})

describe('textos', () => {
  it('fala o vencimento como gente', () => {
    expect([0, 1, 5].map(quandoVence)).toEqual([
      'vence hoje',
      'vence amanhã',
      'vence em 5 dias',
    ])
    expect([1, 12].map(textoAtraso)).toEqual(['1 dia de atraso', '12 dias de atraso'])
  })
})
