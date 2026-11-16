import { describe, expect, it } from 'vitest'
import { migrarChavesAntigas } from './migrarChavesAntigas'

function memoria(inicial = {}) {
  const dados = new Map(Object.entries(inicial))
  return {
    get length() {
      return dados.size
    },
    key: (i) => [...dados.keys()][i] ?? null,
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: (k) => dados.delete(k),
    dados,
  }
}

describe('migrarChavesAntigas', () => {
  it('passa as chaves rjbank: para respawn: e apaga as antigas', () => {
    const s = memoria({
      'rjbank:sessao': 'u1',
      'rjbank:cache:cep': '{}',
      'cliente-app:clientes': '[]',
    })
    migrarChavesAntigas(s)
    expect([...s.dados.keys()].sort()).toEqual([
      'cliente-app:clientes',
      'respawn:cache:cep',
      'respawn:sessao',
    ])
    expect(s.getItem('respawn:sessao')).toBe('u1')
  })

  it('não sobrescreve o que já existe com o nome novo', () => {
    const s = memoria({ 'rjbank:sessao': 'velho', 'respawn:sessao': 'novo' })
    migrarChavesAntigas(s)
    expect(s.getItem('respawn:sessao')).toBe('novo')
    expect(s.getItem('rjbank:sessao')).toBeNull()
  })

  it('troca o e-mail do admin de exemplo sem duplicar a conta', () => {
    const s = memoria({
      'rjbank:contas': JSON.stringify([
        { uid: 'admin-local', email: 'admin@rjbank.test', senha: 'admin123' },
        { uid: 'u2', email: 'ana@teste.com', senha: 'x' },
      ]),
      'rjbank:usuarios': JSON.stringify({
        'admin-local': { papel: 'admin', email: 'admin@rjbank.test' },
      }),
    })
    migrarChavesAntigas(s)
    expect(JSON.parse(s.getItem('respawn:contas')).map((c) => c.email)).toEqual([
      'admin@respawn.test',
      'ana@teste.com',
    ])
    expect(JSON.parse(s.getItem('respawn:usuarios'))['admin-local'].email).toBe(
      'admin@respawn.test',
    )
  })

  it('sem dados antigos, não mexe em nada', () => {
    const s = memoria({ 'respawn:sessao': 'u1' })
    migrarChavesAntigas(s)
    expect([...s.dados.entries()]).toEqual([['respawn:sessao', 'u1']])
  })
})
