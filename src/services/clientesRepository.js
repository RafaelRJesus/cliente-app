import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db, firebaseEnabled, getCurrentUser } from './firebase'

const STORAGE_KEY = 'cliente-app:clientes'
const COLLECTION = 'clientes'

// ---------- Fallback local (sem Firebase configurado) ----------
const localRepository = {
  mode: 'local',

  async list() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  async add(cliente) {
    const novo = { ...cliente, id: crypto.randomUUID() }
    const atuais = await this.list()
    localStorage.setItem(STORAGE_KEY, JSON.stringify([novo, ...atuais]))
    return novo
  },

  async remove(id) {
    const atuais = await this.list()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(atuais.filter((cliente) => cliente.id !== id)),
    )
  },
}

// ---------- Firestore ----------
const firestoreRepository = {
  mode: 'firestore',

  async list() {
    const user = await getCurrentUser()
    const q = query(collection(db, COLLECTION), where('uid', '==', user.uid))
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  },

  async add(cliente) {
    const user = await getCurrentUser()
    const data = { ...cliente, uid: user.uid }
    const ref = await addDoc(collection(db, COLLECTION), data)
    return { id: ref.id, ...data }
  },

  async remove(id) {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}

export const clientesRepository = firebaseEnabled
  ? firestoreRepository
  : localRepository
