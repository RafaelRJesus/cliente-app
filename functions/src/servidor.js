// API de massa fora do Google Cloud: Vercel (api/massa.js) ou local (npm run servidor).
// O acesso ao Firestore é pela conta de serviço do Firebase:
//   FIREBASE_SERVICE_ACCOUNT  conteúdo do .json da chave (Vercel)
//   ou GOOGLE_APPLICATION_CREDENTIALS  caminho do .json (local)
// A chave da API vem de MASSA_API_KEY.

import { pathToFileURL } from 'node:url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { criarApp } from './app.js'
import { criarContexto } from './contexto.js'

let db

/** Liga no Firestore só na primeira chamada (sem credencial, /saude ainda responde). */
function banco() {
  if (!db) {
    if (!getApps().length) {
      const contaDeServico = process.env.FIREBASE_SERVICE_ACCOUNT
      initializeApp(
        contaDeServico ? { credential: cert(JSON.parse(contaDeServico)) } : undefined,
      )
    }
    db = getFirestore()
  }
  return db
}

export const criarAppProducao = () =>
  criarApp({
    contexto: () => criarContexto({ db: banco() }),
    chave: () => process.env.MASSA_API_KEY ?? '',
  })

// node src/servidor.js → servidor local
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const porta = Number(process.env.PORT ?? 5180)
  criarAppProducao().listen(porta, () =>
    console.log(`API de massa em http://localhost:${porta}/api/massa`),
  )
}
