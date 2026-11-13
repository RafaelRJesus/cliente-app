import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, firebaseEnabled, getCurrentUser } from './firebase'

const byNewest = (a, b) => b.criadoEm.localeCompare(a.criadoEm)

function firestoreStore(name) {
  return {
    async list() {
      const user = await getCurrentUser()
      const q = query(collection(db, name), where('uid', '==', user.uid))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest)
    },

    async add(item) {
      const user = await getCurrentUser()
      const data = { ...item, uid: user.uid }
      const ref = await addDoc(collection(db, name), data)
      return { id: ref.id, ...data }
    },

    update: (id, changes) => updateDoc(doc(db, name, id), changes),

    remove: (id) => deleteDoc(doc(db, name, id)),
  }
}

// Usado quando o Firebase não está configurado (.env.local ausente).
function localStore(name) {
  const key = `cliente-app:${name}`
  const read = () => JSON.parse(localStorage.getItem(key) ?? '[]')
  const write = (items) => localStorage.setItem(key, JSON.stringify(items))

  return {
    list: async () => read().sort(byNewest),

    async add(item) {
      const created = { ...item, id: crypto.randomUUID() }
      write([created, ...read()])
      return created
    },

    async update(id, changes) {
      write(read().map((item) => (item.id === id ? { ...item, ...changes } : item)))
    },

    async remove(id) {
      write(read().filter((item) => item.id !== id))
    },
  }
}

export const storageMode = firebaseEnabled ? 'firestore' : 'local'

export const createStore = (name) =>
  firebaseEnabled ? firestoreStore(name) : localStore(name)

export const clientesStore = createStore('clientes')
export const contratosStore = createStore('contratos')
