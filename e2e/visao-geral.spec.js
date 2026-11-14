import { cadastrarCliente, contratar, expect, test } from './fixtures'

test('Visão geral mostra o contrato e a legenda abre a lista já filtrada', async ({
  page,
}) => {
  await cadastrarCliente(page)
  await contratar(page)
  await page.getByRole('link', { name: 'Visão geral' }).click()

  const kpi = (rotulo) =>
    page
      .locator('.kpi', { has: page.getByText(rotulo, { exact: true }) })
      .locator('strong')
  await expect(kpi('Contratos ativos')).toHaveText('1')
  await expect(kpi('Parcelas vencidas')).toHaveText('0')
  await expect(
    page.getByText('Nenhuma parcela atrasada. A carteira está em dia.'),
  ).toBeVisible()
  await expect(
    page
      .locator('section', { hasText: 'Próximos vencimentos' })
      .locator('.list-item')
      .first(),
  ).toContainText('Parcela 1 de 12')
  await expect(page.getByRole('row', { name: /Crédito pessoal/ })).toContainText(
    'R$ 10.000,00',
  )

  await page.getByRole('link', { name: '0 em atraso' }).click()
  await expect(page).toHaveURL(/\/contratos\?situacao=em(\+|%20)atraso$/)
  await expect(page.getByRole('button', { name: 'em atraso' })).toHaveClass(/active/)
  await expect(page.locator('a.row-link')).toHaveCount(0)

  await page.getByRole('button', { name: 'todos' }).click()
  await expect(page).toHaveURL(/\/contratos$/)
  await expect(page.locator('a.row-link')).toHaveCount(1)
})
