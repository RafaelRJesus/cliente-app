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
  where,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

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

const admin = (provedor = 'google.com') => conta('admin', 'admin@rj.test', true, provedor)

const CPF_MARIA = '52998224725'
const CPF_JOAO = '11144477735'

// Monta a carteira inicial sem passar pelas regras.
async function semear() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'usuarios/admin'), {
      papel: 'admin',
      email: 'admin@rj.test',
      nome: 'Admin',
      criadoEm: agora,
    })
    await setDoc(doc(db, 'usuarios/gestor'), {
      papel: 'gestor',
      email: 'gestor@rj.test',
      nome: 'Gestor',
      criadoEm: agora,
    })
    await setDoc(doc(db, 'gestores/gestor@rj.test'), { nome: 'Gestor', criadoEm: agora })
    await setDoc(
      doc(db, `clientes/${CPF_MARIA}`),
      cliente('maria@rj.test', CPF_MARIA, { criadoPor: 'gestor' }),
    )
    await setDoc(
      doc(db, `clientes/${CPF_JOAO}`),
      cliente('joao@rj.test', CPF_JOAO, { criadoPor: 'gestor' }),
    )
    await setDoc(doc(db, 'usuarios/maria'), {
      papel: 'cliente',
      email: 'maria@rj.test',
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
    projectId: 'demo-rjbank',
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
    await assertFails(setDoc(doc(db, `clientes/${CPF_MARIA}`), cliente('x@rj.test')))
  })
})

describe('admin', () => {
  it('cadastra e remove gestor', async () => {
    const db = admin()
    await assertSucceeds(
      setDoc(doc(db, 'gestores/novo@rj.test'), { nome: 'Novo', criadoEm: agora }),
    )
    await assertSucceeds(getDocs(collection(db, 'gestores')))
    await assertSucceeds(deleteDoc(doc(db, 'gestores/novo@rj.test')))
  })

  it('com senha não tem poder de admin, só com Google', async () => {
    const db = admin('password')
    await assertFails(getDocs(collection(db, 'clientes')))
    await assertFails(
      setDoc(doc(db, 'gestores/novo@rj.test'), { nome: 'Novo', criadoEm: agora }),
    )
  })

  it('vê a carteira inteira', async () => {
    const db = admin()
    await assertSucceeds(getDocs(collection(db, 'clientes')))
    await assertSucceeds(getDocs(collection(db, 'contratos')))
  })
})

describe('gestor', () => {
  const db = () => conta('gestor', 'gestor@rj.test')

  it('não cadastra outro gestor', async () => {
    await assertFails(
      setDoc(doc(db(), 'gestores/amigo@rj.test'), { nome: 'Amigo', criadoEm: agora }),
    )
  })

  it('vê todos os clientes e contratos', async () => {
    await assertSucceeds(getDocs(collection(db(), 'clientes')))
    await assertSucceeds(getDocs(collection(db(), 'contratos')))
  })

  it('cadastra cliente com o CPF como id', async () => {
    const cpf = '39053344705'
    await assertSucceeds(
      setDoc(
        doc(db(), `clientes/${cpf}`),
        cliente('ana@rj.test', cpf, { criadoPor: 'gestor' }),
      ),
    )
  })

  it('não cadastra cliente com id diferente do CPF', async () => {
    await assertFails(
      setDoc(
        doc(db(), 'clientes/39053344705'),
        cliente('ana@rj.test', CPF_JOAO, { criadoPor: 'gestor' }),
      ),
    )
  })

  it('não sobrescreve cliente existente', async () => {
    await assertFails(
      setDoc(
        doc(db(), `clientes/${CPF_MARIA}`),
        cliente('outro@rj.test', CPF_MARIA, { criadoPor: 'gestor' }),
      ),
    )
  })

  it('contrata para cliente existente e registra pagamento', async () => {
    const ref = await assertSucceeds(
      addDoc(collection(db(), 'contratos'), contrato(CPF_JOAO, 'gestor')),
    )
    const parcelas = [
      { ...parcela(1), pagaEm: '2026-12-13', valorPago: 350.5 },
      parcela(2),
      parcela(3),
    ]
    await assertSucceeds(updateDoc(ref, { parcelas }))
    await assertFails(updateDoc(ref, { valor: 1 }))
  })

  it('não contrata para CPF sem cadastro', async () => {
    await assertFails(
      addDoc(collection(db(), 'contratos'), contrato('39053344705', 'gestor')),
    )
  })

  it('perde o acesso quando o admin remove o convite', async () => {
    await deleteDoc(doc(admin(), 'gestores/gestor@rj.test'))
    await assertFails(getDocs(collection(db(), 'clientes')))
    await assertFails(getDoc(doc(db(), 'contratos/do-joao')))
  })

  it('não se promove a admin', async () => {
    await assertFails(updateDoc(doc(db(), 'usuarios/gestor'), { papel: 'admin' }))
  })
})

describe('cliente', () => {
  const maria = () => conta('maria', 'maria@rj.test')

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
      updateDoc(doc(conta('gestor', 'gestor@rj.test'), 'usuarios/maria'), {
        bloqueado: true,
      }),
    )
  })

  it('cliente bloqueado não vê os próprios contratos', async () => {
    await updateDoc(doc(admin(), 'usuarios/maria'), { bloqueado: true })
    const maria = conta('maria', 'maria@rj.test')
    await assertFails(getDoc(doc(maria, 'contratos/da-maria')))
    await assertFails(getDoc(doc(maria, `clientes/${CPF_MARIA}`)))
  })

  it('gestor bloqueado perde a carteira', async () => {
    await updateDoc(doc(admin(), 'usuarios/gestor'), { bloqueado: true })
    await assertFails(getDocs(collection(conta('gestor', 'gestor@rj.test'), 'clientes')))
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
    const db = conta('joao', 'joao@rj.test')
    await assertSucceeds(
      setDoc(doc(db, 'usuarios/joao'), perfilCliente('joao@rj.test', CPF_JOAO)),
    )
    await assertSucceeds(getDoc(doc(db, 'contratos/do-joao')))
  })

  it('não se vincula ao CPF de outra pessoa', async () => {
    const db = conta('intruso', 'intruso@rj.test')
    await assertFails(
      setDoc(doc(db, 'usuarios/intruso'), perfilCliente('intruso@rj.test', CPF_JOAO)),
    )
  })

  it('não se vincula sem e-mail confirmado', async () => {
    const db = conta('joao', 'joao@rj.test', false)
    await assertFails(
      setDoc(doc(db, 'usuarios/joao'), perfilCliente('joao@rj.test', CPF_JOAO)),
    )
  })

  it('não se declara admin', async () => {
    const db = conta('esperto', 'esperto@rj.test')
    await assertFails(
      setDoc(doc(db, 'usuarios/esperto'), {
        papel: 'admin',
        email: 'esperto@rj.test',
        nome: 'X',
        criadoEm: agora,
      }),
    )
  })

  it('não vira gestor sem convite', async () => {
    const db = conta('esperto', 'esperto@rj.test')
    await assertFails(
      setDoc(doc(db, 'usuarios/esperto'), {
        papel: 'gestor',
        email: 'esperto@rj.test',
        nome: 'X',
        criadoEm: agora,
      }),
    )
  })

  it('gestor convidado ativa a conta', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'gestores/novo@rj.test'), {
        nome: 'Novo',
        criadoEm: agora,
      }),
    )
    const db = conta('novo', 'novo@rj.test')
    await assertSucceeds(
      setDoc(doc(db, 'usuarios/novo'), {
        papel: 'gestor',
        email: 'novo@rj.test',
        nome: 'Novo',
        criadoEm: agora,
      }),
    )
  })

  it('cliente novo se cadastra com o próprio e-mail e depois cria o perfil', async () => {
    const cpf = '39053344705'
    const db = conta('ana', 'ana@rj.test')
    await assertSucceeds(
      setDoc(
        doc(db, `clientes/${cpf}`),
        cliente('ana@rj.test', cpf, { criadoPor: 'ana' }),
      ),
    )
    await assertSucceeds(
      setDoc(doc(db, 'usuarios/ana'), perfilCliente('ana@rj.test', cpf)),
    )
  })

  it('cliente novo não cadastra outra pessoa', async () => {
    const db = conta('ana', 'ana@rj.test')
    await assertFails(
      setDoc(
        doc(db, 'clientes/39053344705'),
        cliente('outra@rj.test', '39053344705', { criadoPor: 'ana' }),
      ),
    )
  })

  it('cliente já vinculado não cria outro cadastro', async () => {
    await assertFails(
      setDoc(
        doc(conta('maria', 'maria@rj.test'), 'clientes/39053344705'),
        cliente('maria@rj.test', '39053344705', { criadoPor: 'maria' }),
      ),
    )
  })
})
