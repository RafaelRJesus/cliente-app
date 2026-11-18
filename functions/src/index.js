// Entrada das Cloud Functions do Respawn.
// massa: API para a Central de Massa (ou qualquer ferramenta de QA) gerar dados de teste.

import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { criarApp } from './app.js'
import { criarContexto } from './contexto.js'

initializeApp()

// firebase functions:secrets:set MASSA_API_KEY
const MASSA_API_KEY = defineSecret('MASSA_API_KEY')

const app = criarApp({
  contexto: () => criarContexto({ db: getFirestore() }),
  chave: () => MASSA_API_KEY.value(),
})

export const massa = onRequest(
  {
    region: 'southamerica-east1',
    secrets: [MASSA_API_KEY],
    maxInstances: 2,
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  app,
)
