import { cadastrarCliente, contratar, expect, test } from './fixtures'

// Backoffice do admin (modo local): usuários e carteira por cliente.

const SENHA = 'senha123'

async function sair(page) {
  await page.locator('.usuario').getByRole('button', { name: 'Sair' }).click()
}

async function entrar(page, email, senha = SENHA) {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('admin vê os usuários e bloqueia e desbloqueia um cliente', async ({ page }) => {
  await cadastrarCliente(page, 'Ana Teste', '11144477735')
  await sair(page)

  // cliente cria o acesso (cadastrarCliente usa ana@exemplo.com)
  await page.goto('/criar-conta')
  await page.getByLabel('E-mail').fill('ana@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill(SENHA)
  await page.getByLabel('Repita a senha').fill(SENHA)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await page.getByLabel('Nome').fill('Ana Teste')
  await page.getByLabel('CPF').fill('11144477735')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Meus contratos' })).toBeVisible()
  await sair(page)

  await entrar(page, 'admin@respawn.test', 'admin123')
  await page.getByRole('navigation').getByRole('link', { name: 'Usuários' }).click()
  await page.getByRole('button', { name: /^Clientes/ }).click()
  const linha = page.locator('tr', { hasText: 'ana@exemplo.com' })
  await expect(linha).toContainText('CPF 111.444.777-35')
  await expect(linha).toContainText('ativo')
  // o admin não tem botão de bloquear a si mesmo
  await page.getByRole('button', { name: /^Todos/ }).click()
  await expect(
    page
      .locator('tr', { hasText: 'admin@respawn.test' })
      .getByRole('button', { name: 'Bloquear' }),
  ).toHaveCount(0)

  await linha.getByRole('button', { name: 'Bloquear' }).click()
  await linha.getByRole('button', { name: 'Sim, bloquear' }).click()
  await expect(linha).toContainText('bloqueado')
  await sair(page)

  await entrar(page, 'ana@exemplo.com')
  await expect(page.getByText('Seu acesso está bloqueado')).toBeVisible()
  await page.getByRole('button', { name: 'Sair' }).click()

  await entrar(page, 'admin@respawn.test', 'admin123')
  await page.goto('/usuarios')
  await page
    .locator('tr', { hasText: 'ana@exemplo.com' })
    .getByRole('button', { name: 'Desbloquear' })
    .click()
  await page.getByRole('button', { name: 'Sim, desbloquear' }).click()
  await sair(page)
  await entrar(page, 'ana@exemplo.com')
  await expect(page.getByRole('heading', { name: 'Meus contratos' })).toBeVisible()
})

test('carteira por cliente agrupa os contratos e abre a ficha', async ({ page }) => {
  await cadastrarCliente(page, 'Ana Teste', '11144477735')
  await contratar(page, 'Ana Teste')
  await contratar(page, 'Ana Teste')
  await cadastrarCliente(page, 'Bruno Sem Contrato', '52998224725')

  await page.goto('/contratos')
  await expect(page.locator('a.row-link')).toHaveCount(2)
  await page.getByRole('button', { name: 'Por cliente' }).click()
  await expect(page).toHaveURL(/visao=cliente/)

  const ana = page.locator('tr', { hasText: 'Ana Teste' })
  await expect(ana).toContainText('2 de 2')
  await expect(ana).toContainText('em dia')
  await expect(page.locator('tr', { hasText: 'Bruno Sem Contrato' })).toContainText(
    'sem contrato',
  )

  // a primeira linha é quem deve mais
  await expect(page.locator('tbody tr').first()).toContainText('Ana Teste')

  await ana.getByRole('link', { name: 'Ana Teste' }).click()
  await expect(page).toHaveURL(/\/clientes\/11144477735$/)
  await expect(page.getByRole('heading', { name: 'Ana Teste' })).toBeVisible()
  await expect(page.locator('.kpi', { hasText: 'Contratos ativos' })).toContainText(
    '2 de 2',
  )
  await expect(page.getByText('Ainda não criou acesso')).toBeVisible()
  await expect(
    page.locator('section', { hasText: 'Contratos' }).locator('a.row-link'),
  ).toHaveCount(2)

  await page.getByRole('link', { name: 'Nova simulação' }).click()
  await expect(page.getByTestId('cliente-escolhido')).toContainText('Ana Teste')
})

test('gestor vê a carteira por cliente mas não a tela de usuários', async ({ page }) => {
  await page.goto('/gestores')
  await page.getByLabel('Nome').fill('Gabi')
  await page.getByLabel('E-mail').fill('gabi@exemplo.com')
  await page.getByRole('button', { name: 'Cadastrar gestor' }).click()
  await sair(page)
  await page.goto('/criar-conta')
  await page.getByLabel('E-mail').fill('gabi@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill(SENHA)
  await page.getByLabel('Repita a senha').fill(SENHA)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await page.getByLabel('Seu nome').fill('Gabi')
  await page.getByRole('button', { name: 'Ativar acesso' }).click()

  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Usuários' }),
  ).toHaveCount(0)
  await page.goto('/usuarios')
  await expect(page).not.toHaveURL(/usuarios/)
  await page.goto('/contratos?visao=cliente')
  await expect(page.getByRole('button', { name: 'Por cliente' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
