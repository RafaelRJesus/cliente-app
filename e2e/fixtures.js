import { test as base, expect } from '@playwright/test'

const json = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  })

// APIs externas sempre simuladas: os testes não dependem de rede.
// Por padrão cada teste já começa logado como o admin do modo local.
// Use test.use({ sessao: null }) para começar na tela de login.
export const test = base.extend({
  sessao: ['admin-local', { option: true }],

  page: async ({ page, sessao }, run) => {
    if (sessao) {
      await page.addInitScript((uid) => {
        if (!sessionStorage.getItem('e2e-sessao')) {
          localStorage.setItem('rjbank:sessao', uid)
          sessionStorage.setItem('e2e-sessao', '1')
        }
      }, sessao)
    }
    await page.route('**/brasilapi.com.br/api/cep/**', (r) =>
      json(r, {
        street: 'Praça da Sé',
        neighborhood: 'Sé',
        city: 'São Paulo',
        state: 'SP',
      }),
    )
    await page.route('**/olinda.bcb.gov.br/**', (r) => r.abort())
    await page.route('**/parallelum.com.br/**', (r) => r.abort())
    await run(page)
  },
})

export { expect }

export async function cadastrarCliente(page, nome = 'Ana Teste', cpf = '11144477735') {
  await page.goto('/clientes')
  await page.getByLabel('Nome').fill(nome)
  await page.getByLabel('CPF').fill(cpf)
  await page.getByLabel('E-mail').fill('ana@exemplo.com')
  await page.getByLabel('Telefone').fill('51999998888')
  await page.getByLabel('CEP').fill('01001000')
  await expect(page.getByLabel('Cidade')).toHaveValue('São Paulo')
  await page.getByLabel('Número').fill('100')
  await page.getByRole('button', { name: 'Cadastrar' }).click()
  await expect(page.locator('.list-item', { hasText: nome })).toBeVisible()
}

export async function contratar(page, nome = 'Ana Teste') {
  await page.getByRole('link', { name: 'Simulador de crédito' }).click()
  const opcao = page.getByLabel('Cliente').locator('option', { hasText: nome })
  await page.getByLabel('Cliente').selectOption(await opcao.getAttribute('value'))
  await page.getByRole('button', { name: 'Contratar' }).click()
  await expect(page).toHaveURL(/\/contratos\/.+/)
}
