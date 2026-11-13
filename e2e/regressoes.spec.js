import { cadastrarCliente, contratar, expect, test } from './fixtures'

// Um teste por bug do relatório de QA de 13/11/2026.

test('taxa vazia não vira 0% e não permite contratar', async ({ page }) => {
  await page.goto('/simulador')
  await page.getByLabel('Taxa (% a.m.)').fill('')
  await expect(page.getByText('Informe a taxa.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Contratar' })).toHaveCount(0)
})

test('remover cliente pede confirmação', async ({ page }) => {
  await cadastrarCliente(page)
  const item = page.locator('.list-item', { hasText: 'Ana Teste' })

  await item.getByRole('button', { name: 'Remover' }).click()
  await expect(item.getByText('Remover Ana Teste?')).toBeVisible()
  await item.getByRole('button', { name: 'Cancelar' }).click()
  await expect(item).toBeVisible()

  await item.getByRole('button', { name: 'Remover' }).click()
  await item.getByRole('button', { name: 'Sim, remover' }).click()
  await expect(page.getByText('Nenhum cliente encontrado.')).toBeVisible()
})

test('cliente com contrato não pode ser removido até excluir o contrato', async ({
  page,
}) => {
  await cadastrarCliente(page)
  await contratar(page)

  await page.getByRole('link', { name: 'Clientes' }).click()
  await expect(page.getByRole('button', { name: 'Remover' })).toBeDisabled()

  await page.getByRole('link', { name: 'Contratos', exact: true }).click()
  await page.getByRole('link', { name: 'Ana Teste' }).click()
  await page.getByRole('button', { name: 'Excluir contrato' }).click()
  await page.getByRole('button', { name: 'Sim, excluir' }).click()
  await expect(page.getByText('Nenhum contrato nesta situação.')).toBeVisible()

  await page.getByRole('link', { name: 'Clientes' }).click()
  await expect(page.getByRole('button', { name: 'Remover' })).toBeEnabled()
})

test('Pix parcelado envia o valor inteiro e financia o IOF', async ({ page }) => {
  await page.goto('/simulador')
  await page.getByRole('tab', { name: /Pix parcelado/ }).click()
  await page.getByLabel(/Valor do Pix/).fill('500')
  await expect(page.locator('.kpi', { hasText: 'Valor enviado' })).toContainText(
    'R$ 500,00',
  )
  await expect(page.getByText('Valor financiado (Pix + IOF)')).toBeVisible()
})

test('contrato abre pelo teclado na lista', async ({ page }) => {
  await cadastrarCliente(page)
  await contratar(page)
  await page.getByRole('link', { name: '← Contratos' }).click()

  const link = page.getByRole('link', { name: 'Ana Teste' })
  await link.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Ana Teste' })).toBeVisible()
})

test('pagamento sem data não mostra NaN', async ({ page }) => {
  await cadastrarCliente(page)
  await contratar(page)
  await page.getByRole('button', { name: 'Pagar' }).first().click()
  await page.getByLabel('Data do pagamento').fill('')
  await expect(page.locator('.card-highlight')).not.toContainText('NaN')
  await expect(page.getByRole('button', { name: 'Confirmar pagamento' })).toBeDisabled()
})

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  for (const rota of ['/', '/clientes', '/simulador', '/contratos']) {
    test(`${rota} não rola na horizontal`, async ({ page }) => {
      await page.goto(rota)
      const largura = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(largura).toBeLessThanOrEqual(390)
    })
  }
})

test('período da taxa do Banco Central aparece certo (semanal e mensal)', async ({
  page,
}) => {
  await page.unroute('**/olinda.bcb.gov.br/**')
  await page.route('**/olinda.bcb.gov.br/**', (route) => {
    const url = decodeURIComponent(route.request().url())
    const ultimo = url.includes('$top=1&')
    let value
    if (url.includes('TaxasJurosDiariaPorInicioPeriodo')) {
      value = ultimo
        ? [{ InicioPeriodo: '2026-10-23', FimPeriodo: '2026-10-29' }]
        : [
            {
              Modalidade: 'Crédito pessoal não consignado - Prefixado',
              TaxaJurosAoMes: 5.13,
            },
          ]
    } else {
      value = ultimo
        ? [{ anoMes: '2026-09', Mes: 'Set-2026' }]
        : [
            {
              Modalidade: 'Financiamento imobiliário com taxas de mercado - Prefixado',
              TaxaJurosAoMes: 1.17,
            },
          ]
    }
    return route.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ value }),
    })
  })

  await page.goto('/simulador')
  await expect(page.locator('.referencia')).toContainText('23/10/2026 a 29/10/2026')

  await page.getByRole('tab', { name: /Garantia de imóvel/ }).click()
  await expect(page.locator('.referencia')).toContainText('Banco Central, set/2026')
  await expect(page.locator('.referencia')).not.toContainText('01/01/2026')
})
