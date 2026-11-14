import { cadastrarCliente, contratar, expect, test } from './fixtures'

test('pagar parcelas enche a barra e libera conquistas', async ({ page }) => {
  await cadastrarCliente(page)
  await contratar(page)

  const barra = page.getByRole('progressbar', { name: 'Parcelas pagas' })
  const conquistas = page.getByRole('list', { name: 'Conquistas' })
  await expect(barra).toHaveAttribute('aria-valuenow', '0')
  await expect(conquistas.locator('.liberada')).toHaveCount(0)

  await page.getByRole('button', { name: 'Pagar' }).first().click()
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()

  await expect(page.locator('.toast')).toContainText('Parcela 1 paga (Pix).')
  await expect(page.getByRole('status').filter({ hasText: 'Conquista' })).toHaveText(
    /Conquista desbloqueada: Primeira parcela/,
  )
  await expect(barra).toHaveAttribute('aria-valuenow', '1')
  await expect(conquistas.locator('.liberada')).toHaveText(/Primeira parcela/)
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true })

  // a próxima parcela não libera nada novo
  await page.getByRole('button', { name: 'Pagar' }).first().click()
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(page.locator('.toast')).toContainText('Parcela 2 paga (Pix).')
  await expect(page.locator('.conquista-nova')).toHaveCount(0)
})
