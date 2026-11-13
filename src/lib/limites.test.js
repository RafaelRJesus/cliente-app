import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LIMITES_CLIENTE } from './limites'

const regras = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')

describe('limites da tela x regras do Firestore', () => {
  it.each(['nome', 'email', 'telefone', 'cpf'])(
    '%s usa o mesmo tamanho máximo',
    (campo) => {
      const match = regras.match(new RegExp(`stringField\\('${campo}', (\\d+)\\)`))
      expect(match, `regra de ${campo} não encontrada`).not.toBeNull()
      expect(Number(match[1])).toBe(LIMITES_CLIENTE[campo])
    },
  )
})
