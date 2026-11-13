import { describe, expect, it } from 'vitest'
import { carteiraPorCliente, situacaoDoCliente, totaisDosContratos } from './carteira'

const HOJE = '2026-11-13'
const parcela = (numero, vencimento, extra = {}) => ({
  numero,
  vencimento,
  valor: 100,
  amortizacao: 90,
  juros: 10,
  saldo: 0,
  ...extra,
})
const contrato = (id, clienteId, parcelas, extra = {}) => ({
  id,
  clienteId,
  clienteNome: `Cliente ${clienteId}`,
  valor: 270,
  parcelas,
  ...extra,
})

const emDia = contrato('k1', 'ana', [parcela(1, '2026-12-10'), parcela(2, '2027-01-10')])
const atrasado = contrato('k2', 'ana', [
  parcela(1, '2026-10-10'),
  parcela(2, '2026-12-10'),
])
const quitado = contrato('k3', 'bia', [
  parcela(1, '2026-10-10', { pagaEm: '2026-10-10' }),
])

describe('totaisDosContratos', () => {
  it('soma valor, saldo e parcelas vencidas', () => {
    expect(totaisDosContratos([emDia, atrasado], HOJE)).toEqual({
      contratos: 2,
      ativos: 2,
      valorContratado: 540,
      saldo: 360,
      parcelasVencidas: 1,
      valorVencido: 100,
    })
  })

  it('carteira vazia dá zero em tudo', () => {
    expect(totaisDosContratos([], HOJE)).toMatchObject({ contratos: 0, saldo: 0 })
  })
})

describe('situacaoDoCliente', () => {
  it('um contrato atrasado deixa o cliente em atraso', () => {
    expect(situacaoDoCliente([emDia, atrasado], HOJE)).toBe('em atraso')
  })
  it('só quitados = quitado; sem contratos = sem contrato', () => {
    expect(situacaoDoCliente([quitado], HOJE)).toBe('quitado')
    expect(situacaoDoCliente([], HOJE)).toBe('sem contrato')
  })
})

describe('carteiraPorCliente', () => {
  const clientes = [
    { id: 'ana', nome: 'Ana', cpf: '111' },
    { id: 'bia', nome: 'Bia', cpf: '222' },
    { id: 'caio', nome: 'Caio', cpf: '333' },
  ]

  it('agrupa por cliente, inclui quem não tem contrato e ordena por saldo', () => {
    const linhas = carteiraPorCliente(clientes, [emDia, atrasado, quitado], HOJE)
    expect(linhas.map((l) => [l.nome, l.contratos, l.saldo, l.situacao])).toEqual([
      ['Ana', 2, 360, 'em atraso'],
      ['Bia', 1, 0, 'quitado'],
      ['Caio', 0, 0, 'sem contrato'],
    ])
  })

  it('contrato de cliente sem cadastro não some da carteira', () => {
    const orfao = contrato('k9', 'antigo', [parcela(1, '2026-12-10')])
    const linha = carteiraPorCliente([], [orfao], HOJE)[0]
    expect(linha).toMatchObject({ nome: 'Cliente antigo', cadastrado: false, saldo: 90 })
  })
})
