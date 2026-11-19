import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  classificarContrato,
  CODIGOS_PRODUTO,
  prefixoDoContrato,
  RAZOES_ESPECIAIS,
  RISCOS,
  riscoDoContrato,
  SIGLAS,
  tipoDoContrato,
} from './catalogo'
import { PRODUTOS } from './produtos'

describe('catálogo de contratos', () => {
  it('cobre todos os produtos do simulador', () => {
    expect(Object.keys(SIGLAS).sort()).toEqual(Object.keys(PRODUTOS).sort())
    expect(Object.keys(CODIGOS_PRODUTO).sort()).toEqual(Object.keys(PRODUTOS).sort())
  })

  it('tem uma razão especial diferente para cada um dos 10 tipos', () => {
    const tipos = Object.values(SIGLAS).flatMap((s) =>
      Object.keys(RISCOS).map((r) => `${s}_${r}`),
    )
    expect(Object.keys(RAZOES_ESPECIAIS).sort()).toEqual(tipos.sort())
    expect(new Set(Object.values(RAZOES_ESPECIAIS)).size).toBe(10)
  })

  it('classifica o contrato com sigla, risco e razão especial', () => {
    expect(classificarContrato('pessoal')).toEqual({
      sigla: 'EMP',
      risco: 'RSP',
      razaoEspecial: 'E',
    })
    expect(classificarContrato('imovel', 'FFC')).toEqual({
      sigla: 'CGI',
      risco: 'FFC',
      razaoEspecial: 'J',
    })
    expect(() => classificarContrato('cartao')).toThrow('fora do catálogo')
    expect(() => classificarContrato('pix', 'CPR')).toThrow('Risco inválido')
  })

  it('o 1º dígito do prefixo é o risco e os dois seguintes, o produto', () => {
    expect(prefixoDoContrato('pessoal')).toBe('101')
    expect(prefixoDoContrato('pix', 'RSP')).toBe('105')
    expect(prefixoDoContrato('consignado', 'FFC')).toBe('202')
    expect(prefixoDoContrato('imovel', 'FFC')).toBe('204')
  })

  it('contrato antigo, sem o campo, é do risco Respawn', () => {
    expect(riscoDoContrato({ produto: 'pix' })).toBe('RSP')
    expect(tipoDoContrato({ produto: 'pix' })).toBe('PXP_RSP')
    expect(tipoDoContrato({ produto: 'veiculo', sigla: 'CGV', risco: 'FFC' })).toBe(
      'CGV_FFC',
    )
  })

  it('as siglas, os riscos e as razões especiais são os mesmos das regras do Firestore', () => {
    const regras = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')
    const mapa = (nome) =>
      Object.fromEntries(
        [
          ...regras
            .match(new RegExp(`let ${nome} = \\{([^}]*)\\}`))[1]
            .matchAll(/'(\w+)': '?(\w+)'?/g),
        ].map((m) => [m[1], m[2]]),
      )
    expect(mapa('siglas')).toEqual(SIGLAS)
    expect(mapa('razoes')).toEqual(RAZOES_ESPECIAIS)
    expect(mapa('produtoNoNumero')).toEqual(
      Object.fromEntries(
        Object.entries(CODIGOS_PRODUTO).map(([p, c]) => [p, String(Number(c))]),
      ),
    )
  })
})
