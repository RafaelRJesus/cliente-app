import { describe, expect, it } from 'vitest'
import { nomeAno, parseValorFipe } from './api/fipe'
import { maskCpf, maskPhone } from './format'
import { isValidCpf, validateCliente } from './validators'

describe('isValidCpf', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35'])('aceita %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true)
  })

  it.each(['529.982.247-26', '111.111.111-11', '123', ''])('rejeita "%s"', (cpf) => {
    expect(isValidCpf(cpf)).toBe(false)
  })
})

describe('máscaras', () => {
  it('formata CPF', () => {
    expect(maskCpf('52998224725')).toBe('529.982.247-25')
  })

  it('formata celular e fixo', () => {
    expect(maskPhone('51999998888')).toBe('(51) 99999-8888')
    expect(maskPhone('5133334444')).toBe('(51) 3333-4444')
  })
})

describe('validateCliente', () => {
  const valido = {
    nome: 'Maria Silva',
    email: 'maria@email.com',
    telefone: '(51) 99999-8888',
    cpf: '529.982.247-25',
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    numero: '10',
    cidade: 'São Paulo',
    uf: 'SP',
  }

  it('não retorna erros para um cliente válido', () => {
    expect(validateCliente(valido)).toEqual({})
  })

  it('aponta os campos inválidos', () => {
    const erros = validateCliente({ ...valido, email: 'maria', cpf: '111.111.111-11' })
    expect(Object.keys(erros)).toEqual(['email', 'cpf'])
  })
})

describe('parseValorFipe', () => {
  it('converte o valor textual da FIPE', () => {
    expect(parseValorFipe('R$ 59.777,00')).toBe(59777)
    expect(parseValorFipe('R$ 1.234.567,89')).toBe(1234567.89)
  })
})

describe('nomeAno', () => {
  it('mostra "Zero km" no lugar do ano 32000 da FIPE', () => {
    expect(nomeAno({ codigo: '32000-5', nome: '32000 Flex' }).nome).toBe('Zero km Flex')
    expect(nomeAno({ codigo: '2021-5', nome: '2021 Flex' }).nome).toBe('2021 Flex')
  })
})
