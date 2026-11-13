import writeExcelFile from 'write-excel-file/node'
import { cadastrarCliente, expect, test } from './fixtures'

const CSV = [
  'Nome;CPF;E-mail;Telefone;CEP;Número;Complemento',
  'Bia Planilha;529.982.247-25;bia@exemplo.com;51988887777;01001000;10;Apto 1',
  'Caio Planilha;390.533.447-05;caio@exemplo.com;(51) 3333-4444;01001-000;20;',
  'CPF Ruim;111.111.111-11;ruim@exemplo.com;51988887777;01001000;30;',
  'Ana Repetida;111.444.777-35;ana2@exemplo.com;51988887777;01001000;40;',
  'Bia de Novo;52998224725;bia2@exemplo.com;51988887777;01001000;50;',
].join('\n')

test('importa CSV: prévia, só as válidas entram e o resto pode ser baixado', async ({
  page,
}) => {
  await cadastrarCliente(page, 'Ana Teste', '11144477735')
  await page.getByRole('link', { name: 'Importar planilha' }).click()
  await expect(page.getByRole('heading', { name: 'Importar clientes' })).toBeVisible()

  await page.locator('input[type=file]').setInputFiles({
    name: 'clientes.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  })

  await expect(page.locator('.kpi', { hasText: 'Prontas para importar' })).toContainText(
    '2',
  )
  await expect(page.locator('.kpi', { hasText: 'Ignoradas' })).toContainText('2')
  await expect(page.locator('.kpi', { hasText: 'Com erro' })).toContainText('1')
  await expect(page.locator('tr', { hasText: 'CPF Ruim' })).toContainText(
    'CPF: CPF inválido.',
  )
  await expect(page.locator('tr', { hasText: 'Ana Repetida' })).toContainText(
    'CPF já cadastrado.',
  )
  await expect(page.locator('tr', { hasText: 'Bia de Novo' })).toContainText(
    'CPF repetido na planilha (linha 2).',
  )
  // endereço veio do CEP
  await expect(page.locator('tr', { hasText: 'Bia Planilha' })).toContainText(
    'São Paulo/SP',
  )

  await page.getByRole('button', { name: 'Importar 2 cliente(s)' }).click()
  await expect(page.getByRole('status')).toContainText(
    '2 cliente(s) importado(s); 3 linha(s) ficaram de fora.',
  )

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar linhas recusadas' }).click()
  expect((await download).suggestedFilename()).toMatch(/^clientes-recusados-.*\.xlsx$/)

  await page.getByRole('link', { name: 'Ver clientes' }).click()
  const bia = page.locator('.list-item', { hasText: 'Bia Planilha' })
  await expect(bia).toContainText('CPF 529.982.247-25')
  await expect(bia).toContainText('Praça da Sé, 10')
  await expect(page.locator('.list-item', { hasText: 'Caio Planilha' })).toContainText(
    '(51) 3333-4444',
  )
  await expect(page.locator('.list-item', { hasText: 'CPF Ruim' })).toHaveCount(0)
})

test('importa .xlsx com CPF numérico (zero à esquerda) e cabeçalhos diferentes', async ({
  page,
}) => {
  const buffer = await writeExcelFile([
    [
      'NOME COMPLETO',
      'cpf',
      'Email',
      'Celular',
      'cep',
      'Nº',
      'Rua',
      'Município',
      'Estado',
    ],
    [
      'Davi Excel',
      1234567890,
      'davi@exemplo.com',
      51988887777,
      1001000,
      7,
      'Rua das Flores',
      'Canoas',
      'rs',
    ],
  ]).toBuffer()

  await page.goto('/clientes/importar')
  await page.locator('input[type=file]').setInputFiles({
    name: 'clientes.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  })

  const linha = page.locator('tr', { hasText: 'Davi Excel' })
  await expect(linha).toContainText('012.345.678-90')
  await expect(linha).toContainText('Canoas/RS')
  await expect(linha).toContainText('pronta')
  await page.getByRole('button', { name: 'Importar 1 cliente(s)' }).click()
  await expect(page.getByRole('status')).toContainText('1 cliente(s) importado(s).')
})

test('arquivo sem as colunas obrigatórias é recusado antes da prévia', async ({
  page,
}) => {
  await page.goto('/clientes/importar')
  await page.locator('input[type=file]').setInputFiles({
    name: 'errado.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Nome;CPF\nAna;52998224725', 'utf8'),
  })
  await expect(page.getByRole('alert')).toHaveText(
    'Faltam as colunas: E-mail, Telefone, CEP, Número.',
  )
})

test('modelo pode ser baixado', async ({ page }) => {
  await page.goto('/clientes/importar')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar modelo' }).click()
  expect((await download).suggestedFilename()).toBe('modelo-importacao-clientes.xlsx')
})
