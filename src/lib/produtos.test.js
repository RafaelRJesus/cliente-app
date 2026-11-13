import { describe, expect, it } from 'vitest'
import { validarProduto, valorMaximo } from './produtos'
import { isValidPlaca, tipoPlaca } from './validators'
import { maskCep, maskPlaca } from './format'

const base = { valor: 10_000, prazo: 24, taxa: 2, primeiraParcela: 500 }

describe('valorMaximo', () => {
  it('limita o crédito com garantia de veículo a 70% da FIPE', () => {
    expect(valorMaximo('veiculo', { valorFipe: 50_000 })).toBe(35_000)
  })

  it('limita o home equity a 60% do imóvel', () => {
    expect(valorMaximo('imovel', { valorImovel: 400_000 })).toBe(240_000)
  })
})

describe('validarProduto', () => {
  it('aceita crédito pessoal dentro dos limites', () => {
    expect(validarProduto({ ...base, produto: 'pessoal' })).toEqual({})
  })

  it('rejeita prazo acima do máximo do Pix parcelado', () => {
    const erros = validarProduto({ ...base, produto: 'pix', valor: 1_000, prazo: 18 })
    expect(erros.prazo).toBe('De 1 a 12 meses.')
  })

  it('bloqueia parcela acima da margem do consignado', () => {
    const erros = validarProduto({
      ...base,
      produto: 'consignado',
      primeiraParcela: 1_200,
      consignado: { renda: 3_000 },
    })
    expect(erros.valor).toMatch(/margem consignável/)
  })

  it('exige o veículo e recusa valor acima do LTV', () => {
    expect(validarProduto({ ...base, produto: 'veiculo' }).garantia).toBeDefined()

    const erros = validarProduto(
      {
        ...base,
        produto: 'veiculo',
        valor: 40_000,
        garantia: { valorFipe: 50_000, anoModelo: 2020 },
      },
      2026,
    )
    expect(erros.valor).toMatch(/35\.000/)
  })

  it('recusa veículo com mais de 15 anos', () => {
    const erros = validarProduto(
      { ...base, produto: 'veiculo', garantia: { valorFipe: 50_000, anoModelo: 2008 } },
      2026,
    )
    expect(erros.garantia).toMatch(/15 anos/)
  })
})

describe('placa', () => {
  it.each([
    ['ABC1234', 'antiga'],
    ['abc-1234', 'antiga'],
    ['BRA2E19', 'Mercosul'],
  ])('%s é placa %s', (placa, tipo) => {
    expect(isValidPlaca(placa)).toBe(true)
    expect(tipoPlaca(placa)).toBe(tipo)
  })

  it.each(['AB12345', 'ABCD123', '1234ABC', ''])('rejeita "%s"', (placa) => {
    expect(isValidPlaca(placa)).toBe(false)
  })

  it('aplica máscaras de placa e CEP', () => {
    expect(maskPlaca('bra2e19')).toBe('BRA-2E19')
    expect(maskCep('01001000')).toBe('01001-000')
  })
})
