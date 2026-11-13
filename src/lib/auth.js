import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, firebaseEnabled } from './firebase'

// Mesma interface com Firebase ou só no navegador (sem .env.local / testes de tela).
// Usuário exposto ao app: { uid, email, verificado }.

const MENSAGENS = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão. Verifique a internet.',
}

export class ErroAuth extends Error {
  constructor(code) {
    super(MENSAGENS[code] ?? 'Não foi possível concluir. Tente de novo.')
    this.code = code
  }
}

const traduzir = (err) => {
  throw err instanceof ErroAuth ? err : new ErroAuth(err.code)
}

const paraUsuario = (u) =>
  u
    ? { uid: u.uid, email: u.email?.toLowerCase() ?? '', verificado: u.emailVerified }
    : null

function firebaseAuth() {
  return {
    observar: (cb) => onAuthStateChanged(auth, (u) => cb(paraUsuario(u))),

    entrar: (email, senha) =>
      signInWithEmailAndPassword(auth, email.trim(), senha).catch(traduzir),

    async criarConta(email, senha) {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha).catch(
        traduzir,
      )
      await sendEmailVerification(cred.user)
    },

    reenviarConfirmacao: () => sendEmailVerification(auth.currentUser).catch(traduzir),

    // Depois de clicar no link do e-mail o token antigo ainda diz "não verificado".
    async recarregar() {
      await auth.currentUser.reload()
      await auth.currentUser.getIdToken(true)
      return paraUsuario(auth.currentUser)
    },

    redefinirSenha: (email) => sendPasswordResetEmail(auth, email.trim()).catch(traduzir),

    sair: () => signOut(auth),
  }
}

// ---- modo local -------------------------------------------------------------

export const ADMIN_LOCAL = { email: 'admin@rjbank.test', senha: 'admin123' }

const CONTAS = 'rjbank:contas'
const SESSAO = 'rjbank:sessao'
const ler = (k, padrao) => JSON.parse(localStorage.getItem(k) ?? JSON.stringify(padrao))
const gravar = (k, v) => localStorage.setItem(k, JSON.stringify(v))

function localAuth() {
  const ouvintes = new Set()
  const atual = () => {
    const uid = localStorage.getItem(SESSAO)
    const conta = ler(CONTAS, []).find((c) => c.uid === uid)
    return conta ? { uid: conta.uid, email: conta.email, verificado: true } : null
  }
  const avisar = () => ouvintes.forEach((cb) => cb(atual()))

  // Admin de exemplo: só existe no modo local, para dar para testar sem Firebase.
  if (!ler(CONTAS, []).some((c) => c.email === ADMIN_LOCAL.email)) {
    gravar(CONTAS, [...ler(CONTAS, []), { uid: 'admin-local', ...ADMIN_LOCAL }])
    gravar('rjbank:usuarios', {
      ...ler('rjbank:usuarios', {}),
      'admin-local': { papel: 'admin', email: ADMIN_LOCAL.email, nome: 'Admin local' },
    })
  }

  return {
    observar(cb) {
      ouvintes.add(cb)
      cb(atual())
      return () => ouvintes.delete(cb)
    },

    async entrar(email, senha) {
      const conta = ler(CONTAS, []).find(
        (c) => c.email === email.trim().toLowerCase() && c.senha === senha,
      )
      if (!conta) throw new ErroAuth('auth/invalid-credential')
      localStorage.setItem(SESSAO, conta.uid)
      avisar()
    },

    async criarConta(email, senha) {
      const e = email.trim().toLowerCase()
      const contas = ler(CONTAS, [])
      if (contas.some((c) => c.email === e))
        throw new ErroAuth('auth/email-already-in-use')
      if (senha.length < 6) throw new ErroAuth('auth/weak-password')
      const uid = crypto.randomUUID()
      gravar(CONTAS, [...contas, { uid, email: e, senha }])
      localStorage.setItem(SESSAO, uid)
      avisar()
    },

    reenviarConfirmacao: async () => {},
    recarregar: async () => atual(),
    redefinirSenha: async () => {},

    async sair() {
      localStorage.removeItem(SESSAO)
      avisar()
    },
  }
}

export const authService = firebaseEnabled ? firebaseAuth() : localAuth()
