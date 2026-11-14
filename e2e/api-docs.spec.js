import { expect, test } from './fixtures'

test.use({ sessao: null })

test('documentação das APIs abre no Swagger UI com todas as seções (modo local)', async ({
  page,
}) => {
  const erros = []
  page.on('pageerror', (e) => erros.push(e.message))
  await page.goto('/api-docs/')
  // os testes de tela rodam sem Firebase: a página abre sem o login do Google
  await expect(page.getByText(/Modo local: sem Firebase configurado/)).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Respawn, APIs do simulador de crédito/ }),
  ).toBeVisible()
  for (const secao of [
    'Autenticação',
    'Clientes',
    'Contratos',
    'Transações',
    'CEP',
    'FIPE',
  ]) {
    await expect(page.locator('.opblock-tag', { hasText: secao }).first()).toBeVisible()
  }
  await expect(page.locator('#operations-Contratos-pagarParcela')).toBeVisible()
  expect(erros).toEqual([])
})
