import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// No build dos testes de tela (--mode e2e) o app nunca fala com o Firebase,
// mesmo que exista um .env.local na máquina.
export const firebaseEnabled =
  import.meta.env.MODE !== 'e2e' && Boolean(config.apiKey && config.projectId)

const app = firebaseEnabled ? initializeApp(config) : null
export const db = app ? getFirestore(app) : null
export const auth = app ? getAuth(app) : null
if (auth) auth.languageCode = 'pt-BR'
