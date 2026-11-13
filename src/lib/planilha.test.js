// Ida e volta com arquivo .xlsx de verdade (versões Node das mesmas bibliotecas).
import { readSheet } from 'read-excel-file/node'
import writeExcelFile from 'write-excel-file/node'
import { describe, expect, it } from 'vitest'
import { lerLinhas, planilhaDeRecusadas, planilhaModelo } from './importacao'

const idaEVolta = async (matriz) => readSheet(await writeExcelFile(matriz).toBuffer())

describe('arquivo .xlsx', () => {
  it('o modelo gerado é lido de volta sem colunas faltando', async () => {
    const { linhas, faltando } = lerLinhas(await idaEVolta(planilhaModelo()))
    expect(faltando).toEqual([])
    expect(linhas[0].dados).toMatchObject({ nome: 'Maria Silva', cpf: '529.982.247-25' })
  })

  it('a planilha de recusadas também', async () => {
    const recusadas = planilhaDeRecusadas([
      {
        linha: 3,
        motivos: ['E-mail: E-mail inválido.'],
        dados: { nome: 'Ana', cpf: '111' },
      },
    ])
    const { linhas, faltando } = lerLinhas(await idaEVolta(recusadas))
    expect(faltando).toEqual([])
    expect(linhas[0].dados.nome).toBe('Ana')
  })
})
