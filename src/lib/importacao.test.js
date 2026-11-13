import { describe, expect, it, vi } from 'vitest'
import {
  lerLinhas,
  normalizarCabecalho,
  paraCliente,
  planilhaDeRecusadas,
  planilhaModelo,
  prepararImportacao,
} from './importacao'

const SE = { logradouro: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' }
const buscarCep = vi.fn(async (cep) => {
  if (cep === '01001000') return SE
  throw new Error('não encontrado')
})

const cabecalho = ['Nome', 'CPF', 'E-mail', 'Telefone', 'CEP', 'Número']
const linha = (extra = {}) => ({
  nome: 'Ana',
  cpf: '529.982.247-25',
  email: 'Ana@Exemplo.com',
  telefone: '51988887777',
  cep: '01001000',
  numero: '10',
  complemento: '',
  logradouro: '',
  bairro: '',
  cidade: '',
  uf: '',
  ...extra,
})

const preparar = (linhas, opcoes = {}) =>
  prepararImportacao(
    linhas.map((dados, i) => ({ linha: i + 2, dados })),
    { buscarCep, ...opcoes },
  )

describe('lerLinhas', () => {
  it('aceita cabeçalhos com acento, maiúscula e apelidos', () => {
    expect(normalizarCabecalho(' E-mail ')).toBe('email')
    const { linhas, faltando } = lerLinhas([
      ['NOME COMPLETO', 'cpf', 'Email', 'Celular', 'cep', 'Nº', 'Município'],
      ['Ana', '52998224725', 'a@b.com', '51988887777', '01001000', '10', 'São Paulo'],
    ])
    expect(faltando).toEqual([])
    expect(linhas[0]).toMatchObject({
      linha: 2,
      dados: { nome: 'Ana', telefone: '51988887777', numero: '10', cidade: 'São Paulo' },
    })
  })

  it('pula linhas vazias e acha o cabeçalho mesmo com linhas em branco antes', () => {
    const { linhas } = lerLinhas([[], ['', ''], cabecalho, ['Ana'], [null, ''], ['Bia']])
    expect(linhas.map((l) => [l.linha, l.dados.nome])).toEqual([
      [4, 'Ana'],
      [6, 'Bia'],
    ])
  })

  it('devolve o zero que o Excel tira de CPF e CEP numéricos', () => {
    const { linhas } = lerLinhas([
      cabecalho,
      ['Ana', 1234567890, 'a@b.com', 51988887777, 1001000, 10],
    ])
    expect(linhas[0].dados).toMatchObject({
      cpf: '01234567890',
      cep: '01001000',
      numero: '10',
    })
  })

  it('aponta colunas obrigatórias que faltam', () => {
    const { faltando } = lerLinhas([['Nome', 'CPF']])
    expect(faltando.map((c) => c.rotulo)).toEqual(['E-mail', 'Telefone', 'CEP', 'Número'])
  })
})

describe('prepararImportacao', () => {
  it('linha boa: aplica máscaras e completa o endereço pelo CEP', async () => {
    const [r] = await preparar([linha()])
    expect(r.status).toBe('ok')
    expect(r.dados).toMatchObject({
      cpf: '529.982.247-25',
      email: 'ana@exemplo.com',
      telefone: '(51) 98888-7777',
      cep: '01001-000',
      ...SE,
    })
  })

  it('endereço preenchido na planilha não é sobrescrito pelo CEP', async () => {
    const [r] = await preparar([
      linha({ logradouro: 'Rua A', cidade: 'Canoas', uf: 'rs' }),
    ])
    expect(r.dados).toMatchObject({
      logradouro: 'Rua A',
      cidade: 'Canoas',
      uf: 'RS',
      bairro: '',
    })
  })

  it('consulta cada CEP uma vez só', async () => {
    buscarCep.mockClear()
    await preparar([
      linha(),
      linha({ cpf: '11144477735' }),
      linha({ cpf: '39053344705' }),
    ])
    expect(buscarCep).toHaveBeenCalledTimes(1)
  })

  it('erros dizem o campo', async () => {
    const [r] = await preparar([
      linha({ cpf: '111.111.111-11', email: 'sem-arroba', numero: '' }),
    ])
    expect(r.status).toBe('erro')
    expect(r.motivos).toEqual([
      'E-mail: E-mail inválido.',
      'CPF: CPF inválido.',
      'Número: Informe o número.',
    ])
  })

  it('CPF com dígito a mais é erro, não é cortado', async () => {
    const [r] = await preparar([linha({ cpf: '529982247251' })])
    expect(r.status).toBe('erro')
    expect(r.motivos).toContain('CPF: CPF inválido.')
  })

  it('CEP inexistente sem endereço na planilha vira erro claro', async () => {
    const [r] = await preparar([linha({ cep: '99999999' })])
    expect(r.status).toBe('erro')
    expect(r.motivos[0]).toBe('CEP: não encontrado; preencha logradouro, cidade e UF.')
  })

  it('CPF já cadastrado e CPF repetido na planilha são pulados', async () => {
    const r = await preparar(
      [linha(), linha({ nome: 'Ana de novo' }), linha({ cpf: '11144477735' })],
      {
        cpfsExistentes: new Set(['11144477735']),
      },
    )
    expect(r.map((x) => x.status)).toEqual(['ok', 'duplicado', 'duplicado'])
    expect(r[1].motivos).toEqual(['CPF repetido na planilha (linha 2).'])
    expect(r[2].motivos).toEqual(['CPF já cadastrado.'])
  })
})

describe('saídas', () => {
  it('paraCliente grava no mesmo formato do cadastro manual', async () => {
    const [r] = await preparar([linha()])
    expect(paraCliente(r.dados, new Date('2026-11-13T12:00:00Z'))).toEqual({
      nome: 'Ana',
      email: 'ana@exemplo.com',
      telefone: '(51) 98888-7777',
      cpf: '529.982.247-25',
      endereco: {
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        numero: '10',
        complemento: '',
        bairro: 'Sé',
        cidade: 'São Paulo',
        uf: 'SP',
      },
      criadoEm: '2026-11-13T12:00:00.000Z',
    })
  })

  it('modelo e planilha de recusadas usam as mesmas colunas', async () => {
    const [cab] = planilhaModelo()
    const r = await preparar([linha({ email: 'x' })])
    const recusadas = planilhaDeRecusadas(r)
    expect(recusadas[0]).toEqual(['Linha', 'Motivo', ...cab])
    expect(recusadas[1].slice(0, 3)).toEqual([2, 'E-mail: E-mail inválido.', 'Ana'])
  })

  it('a planilha de recusadas pode ser importada de novo', () => {
    const { faltando } = lerLinhas(planilhaDeRecusadas([]))
    expect(faltando).toEqual([])
  })
})
