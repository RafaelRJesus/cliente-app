import { cadastrarCliente, contratar, expect, test } from './fixtures'

// Papéis no modo local (sem Firebase): admin de exemplo, gestor convidado e cliente.

const SENHA = 'senha123'

async function sair(page) {
  await page.locator('.usuario').getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/entrar$/)
}

async function entrar(page, email, senha = SENHA) {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

async function criarConta(page, email) {
  await page.goto('/criar-conta')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(SENHA)
  await page.getByLabel('Repita a senha').fill(SENHA)
  await page.getByRole('button', { name: 'Criar conta' }).click()
}

async function informarCpf(page, nome, cpf) {
  await page.getByLabel('Nome').fill(nome)
  await page.getByLabel('CPF').fill(cpf)
  await page.getByRole('button', { name: 'Continuar' }).click()
}

const menu = (page) => page.getByRole('navigation')

test.describe('sem login', () => {
  test.use({ sessao: null })

  test('qualquer rota leva ao login', async ({ page }) => {
    await page.goto('/contratos')
    await expect(page).toHaveURL(/\/entrar$/)
  })

  test('senha errada não entra', async ({ page }) => {
    await entrar(page, 'admin@rjbank.test', 'errada')
    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
  })

  test('senhas diferentes na criação de conta', async ({ page }) => {
    await page.goto('/criar-conta')
    await page.getByLabel('E-mail').fill('x@exemplo.com')
    await page.getByLabel('Senha', { exact: true }).fill(SENHA)
    await page.getByLabel('Repita a senha').fill('outra123')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()
  })

  test('admin entra e vê o menu completo', async ({ page }) => {
    await entrar(page, 'admin@rjbank.test', 'admin123')
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Gestores' })).toBeVisible()
  })
})

test('admin cadastra gestor, que entra sem ver a tela de gestores', async ({ page }) => {
  await page.goto('/gestores')
  await page.getByLabel('Nome').fill('Gabi Gestora')
  await page.getByLabel('E-mail').fill('gabi@exemplo.com')
  await page.getByRole('button', { name: 'Cadastrar gestor' }).click()
  await expect(page.locator('.list-item', { hasText: 'gabi@exemplo.com' })).toBeVisible()
  await cadastrarCliente(page)
  await sair(page)

  await criarConta(page, 'gabi@exemplo.com')
  await expect(page.getByRole('heading', { name: 'Acesso de gestor' })).toBeVisible()
  await page.getByLabel('Seu nome').fill('Gabi Gestora')
  await page.getByRole('button', { name: 'Ativar acesso' }).click()

  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Gestores' })).toHaveCount(0)
  await page.goto('/clientes')
  await expect(page.locator('.list-item', { hasText: 'Ana Teste' })).toBeVisible()
  await page.goto('/gestores')
  await expect(page).toHaveURL(/\/$/)
})

test('gestor removido perde o acesso', async ({ page }) => {
  await page.goto('/gestores')
  await page.getByLabel('Nome').fill('Beto')
  await page.getByLabel('E-mail').fill('beto@exemplo.com')
  await page.getByRole('button', { name: 'Cadastrar gestor' }).click()
  await sair(page)
  await criarConta(page, 'beto@exemplo.com')
  await page.getByLabel('Seu nome').fill('Beto')
  await page.getByRole('button', { name: 'Ativar acesso' }).click()
  await sair(page)

  await entrar(page, 'admin@rjbank.test', 'admin123')
  await page.goto('/gestores')
  const item = page.locator('.list-item', { hasText: 'beto@exemplo.com' })
  await item.getByRole('button', { name: 'Remover' }).click()
  await item.getByRole('button', { name: 'Sim, remover' }).click()
  await sair(page)

  await entrar(page, 'beto@exemplo.com')
  await expect(page.getByText('Seu acesso de gestor foi removido')).toBeVisible()
})

test('cliente pré-cadastrado vê só os próprios contratos e pode pagar', async ({
  page,
}) => {
  // carteira com dois clientes, cada um com um contrato
  await cadastrarCliente(page, 'Ana Teste', '11144477735')
  await contratar(page, 'Ana Teste')
  await cadastrarCliente(page, 'Bruno Outro', '52998224725')
  await contratar(page, 'Bruno Outro')
  await sair(page)

  // cadastrarCliente usa ana@exemplo.com para todos; o vínculo exige CPF + e-mail
  await criarConta(page, 'ana@exemplo.com')
  await informarCpf(page, 'Ana Teste', '11144477735')

  await expect(page.getByRole('heading', { name: 'Meus contratos' })).toBeVisible()
  await expect(page.locator('a.row-link')).toHaveCount(1)
  await expect(page.locator('a.row-link')).toHaveText('Ana Teste')
  await expect(menu(page).getByRole('link', { name: 'Clientes' })).toHaveCount(0)

  await page.locator('a.row-link').click()
  await expect(page.getByRole('button', { name: 'Excluir contrato' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Pagar' }).first().click()
  // cliente não registra pagamento em dinheiro (é só no balcão)
  const formas = page.getByRole('group', { name: 'Forma de pagamento' })
  await expect(formas.getByRole('radio', { name: 'Dinheiro' })).toHaveCount(0)
  await expect(formas.getByRole('radio')).toHaveCount(4)
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(page.getByText('Parcela 1 paga (Pix).')).toBeVisible()

  await page.goto('/simulador')
  await expect(page.getByText('Para contratar, fale com seu gestor.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Contratar' })).toHaveCount(0)

  await page.goto('/clientes')
  await expect(page).toHaveURL(/\/contratos$/)
})

test.describe('cliente sem cadastro', () => {
  test.use({ sessao: null })

  test('faz o próprio cadastro e começa sem contratos', async ({ page }) => {
    await criarConta(page, 'nova@exemplo.com')
    await informarCpf(page, 'Nova Cliente', '39053344705')

    await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible()
    await expect(page.getByLabel('E-mail')).toHaveValue('nova@exemplo.com')
    await page.getByLabel('Telefone').fill('51988887777')
    await page.getByLabel('CEP').fill('01001000')
    await expect(page.getByLabel('Cidade')).toHaveValue('São Paulo')
    await page.getByLabel('Número').fill('10')
    await page.getByRole('button', { name: 'Concluir cadastro' }).click()

    await expect(page.getByRole('heading', { name: 'Meus contratos' })).toBeVisible()
    await expect(page.getByText('Nenhum contrato nesta situação.')).toBeVisible()
    await expect(page.locator('.usuario')).toContainText('Cliente')
  })
})

test('CPF cadastrado com outro e-mail não é assumido', async ({ page }) => {
  await cadastrarCliente(page, 'Ana Teste', '11144477735')
  await sair(page)

  await criarConta(page, 'golpe@exemplo.com')
  await informarCpf(page, 'Ana Teste', '11144477735')
  await page.getByLabel('Telefone').fill('51988887777')
  await page.getByLabel('CEP').fill('01001000')
  await expect(page.getByLabel('Cidade')).toHaveValue('São Paulo')
  await page.getByLabel('Número').fill('10')
  await page.getByRole('button', { name: 'Concluir cadastro' }).click()

  await expect(
    page.getByText('Esse CPF já está cadastrado com outro e-mail'),
  ).toBeVisible()
})
