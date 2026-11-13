import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FORMAS_PAGAMENTO, formasPara, nomeFormaPagamento } from './pagamento'

describe('formas de pagamento', () => {
  it('equipe vê as cinco; cliente não registra dinheiro', () => {
    expect(formasPara(true).map((f) => f.id)).toEqual([
      'pix',
      'credito',
      'debito',
      'boleto',
      'dinheiro',
    ])
    expect(formasPara(false).map((f) => f.id)).toEqual([
      'pix',
      'credito',
      'debito',
      'boleto',
    ])
  })

  it('nome para exibir, e vazio para pagamento antigo sem forma', () => {
    expect(nomeFormaPagamento('credito')).toBe('Cartão de crédito')
    expect(nomeFormaPagamento(undefined)).toBe('')
  })

  it('as regras do Firestore aceitam exatamente essas formas', () => {
    const regras = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')
    const lista = regras
      .match(/p\.formaPagamento in \[([^\]]*)\]/)[1]
      .match(/'([^']+)'/g)
      .map((s) => s.replaceAll("'", ''))
    expect(lista.sort()).toEqual(FORMAS_PAGAMENTO.map((f) => f.id).sort())
  })
})
