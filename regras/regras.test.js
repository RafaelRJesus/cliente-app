// Roda no emulador do Firestore: npm run test:regras
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  where,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { classificarContrato, prefixoDoContrato } from '../src/lib/catalogo.js'

let env
const agora = '2026-11-13T12:00:00.000Z'

const cliente = (email, cpf = '52998224725', extra = {}) => ({
  nome: 'Maria Teste',
  email,
  telefone: '(51) 98888-7777',
  cpf: `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`,
  endereco: {
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    numero: '1',
    cidade: 'São Paulo',
    uf: 'SP',
  },
  criadoEm: agora,
  ...extra,
})

const parcela = (numero) => ({
  numero,
  vencimento: '2026-12-13',
  valor: 350.5,
  juros: 20,
  amortizacao: 330.5,
  saldo: 0,
})

const contrato = (clienteId, criadoPor, extra = {}) => ({
  clienteId,
  clienteNome: 'Maria Teste',
  produto: 'pessoal',
  detalhes: {},
  valor: 1000,
  taxaMensal: 0.02,
  prazo: 3,
  sistema: 'PRICE',
  dataContratacao: '2026-11-13',
  iof: 10,
  cetMensal: 0.025,
  parcelas: [parcela(1), parcela(2), parcela(3)],
  criadoEm: agora,
  criadoPor,
  // classificação do catálogo; o teste pode sobrescrever campo a campo
  ...classificarContrato(
    extra.produto ?? 'pessoal',
    ['RSP', 'FFC'].includes(extra.risco) ? extra.risco : 'RSP',
  ),
  ...extra,
})

const conta = (uid, email, verificado = true, provedor = 'password') =>
  env
    .authenticatedContext(uid, {
      email,
      email_verified: verificado,
      firebase: { sign_in_provider: provedor },
    })
    .firestore()

const admin = (provedor = 'google.com') =>
  conta('admin', 'admin@respawn.test', true, provedor)

// Grava o cliente com o próximo número e avança o contador, como o app faz.
function cadastrar(db, caminho, dados, numero = 3) {
  const lote = writeBatch(db)
  lote.set(doc(db, 'contadores/clientes'), { ultimo: numero })
  lote.set(doc(db, caminho), { ...dados, numero })
  return lote.commit()
}

// Contrata como o app: avança o contador do cliente e grava o contrato com
// o número PPP + CCCCCCC + SSS na mesma transação.
function contratar(db, clienteId, numeroCliente, sequencia = 1, extra = {}) {
  const dados = contrato(clienteId, 'gestor', extra)
  const numeroContrato =
    (extra.prefixo ?? prefixoDoContrato(dados.produto, dados.risco)) +
    String(numeroCliente).padStart(7, '0') +
    String(sequencia).padStart(3, '0')
  const lote = writeBatch(db)
  lote.update(doc(db, `clientes/${clienteId}`), { ultimoContrato: sequencia })
  const ref = doc(collection(db, 'contratos'))
  delete dados.prefixo
  // campo undefined = campo ausente (o SDK recusa undefined antes das regras)
  for (const campo of Object.keys(dados))
    if (dados[campo] === undefined) delete dados[campo]
  lote.set(ref, { ...dados, numeroContrato, sequencia })
  return lote.commit().then(() => ref)
}

const CPF_ANTIGO = '01234567890'
const CPF_MARIA = '52998224725'
const CPF_JOAO = '11144477735'

// Monta a carteira inicial sem passar pelas regras.
async function semear() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'contadores/clientes'), { ultimo: 2 })
    await setDoc(doc(db, 'usuarios/admin'), {
      papel: 'admin',
      email: 'admin@respawn.test',
      nome: 'Admin',
      criadoEm: agora,
    })
    await setDoc(doc(db, 'usuarios/gestor'), {
      papel: 'gestor',
      email: 'gestor@respawn.test',
      nome: 'Gestor',
      criadoEm: agora,
    })
    await setDoc(doc(db, 'gestores/gestor@respawn.test'), {
      nome: 'Gestor',
      criadoEm: agora,
    })
    await setDoc(
      doc(db, `clientes/${CPF_MARIA}`),
      cliente('maria@respawn.test', CPF_MARIA, { criadoPor: 'gestor', numero: 1 }),
    )
    await setDoc(
      doc(db, `clientes/${CPF_JOAO}`),
      cliente('joao@respawn.test', CPF_JOAO, { criadoPor: 'gestor', numero: 2 }),
    )
    // cadastro antigo, de antes do número do cliente
    await setDoc(
      doc(db, `clientes/${CPF_ANTIGO}`),
      cliente('antigo@respawn.test', CPF_ANTIGO, { criadoPor: 'gestor' }),
    )
    await setDoc(doc(db, 'usuarios/maria'), {
      papel: 'cliente',
      email: 'maria@respawn.test',
      nome: 'Maria',
      clienteId: CPF_MARIA,
      criadoEm: agora,
    })
    await setDoc(doc(db, 'contratos/da-maria'), contrato(CPF_MARIA, 'gestor'))
    await setDoc(doc(db, 'contratos/do-joao'), contrato(CPF_JOAO, 'gestor'))
  })
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-respawn',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
  await semear()
})

afterAll(() => env?.cleanup())

describe('sem login', () => {
  it('não lê nem grava nada', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDocs(collection(db, 'clientes')))
    await assertFails(getDoc(doc(db, 'contratos/da-maria')))
    await assertFails(cadastrar(db, `clientes/${CPF_MARIA}`, cliente('x@respawn.test')))
  })
})

describe('admin', () => {
  it('cadastra e remove gestor', async () => {
    const db = admin()
    await assertSucceeds(
      setDoc(doc(db, 'gestores/novo@respawn.test'), { nome: 'Novo', criadoEm: agora }),
    )
    await assertSucceeds(getDocs(collection(db, 'gestores')))
    await assertSucceeds(deleteDoc(doc(db, 'gestores/novo@respawn.test')))
  })

  it('com senha não tem poder de admin, só com Google', async () => {
    const db = admin('password')
    await assertFails(getDocs(collection(db, 'clientes')))
    await assertFails(
      setDoc(doc(db, 'gestores/novo@respawn.test'), { nome: 'Novo', criadoEm: agora }),
    )
  })

  it('vê a carteira inteira', async () => {
    const db = admin()
    await assertSucceeds(getDocs(collection(db, 'clientes')))
    await assertSucceeds(getDocs(collection(db, 'contratos')))
  })
})

describe('gestor', () => {
  const db = () => conta('gestor', 'gestor@respawn.test')

  it('não cadastra outro gestor', async () => {
    await assertFails(
      setDoc(doc(db(), 'gestores/amigo@respawn.test'), {
        nome: 'Amigo',
        criadoEm: agora,
      }),
    )
  })

  it('vê todos os clientes e contratos', async () => {
    await assertSucceeds(getDocs(collection(db(), 'clientes')))
    await assertSucceeds(getDocs(collection(db(), 'contratos')))
  })

  it('cadastra cliente com o CPF como id', async () => {
    const cpf = '39053344705'
    await assertSucceeds(
      cadastrar(
        db(),
        `clientes/${cpf}`,
        cliente('ana@respawn.test', cpf, { criadoPor: 'gestor' }),
      ),
    )
  })

  it('não cadastra cliente com id diferente do CPF', async () => {
    await assertFails(
      cadastrar(
        db(),
        'clientes/39053344705',
        cliente('ana@respawn.test', CPF_JOAO, { criadoPor: 'gestor' }),
      ),
    )
  })

  it('não sobrescreve cliente existente', async () => {
    await assertFails(
      cadastrar(
        db(),
        `clientes/${CPF_MARIA}`,
        cliente('outro@respawn.test', CPF_MARIA, { criadoPor: 'gestor' }),
      ),
    )
  })

  it('contrata para cliente existente e registra pagamento', async () => {
    const ref = await assertSucceeds(contratar(db(), CPF_JOAO, 2))
    const parcelas = [
      { ...parcela(1), pagaEm: '2026-12-13', valorPago: 350.5 },
      parcela(2),
      parcela(3),
    ]
    await assertSucceeds(updateDoc(ref, { parcelas }))
    await assertFails(updateDoc(ref, { valor: 1 }))
  })

  it('registra a forma de pagamento, só entre as aceitas', async () => {
    const pagar = (formaPagamento) =>
      updateDoc(doc(db(), 'contratos/do-joao'), {
        parcelas: [
          { ...parcela(1), pagaEm: '2026-12-13', valorPago: 350.5, formaPagamento },
          parcela(2),
          parcela(3),
        ],
      })
    await assertFails(pagar('cheque'))
    await assertSucceeds(pagar('dinheiro'))
  })

  it('não contrata para CPF sem cadastro', async () => {
    await assertFails(contratar(db(), '39053344705', 3))
  })

  it('perde o acesso quando o admin remove o convite', async () => {
    await deleteDoc(doc(admin(), 'gestores/gestor@respawn.test'))
    await assertFails(getDocs(collection(db(), 'clientes')))
    await assertFails(getDoc(doc(db(), 'contratos/do-joao')))
  })

  it('não se promove a admin', async () => {
    await assertFails(updateDoc(doc(db(), 'usuarios/gestor'), { papel: 'admin' }))
  })
})

describe('cliente', () => {
  const maria = () => conta('maria', 'maria@respawn.test')

  it('lê o próprio cadastro e só os próprios contratos', async () => {
    await assertSucceeds(getDoc(doc(maria(), `clientes/${CPF_MARIA}`)))
    await assertSucceeds(getDoc(doc(maria(), 'contratos/da-maria')))
    await assertSucceeds(
      getDocs(
        query(collection(maria(), 'contratos'), where('clienteId', '==', CPF_MARIA)),
      ),
    )
  })

  it('não vê dados de outro cliente', async () => {
    await assertFails(getDoc(doc(maria(), `clientes/${CPF_JOAO}`)))
    await assertFails(getDoc(doc(maria(), 'contratos/do-joao')))
    await assertFails(getDocs(collection(maria(), 'contratos')))
    await assertFails(getDocs(collection(maria(), 'clientes')))
    await assertFails(
      getDocs(
        query(collection(maria(), 'contratos'), where('clienteId', '==', CPF_JOAO)),
      ),
    )
  })

  it('paga parcela do próprio contrato, mas não do alheio', async () => {
    const parcelas = [
      { ...parcela(1), pagaEm: '2026-12-13', valorPago: 350.5 },
      parcela(2),
      parcela(3),
    ]
    await assertSucceeds(updateDoc(doc(maria(), 'contratos/da-maria'), { parcelas }))
    await assertFails(updateDoc(doc(maria(), 'contratos/do-joao'), { parcelas }))
    await assertFails(updateDoc(doc(maria(), 'contratos/da-maria'), { taxaMensal: 0 }))
  })

  it('não contrata nem apaga', async () => {
    await assertFails(
      addDoc(collection(maria(), 'contratos'), contrato(CPF_MARIA, 'maria')),
    )
    await assertFails(deleteDoc(doc(maria(), 'contratos/da-maria')))
  })

  it('não troca o próprio papel nem o CPF vinculado', async () => {
    await assertFails(updateDoc(doc(maria(), 'usuarios/maria'), { papel: 'gestor' }))
    await assertFails(updateDoc(doc(maria(), 'usuarios/maria'), { clienteId: CPF_JOAO }))
  })
})

describe('número do cliente', () => {
  const gestor = () => conta('gestor', 'gestor@respawn.test')
  const nova = (cpf) => cliente('nova@respawn.test', cpf, { criadoPor: 'gestor' })

  it('é o próximo do contador', async () => {
    await assertSucceeds(
      cadastrar(gestor(), 'clientes/39053344705', nova('39053344705'), 3),
    )
  })

  it('não pula nem repete número', async () => {
    await assertFails(cadastrar(gestor(), 'clientes/39053344705', nova('39053344705'), 4))
    await assertFails(cadastrar(gestor(), 'clientes/39053344705', nova('39053344705'), 2))
  })

  it('não cadastra sem avançar o contador', async () => {
    await assertFails(
      setDoc(doc(gestor(), 'clientes/39053344705'), {
        ...nova('39053344705'),
        numero: 3,
      }),
    )
  })

  it('não cadastra sem número', async () => {
    await assertFails(setDoc(doc(gestor(), 'clientes/39053344705'), nova('39053344705')))
  })

  it('contador só anda de 1 em 1', async () => {
    await assertFails(updateDoc(doc(gestor(), 'contadores/clientes'), { ultimo: 10 }))
    await assertFails(updateDoc(doc(gestor(), 'contadores/clientes'), { ultimo: 1 }))
  })

  it('equipe numera cadastro antigo sem número, uma vez só', async () => {
    const g = gestor() // o lote e os documentos têm de ser da mesma conexão
    const lote = writeBatch(g)
    lote.update(doc(g, 'contadores/clientes'), { ultimo: 3 })
    lote.update(doc(g, `clientes/${CPF_ANTIGO}`), { numero: 3 })
    await assertSucceeds(lote.commit())

    const denovo = writeBatch(g)
    denovo.update(doc(g, 'contadores/clientes'), { ultimo: 4 })
    denovo.update(doc(g, `clientes/${CPF_ANTIGO}`), { numero: 4 })
    await assertFails(denovo.commit())
  })

  it('cliente não numera o próprio cadastro', async () => {
    const maria = conta('maria', 'maria@respawn.test')
    const lote = writeBatch(maria)
    lote.update(doc(maria, 'contadores/clientes'), { ultimo: 3 })
    lote.update(doc(maria, `clientes/${CPF_MARIA}`), { numero: 3 })
    await assertFails(lote.commit())
  })
})

describe('número do contrato', () => {
  const gestor = () => conta('gestor', 'gestor@respawn.test')

  it('PPP + número do cliente + sequência, e a sequência continua', async () => {
    await assertSucceeds(contratar(gestor(), CPF_JOAO, 2, 1))
    await assertSucceeds(contratar(gestor(), CPF_JOAO, 2, 2, { produto: 'pix' }))
  })

  it('sequência não pula nem repete', async () => {
    await assertFails(contratar(gestor(), CPF_JOAO, 2, 2))
    await assertSucceeds(contratar(gestor(), CPF_JOAO, 2, 1))
    await assertFails(contratar(gestor(), CPF_JOAO, 2, 1))
  })

  it('prefixo tem de ser o do produto', async () => {
    const g = gestor()
    const lote = writeBatch(g)
    lote.update(doc(g, `clientes/${CPF_JOAO}`), { ultimoContrato: 1 })
    lote.set(doc(collection(g, 'contratos')), {
      ...contrato(CPF_JOAO, 'gestor'),
      numeroContrato: '1050000002001', // 105 = Pix, mas o produto é pessoal
      sequencia: 1,
    })
    await assertFails(lote.commit())
  })

  it('risco Fundo Financeiro usa o prefixo 2xx', async () => {
    await assertSucceeds(
      contratar(gestor(), CPF_JOAO, 2, 1, { produto: 'pix', risco: 'FFC' }),
    )
  })

  it('o 1º dígito do número tem de ser o do risco', async () => {
    await assertFails(
      contratar(gestor(), CPF_JOAO, 2, 1, { risco: 'FFC', prefixo: '101' }),
    )
    await assertFails(contratar(gestor(), CPF_JOAO, 2, 1, { prefixo: '201' }))
  })

  it('sigla, risco e razão especial têm de ser os do catálogo', async () => {
    await assertFails(contratar(gestor(), CPF_JOAO, 2, 1, { sigla: 'PXP' }))
    await assertFails(contratar(gestor(), CPF_JOAO, 2, 1, { razaoEspecial: 'F' }))
    await assertFails(
      contratar(gestor(), CPF_JOAO, 2, 1, {
        risco: 'CPR',
        sigla: 'EMP',
        razaoEspecial: 'E',
        prefixo: '301',
      }),
    )
  })

  it('contrato novo sem os campos do catálogo é recusado', async () => {
    await assertFails(
      contratar(gestor(), CPF_JOAO, 2, 1, {
        sigla: undefined,
        risco: undefined,
        razaoEspecial: undefined,
        prefixo: '101',
      }),
    )
  })

  it('número do cliente no meio tem de ser o dele', async () => {
    await assertFails(contratar(gestor(), CPF_JOAO, 1, 1))
  })

  it('cliente sem número não recebe contrato', async () => {
    await assertFails(contratar(gestor(), CPF_ANTIGO, 0, 1))
  })

  it('contrato sem número é recusado', async () => {
    await assertFails(
      addDoc(collection(gestor(), 'contratos'), contrato(CPF_JOAO, 'gestor')),
    )
  })

  it('cliente não mexe no contador de contratos', async () => {
    await assertFails(
      updateDoc(doc(conta('maria', 'maria@respawn.test'), `clientes/${CPF_MARIA}`), {
        ultimoContrato: 1,
      }),
    )
  })
})

describe('bloqueio de usuários', () => {
  it('admin bloqueia e desbloqueia cliente e gestor', async () => {
    await assertSucceeds(updateDoc(doc(admin(), 'usuarios/maria'), { bloqueado: true }))
    await assertSucceeds(updateDoc(doc(admin(), 'usuarios/maria'), { bloqueado: false }))
    await assertSucceeds(updateDoc(doc(admin(), 'usuarios/gestor'), { bloqueado: true }))
  })

  it('admin lista todos os perfis', async () => {
    await assertSucceeds(getDocs(collection(admin(), 'usuarios')))
  })

  it('admin não muda papel nem bloqueia outro admin', async () => {
    await assertFails(updateDoc(doc(admin(), 'usuarios/maria'), { papel: 'gestor' }))
    await assertFails(updateDoc(doc(admin(), 'usuarios/admin'), { bloqueado: true }))
    await assertFails(updateDoc(doc(admin(), 'usuarios/maria'), { bloqueado: 'sim' }))
  })

  it('gestor não bloqueia ninguém', async () => {
    await assertFails(
      updateDoc(doc(conta('gestor', 'gestor@respawn.test'), 'usuarios/maria'), {
        bloqueado: true,
      }),
    )
  })

  it('cliente bloqueado não vê os próprios contratos', async () => {
    await updateDoc(doc(admin(), 'usuarios/maria'), { bloqueado: true })
    const maria = conta('maria', 'maria@respawn.test')
    await assertFails(getDoc(doc(maria, 'contratos/da-maria')))
    await assertFails(getDoc(doc(maria, `clientes/${CPF_MARIA}`)))
  })

  it('gestor bloqueado perde a carteira', async () => {
    await updateDoc(doc(admin(), 'usuarios/gestor'), { bloqueado: true })
    await assertFails(
      getDocs(collection(conta('gestor', 'gestor@respawn.test'), 'clientes')),
    )
  })
})

describe('criação de conta', () => {
  const perfilCliente = (email, clienteId) => ({
    papel: 'cliente',
    email,
    nome: 'Novo',
    clienteId,
    criadoEm: agora,
  })

  it('cliente pré-cadastrado se vincula com CPF e e-mail iguais', async () => {
    const db = conta('joao', 'joao@respawn.test')
    await assertSucceeds(
      setDoc(doc(db, 'usuarios/joao'), perfilCliente('joao@respawn.test', CPF_JOAO)),
    )
    await assertSucceeds(getDoc(doc(db, 'contratos/do-joao')))
  })

  it('não se vincula ao CPF de outra pessoa', async () => {
    const db = conta('intruso', 'intruso@respawn.test')
    await assertFails(
      setDoc(
        doc(db, 'usuarios/intruso'),
        perfilCliente('intruso@respawn.test', CPF_JOAO),
      ),
    )
  })

  it('não se vincula sem e-mail confirmado', async () => {
    const db = conta('joao', 'joao@respawn.test', false)
    await assertFails(
      setDoc(doc(db, 'usuarios/joao'), perfilCliente('joao@respawn.test', CPF_JOAO)),
    )
  })

  it('não se declara admin', async () => {
    const db = conta('esperto', 'esperto@respawn.test')
    await assertFails(
      setDoc(doc(db, 'usuarios/esperto'), {
        papel: 'admin',
        email: 'esperto@respawn.test',
        nome: 'X',
        criadoEm: agora,
      }),
    )
  })

  it('não vira gestor sem convite', async () => {
    const db = conta('esperto', 'esperto@respawn.test')
    await assertFails(
      setDoc(doc(db, 'usuarios/esperto'), {
        papel: 'gestor',
        email: 'esperto@respawn.test',
        nome: 'X',
        criadoEm: agora,
      }),
    )
  })

  it('gestor convidado ativa a conta', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'gestores/novo@respawn.test'), {
        nome: 'Novo',
        criadoEm: agora,
      }),
    )
    const db = conta('novo', 'novo@respawn.test')
    await assertSucceeds(
      setDoc(doc(db, 'usuarios/novo'), {
        papel: 'gestor',
        email: 'novo@respawn.test',
        nome: 'Novo',
        criadoEm: agora,
      }),
    )
  })

  it('cliente novo se cadastra com o próprio e-mail e depois cria o perfil', async () => {
    const cpf = '39053344705'
    const db = conta('ana', 'ana@respawn.test')
    await assertSucceeds(
      cadastrar(
        db,
        `clientes/${cpf}`,
        cliente('ana@respawn.test', cpf, { criadoPor: 'ana' }),
      ),
    )
    await assertSucceeds(
      setDoc(doc(db, 'usuarios/ana'), perfilCliente('ana@respawn.test', cpf)),
    )
  })

  it('cliente novo não cadastra outra pessoa', async () => {
    const db = conta('ana', 'ana@respawn.test')
    await assertFails(
      cadastrar(
        db,
        'clientes/39053344705',
        cliente('outra@respawn.test', '39053344705', { criadoPor: 'ana' }),
      ),
    )
  })

  it('cliente já vinculado não cria outro cadastro', async () => {
    await assertFails(
      setDoc(
        doc(conta('maria', 'maria@respawn.test'), 'clientes/39053344705'),
        cliente('maria@respawn.test', '39053344705', { criadoPor: 'maria' }),
      ),
    )
  })
})
