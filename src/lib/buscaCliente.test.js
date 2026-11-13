import { describe, expect, it } from 'vitest'
import { buscarClientes } from './buscaCliente'

const clientes = [
  { id: '1', numero: 1, nome: 'Ana Souza Lima', cpf: '529.982.247-25' },
  { id: '2', numero: 25, nome: 'João Pedro Álvares', cpf: '111.444.777-35' },
  { id: '3', numero: 300, nome: 'Mariana Ana Costa', cpf: '390.533.447-05' },
  { id: '4', nome: 'Cadastro Antigo', cpf: '012.345.678-90' },
]
const ids = (termo, limite) => buscarClientes(clientes, termo, limite).map((c) => c.id)

describe('buscarClientes', () => {
  it('nome completo, sem acento e em qualquer ordem', () => {
    expect(ids('joao pedro alvares')).toEqual(['2'])
    expect(ids('ÁLVARES joão')).toEqual(['2'])
    expect(ids('lima ana')).toEqual(['1'])
  })

  it('nome que começa com o termo vem antes', () => {
    expect(ids('ana')).toEqual(['1', '3'])
  })

  it('CPF com ou sem pontuação, inteiro ou parte', () => {
    expect(ids('529.982.247-25')).toEqual(['1'])
    expect(ids('52998224725')).toEqual(['1'])
    expect(ids('447')).toEqual(['2', '3'])
  })

  it('número do cliente, com ou sem zeros à esquerda, vem primeiro', () => {
    expect(ids('25')).toEqual(['2'])
    expect(ids('0000025')).toEqual(['2'])
    expect(ids('300')[0]).toBe('3')
  })

  it('sem termo devolve todos (até o limite); sem achado, lista vazia', () => {
    expect(ids('', 2)).toEqual(['1', '2'])
    expect(ids('ninguém')).toEqual([])
    expect(ids('9')).toEqual([])
  })
})
