import { cadastrarCliente, contratar, escolherCliente, expect, test } from './fixtures'

test('cliente recebe número sequencial de 7 dígitos', async ({ page }) => {
  await cadastrarCliente(page, 'Ana Teste', '11144477735')
  await cadastrarCliente(page, 'Bruno Teste', '52998224725')
  await expect(page.locator('.list-item', { hasText: 'Ana Teste' })).toContainText(
    'Nº 0000001',
  )
  await expect(page.locator('.list-item', { hasText: 'Bruno Teste' })).toContainText(
    'Nº 0000002',
  )

  await page.getByPlaceholder('Buscar por nome, CPF ou nº do cliente').fill('2')
  await expect(page.locator('.list-item')).toHaveCount(1)
  await expect(page.locator('.list-item')).toContainText('Bruno Teste')
})

test('cadastro antigo sem número é numerado pelo botão', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('cliente-app:clientes')) return
    localStorage.setItem(
      'cliente-app:clientes',
      JSON.stringify([
        {
          id: '39053344705',
          nome: 'Cadastro Antigo',
          cpf: '390.533.447-05',
          email: 'antigo@exemplo.com',
          telefone: '(51) 98888-7777',
          endereco: {
            cidade: 'São Paulo',
            uf: 'SP',
            logradouro: 'Praça da Sé',
            numero: '1',
          },
          criadoEm: '2026-01-01T00:00:00.000Z',
        },
      ]),
    )
  })
  await page.goto('/clientes')
  const item = page.locator('.list-item', { hasText: 'Cadastro Antigo' })
  await expect(item).toContainText('Nº —')
  await page.getByRole('button', { name: 'Numerar agora' }).click()
  await expect(item).toContainText('Nº 0000001')
  await expect(page.getByRole('button', { name: 'Numerar agora' })).toHaveCount(0)
})

test('contrato recebe número PPP + cliente + sequência', async ({ page }) => {
  await cadastrarCliente(page, 'Ana Teste', '11144477735')
  await contratar(page, 'Ana Teste')
  await expect(page.locator('.page-header')).toContainText('101.0000001.001')

  await page.goto('/simulador')
  await page.getByRole('tab', { name: 'Pix parcelado' }).click()
  await escolherCliente(page, '111.444.777-35', 'Ana Teste')
  await page.getByRole('button', { name: 'Contratar' }).click()
  await expect(page.locator('.page-header')).toContainText('105.0000001.002')

  await page.goto('/contratos')
  await expect(page.locator('tbody')).toContainText('101.0000001.001')
  await expect(page.locator('tbody')).toContainText('105.0000001.002')
})

test('simulador acha o cliente por nome completo, CPF ou número', async ({ page }) => {
  await cadastrarCliente(page, 'Ana Teste', '11144477735')
  await cadastrarCliente(page, 'João Álvares Lima', '52998224725')
  await page.goto('/simulador')
  const campo = page.getByRole('combobox', { name: 'Cliente' })
  const sugestoes = page
    .getByRole('listbox', { name: 'Clientes encontrados' })
    .getByRole('option')

  await campo.fill('joao lima alvares')
  await expect(sugestoes).toHaveCount(1)
  await expect(sugestoes).toContainText('João Álvares Lima')

  await campo.fill('529.982')
  await expect(sugestoes).toHaveText([/João Álvares Lima/])

  await campo.fill('0000001')
  await expect(sugestoes).toHaveText([/Ana Teste/])

  // teclado: seta para baixo e Enter
  await campo.fill('2')
  await campo.press('ArrowDown')
  await campo.press('Enter')
  await expect(page.getByTestId('cliente-escolhido')).toContainText('Nº 0000002')

  await page.getByRole('button', { name: 'Trocar' }).click()
  await campo.fill('ninguém')
  await expect(page.getByText('Nenhum cliente encontrado.')).toBeVisible()
})
