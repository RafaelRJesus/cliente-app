import { cadastrarCliente, expect, test } from './fixtures'

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
