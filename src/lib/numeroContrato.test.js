import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./firebase', () => ({ db: {} }))
const { PREFIXOS, formatarNumeroContrato, montarNumeroContrato } =
  await import('./numeroContrato')

describe('número do contrato', () => {
  it('PPP + cliente com 7 dígitos + sequência com 3', () => {
    expect(montarNumeroContrato('pessoal', 25, 3)).toBe('1010000025003')
    expect(montarNumeroContrato('pix', 9999999, 999)).toBe('1059999999999')
  })

  it('recusa cliente sem número, produto desconhecido e mais de 999 contratos', () => {
    expect(() => montarNumeroContrato('pessoal', undefined, 1)).toThrow(
      'Cliente sem número.',
    )
    expect(() => montarNumeroContrato('cartao', 1, 1)).toThrow('Produto sem prefixo')
    expect(() => montarNumeroContrato('pessoal', 1, 1000)).toThrow('999')
  })

  it('exibe separado e cai no id curto para contrato antigo', () => {
    expect(formatarNumeroContrato({ numeroContrato: '1010000025003' })).toBe(
      '101.0000025.003',
    )
    expect(formatarNumeroContrato({ id: 'abcdefgh123' })).toBe('ABCDEFGH')
  })

  it('prefixos do app e das regras do Firestore são os mesmos', () => {
    const regras = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')
    const mapa = Object.fromEntries(
      [...regras.match(/let prefixo = \{([^}]*)\}/)[1].matchAll(/'(\w+)': (\d+)/g)].map(
        (m) => [m[1], m[2]],
      ),
    )
    expect(mapa).toEqual(PREFIXOS)
  })
})
