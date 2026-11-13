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

describe('limites do endereço x regras do Firestore', () => {
  it.each(['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'])(
    '%s usa o mesmo tamanho máximo',
    (campo) => {
      const match = regras.match(new RegExp(`texto\\(e, '${campo}', (\\d+)\\)`))
      expect(match, `regra de ${campo} não encontrada`).not.toBeNull()
      expect(Number(match[1])).toBe(LIMITES_CLIENTE[campo])
    },
  )
})

describe('campos de detalhes do contrato x regras', () => {
  it('todo campo gravado em detalhes é permitido pelas regras', async () => {
    const permitidos = regras
      .match(/d\.keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/)[1]
      .match(/'([^']+)'/g)
      .map((k) => k.replaceAll("'", ''))
    const fonte = readFileSync(new URL('../pages/Simulador.jsx', import.meta.url), 'utf8')
    const usados = fonte
      .slice(fonte.indexOf('function detalhesDoProduto'))
      .match(/(\w+):/g)
      .map((k) => k.slice(0, -1))
    for (const campo of usados) expect(permitidos).toContain(campo)
  })
})
