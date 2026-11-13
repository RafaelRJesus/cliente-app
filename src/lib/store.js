import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase'
import { onlyDigits } from './format'
import {
  gravarClienteNumerado,
  numerarClienteExistente,
  proximoNumeroLocal,
} from './numeroCliente'
import { ehEquipe } from './perfis'

const byNewest = (a, b) => b.criadoEm.localeCompare(a.criadoEm)

// O cadastro de cliente usa o CPF (só números) como id: um cadastro por CPF.
const idDoItem = (name, item) => (name === 'clientes' ? onlyDigits(item.cpf) : null)

// O que cada perfil enxerga. A equipe vê tudo; o cliente, só o que é dele.
// As regras do Firestore garantem o mesmo do lado do servidor.
function firestoreStore(name, perfil) {
  const col = collection(db, name)

  async function listarDoCliente() {
    if (name === 'clientes') {
      const snap = await getDoc(doc(col, perfil.clienteId))
      return snap.exists() ? [{ id: snap.id, ...snap.data() }] : []
    }
    const snap = await getDocs(query(col, where('clienteId', '==', perfil.clienteId)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  return {
    async list() {
      if (!ehEquipe(perfil)) return (await listarDoCliente()).sort(byNewest)
      const snap = await getDocs(col)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest)
    },

    async add(item) {
      const data = { ...item, criadoPor: perfil.uid }
      const id = idDoItem(name, item)
      if (id) {
        const numero = await gravarClienteNumerado(id, data)
        return { id, ...data, numero }
      }
      const ref = await addDoc(col, data)
      return { id: ref.id, ...data }
    },

    update: (id, changes) => updateDoc(doc(col, id), changes),

    remove: (id) => deleteDoc(doc(col, id)),

    // só clientes: dá número a cadastro antigo
    numerar: (id) => numerarClienteExistente(id),
  }
}

// Usado quando o Firebase não está configurado (.env.local ausente).
function localStore(name, perfil) {
  const key = `cliente-app:${name}`
  const read = () => JSON.parse(localStorage.getItem(key) ?? '[]')
  const write = (items) => localStorage.setItem(key, JSON.stringify(items))
  const visivel = (item) =>
    ehEquipe(perfil) ||
    (name === 'clientes'
      ? item.id === perfil.clienteId
      : item.clienteId === perfil.clienteId)

  return {
    list: async () => read().filter(visivel).sort(byNewest),

    async add(item) {
      const id = idDoItem(name, item) ?? crypto.randomUUID()
      if (read().some((i) => i.id === id)) {
        throw Object.assign(new Error('já existe'), { code: 'permission-denied' })
      }
      const created = { ...item, id, criadoPor: perfil.uid }
      if (name === 'clientes') created.numero = proximoNumeroLocal()
      write([created, ...read()])
      return created
    },

    async update(id, changes) {
      write(read().map((item) => (item.id === id ? { ...item, ...changes } : item)))
    },

    async remove(id) {
      write(read().filter((item) => item.id !== id))
    },

    async numerar(id) {
      const numero = proximoNumeroLocal()
      write(read().map((item) => (item.id === id ? { ...item, numero } : item)))
      return numero
    },
  }
}

export const storageMode = firebaseEnabled ? 'firestore' : 'local'

export const createStore = (name, perfil) =>
  firebaseEnabled ? firestoreStore(name, perfil) : localStore(name, perfil)
