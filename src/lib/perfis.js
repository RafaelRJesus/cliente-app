import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase'
import { onlyDigits } from './format'

// Perfil = papel de quem está logado: { uid, email, nome, papel, clienteId? }.
// admin e gestor formam a "equipe" e enxergam a carteira toda.
export const PAPEIS = { admin: 'Administrador', gestor: 'Gestor', cliente: 'Cliente' }
export const ehEquipe = (perfil) =>
  perfil?.papel === 'admin' || perfil?.papel === 'gestor'

export class ErroVinculo extends Error {}

const REVOGADO = new ErroVinculo(
  'Seu acesso de gestor foi removido. Fale com o administrador.',
)
const ADMIN_SO_GOOGLE = new ErroVinculo(
  'O administrador entra só com o Google. Saia e use "Entrar com Google".',
)

const negado = (err) => err?.code === 'permission-denied'
const agora = () => new Date().toISOString()

function firestorePerfis() {
  return {
    async carregar(user) {
      const snap = await getDoc(doc(db, 'usuarios', user.uid))
      if (!snap.exists()) return null
      const perfil = { uid: user.uid, ...snap.data() }
      if (perfil.papel === 'gestor' && !(await this.conviteDeGestor(user))) throw REVOGADO
      if (perfil.papel === 'admin' && user.provedor !== 'google.com')
        throw ADMIN_SO_GOOGLE
      return perfil
    },

    async conviteDeGestor(user) {
      try {
        const snap = await getDoc(doc(db, 'gestores', user.email))
        return snap.exists() ? snap.data() : null
      } catch (err) {
        if (negado(err)) return null
        throw err
      }
    },

    async ativarGestor(user, nome) {
      const perfil = { papel: 'gestor', email: user.email, nome, criadoEm: agora() }
      await setDoc(doc(db, 'usuarios', user.uid), perfil)
      return { uid: user.uid, ...perfil }
    },

    // As regras só aceitam se o cadastro desse CPF tiver o e-mail da conta.
    async vincularCliente(user, cpf, nome) {
      const perfil = {
        papel: 'cliente',
        email: user.email,
        nome,
        clienteId: onlyDigits(cpf),
        criadoEm: agora(),
      }
      try {
        await setDoc(doc(db, 'usuarios', user.uid), perfil)
      } catch (err) {
        if (negado(err))
          throw new ErroVinculo('Não encontramos cadastro com esse CPF e e-mail.')
        throw err
      }
      return { uid: user.uid, ...perfil }
    },

    async cadastrarCliente(user, cliente) {
      try {
        await setDoc(doc(db, 'clientes', onlyDigits(cliente.cpf)), {
          ...cliente,
          criadoPor: user.uid,
        })
      } catch (err) {
        if (negado(err))
          throw new ErroVinculo(
            'Esse CPF já está cadastrado com outro e-mail. Fale com seu gestor.',
          )
        throw err
      }
      return this.vincularCliente(user, cliente.cpf, cliente.nome)
    },

    async listarGestores() {
      const snap = await getDocs(collection(db, 'gestores'))
      return snap.docs.map((d) => ({ email: d.id, ...d.data() }))
    },

    convidarGestor: (email, nome) =>
      setDoc(doc(db, 'gestores', email.trim().toLowerCase()), {
        nome,
        criadoEm: agora(),
      }),

    removerGestor: (email) => deleteDoc(doc(db, 'gestores', email)),
  }
}

// Modo local: imita as regras do Firestore com o localStorage.
function localPerfis() {
  const ler = (k) => JSON.parse(localStorage.getItem(k) ?? '{}')
  const gravar = (k, v) => localStorage.setItem(k, JSON.stringify(v))
  const clientes = () => JSON.parse(localStorage.getItem('cliente-app:clientes') ?? '[]')
  const salvarPerfil = (uid, perfil) => {
    gravar('rjbank:usuarios', { ...ler('rjbank:usuarios'), [uid]: perfil })
    return { uid, ...perfil }
  }

  return {
    async carregar(user) {
      const perfil = ler('rjbank:usuarios')[user.uid]
      if (!perfil) return null
      if (perfil.papel === 'gestor' && !ler('rjbank:gestores')[user.email]) throw REVOGADO
      return { uid: user.uid, ...perfil }
    },

    conviteDeGestor: async (user) => ler('rjbank:gestores')[user.email] ?? null,

    ativarGestor: async (user, nome) =>
      salvarPerfil(user.uid, {
        papel: 'gestor',
        email: user.email,
        nome,
        criadoEm: agora(),
      }),

    async vincularCliente(user, cpf, nome) {
      const id = onlyDigits(cpf)
      const cadastro = clientes().find((c) => c.id === id)
      if (cadastro?.email !== user.email)
        throw new ErroVinculo('Não encontramos cadastro com esse CPF e e-mail.')
      return salvarPerfil(user.uid, {
        papel: 'cliente',
        email: user.email,
        nome,
        clienteId: id,
        criadoEm: agora(),
      })
    },

    async cadastrarCliente(user, cliente) {
      const id = onlyDigits(cliente.cpf)
      if (clientes().some((c) => c.id === id))
        throw new ErroVinculo(
          'Esse CPF já está cadastrado com outro e-mail. Fale com seu gestor.',
        )
      localStorage.setItem(
        'cliente-app:clientes',
        JSON.stringify([{ ...cliente, id, criadoPor: user.uid }, ...clientes()]),
      )
      return this.vincularCliente(user, cliente.cpf, cliente.nome)
    },

    listarGestores: async () =>
      Object.entries(ler('rjbank:gestores')).map(([email, g]) => ({ email, ...g })),

    async convidarGestor(email, nome) {
      gravar('rjbank:gestores', {
        ...ler('rjbank:gestores'),
        [email.trim().toLowerCase()]: { nome, criadoEm: agora() },
      })
    },

    async removerGestor(email) {
      const gestores = ler('rjbank:gestores')
      delete gestores[email]
      gravar('rjbank:gestores', gestores)
    },
  }
}

export const perfis = firebaseEnabled ? firestorePerfis() : localPerfis()
