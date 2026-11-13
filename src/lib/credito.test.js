import { describe, expect, it } from 'vitest'
import {
  addMonths,
  calcularIof,
  calcularAtraso,
  calcularCetMensal,
  gerarParcelas,
  parcelaPrice,
  simular,
  situacaoContrato,
} from './credito'

const base = {
  valor: 10000,
  taxaMensal: 0.02,
  prazo: 12,
  dataContratacao: '2026-01-31',
}

describe('addMonths', () => {
  it('ajusta para o último dia quando o mês é mais curto', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31')
  })
})

describe('Price', () => {
  it('calcula a parcela fixa', () => {
    expect(parcelaPrice(10000, 0.02, 12)).toBeCloseTo(945.6, 2)
  })

  it('divide sem juros quando a taxa é zero', () => {
    expect(parcelaPrice(1200, 0, 12)).toBe(100)
  })

  it('zera o saldo na última parcela', () => {
    const parcelas = gerarParcelas({ ...base, sistema: 'PRICE' })
    expect(parcelas).toHaveLength(12)
    expect(parcelas.at(-1).saldo).toBe(0)
    const amortizado = parcelas.reduce((acc, p) => acc + p.amortizacao, 0)
    expect(amortizado).toBeCloseTo(10000, 1)
  })
})

describe('SAC', () => {
  it('mantém amortização constante e parcelas decrescentes', () => {
    const parcelas = gerarParcelas({ ...base, sistema: 'SAC' })
    expect(parcelas[0].amortizacao).toBeCloseTo(833.33, 2)
    expect(parcelas[0].valor).toBeCloseTo(1033.33, 2)
    expect(parcelas[0].valor).toBeGreaterThan(parcelas[11].valor)
  })
})

describe('arredondamento', () => {
  it.each(['PRICE', 'SAC'])(
    '%s: soma das amortizações fecha no valor exato',
    (sistema) => {
      const parcelas = gerarParcelas({ ...base, sistema })
      const centavos = parcelas.reduce(
        (acc, p) => acc + Math.round(p.amortizacao * 100),
        0,
      )
      expect(centavos).toBe(1_000_000)
      expect(parcelas.at(-1).saldo).toBe(0)
    },
  )
})

describe('CET', () => {
  it('é igual à taxa nominal quando não há custos', () => {
    const parcelas = gerarParcelas({ ...base, sistema: 'PRICE' })
    expect(calcularCetMensal(10000, parcelas)).toBeCloseTo(0.02, 4)
  })

  it('fica acima da taxa nominal quando há IOF', () => {
    const resultado = simular({ ...base, sistema: 'PRICE' })
    expect(resultado.iof).toBeGreaterThan(0)
    expect(resultado.cetMensal).toBeGreaterThan(0.02)
  })
})

describe('atraso', () => {
  const parcela = { valor: 1000, vencimento: '2026-03-10' }

  it('não cobra encargos no vencimento', () => {
    expect(calcularAtraso(parcela, '2026-03-10').total).toBe(1000)
  })

  it('aplica multa de 2% e juros de 1% a.m. pro rata', () => {
    const atraso = calcularAtraso(parcela, '2026-03-25')
    expect(atraso.dias).toBe(15)
    expect(atraso.multa).toBe(20)
    expect(atraso.juros).toBe(5)
    expect(atraso.total).toBe(1025)
  })
})

describe('situacaoContrato', () => {
  const contrato = {
    parcelas: [
      { vencimento: '2026-02-10', pagaEm: '2026-02-10' },
      { vencimento: '2026-03-10', pagaEm: null },
    ],
  }

  it('identifica atraso', () => {
    expect(situacaoContrato(contrato, '2026-03-11')).toBe('em atraso')
  })

  it('identifica contrato em dia', () => {
    expect(situacaoContrato(contrato, '2026-03-01')).toBe('em dia')
  })
})

describe('atraso com data inválida', () => {
  it.each(['', null, undefined, 'abc'])('ignora encargos quando a data é %p', (data) => {
    const r = calcularAtraso({ valor: 1000, vencimento: '2026-03-10' }, data)
    expect(r).toEqual({ dias: 0, multa: 0, juros: 0, total: 1000 })
  })
})

describe('IOF financiado (Pix parcelado)', () => {
  const pix = {
    valor: 500,
    taxaMensal: 0.065,
    prazo: 6,
    sistema: 'PRICE',
    dataContratacao: '2026-01-15',
  }

  it('quem recebe o Pix ganha o valor inteiro', () => {
    const r = simular({ ...pix, iofFinanciado: true })
    expect(r.valorLiberado).toBe(500)
  })

  it('o IOF entra no valor financiado e bate com o IOF das parcelas', () => {
    const r = simular({ ...pix, iofFinanciado: true })
    expect(r.valorFinanciado).toBeCloseTo(500 + r.iof, 2)
    const amortizado = r.parcelas.reduce((acc, p) => acc + p.amortizacao, 0)
    expect(amortizado).toBeCloseTo(r.valorFinanciado, 2)
    expect(calcularIof(r.parcelas, pix.dataContratacao)).toBeCloseTo(r.iof, 1)
  })

  it('sem a opção, o IOF continua sendo descontado do valor liberado', () => {
    const r = simular(pix)
    expect(r.valorLiberado).toBeCloseTo(500 - r.iof, 2)
    expect(r.valorFinanciado).toBe(500)
  })
})
