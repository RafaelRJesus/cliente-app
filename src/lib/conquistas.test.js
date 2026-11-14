import { describe, expect, it } from 'vitest'
import { conquistaNova, conquistasDe } from './conquistas'

const ids = (lista) => lista.map((c) => c.id)

describe('conquistasDe', () => {
  it('não libera nada sem pagamento', () => {
    expect(conquistasDe(0, 12)).toEqual([])
  })

  it('libera a metade no arredondamento para cima', () => {
    expect(ids(conquistasDe(5, 11))).toEqual(['primeira'])
    expect(ids(conquistasDe(6, 11))).toEqual(['primeira', 'metade'])
  })

  it('libera as três ao quitar', () => {
    expect(ids(conquistasDe(12, 12))).toEqual(['primeira', 'metade', 'zerou'])
  })

  it('contrato de uma parcela não ganha "metade"', () => {
    expect(ids(conquistasDe(1, 1))).toEqual(['primeira', 'zerou'])
  })
})

describe('conquistaNova', () => {
  it('avisa só o que o pagamento liberou', () => {
    expect(conquistaNova(0, 1, 12)?.id).toBe('primeira')
    expect(conquistaNova(1, 2, 12)).toBeNull()
    expect(conquistaNova(5, 6, 12)?.id).toBe('metade')
    expect(conquistaNova(11, 12, 12)?.id).toBe('zerou')
  })

  it('quando libera duas de uma vez, mostra a maior', () => {
    expect(conquistaNova(0, 1, 1)?.id).toBe('zerou')
  })
})
