// Apoio dos testes: banco (memória ou emulador), relógio fixo e sorteio repetível.

import { readFileSync } from 'node:fs'
import request from 'supertest'
import { criarApp } from '../src/app.js'
import { criarContexto } from '../src/contexto.js'
import { criarFirestoreMemoria } from './firestoreMemoria.js'

export const CHAVE = 'chave-de-teste'
export const AGORA = new Date('2026-11-18T15:00:00.000Z') // 12h em São Paulo
export const HOJE = '2026-11-18'

const PROJETO = 'demo-respawn'

/** Sorteio com semente (mulberry32): mesma sequência a cada execução. */
export function sorteio(semente = 42) {
  let a = semente
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let firestoreEmulador
async function bancoDoEmulador() {
  if (!firestoreEmulador) {
    const { initializeApp, getApps } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    if (!getApps().length) initializeApp({ projectId: PROJETO })
    firestoreEmulador = getFirestore()
  }
  const host = process.env.FIRESTORE_EMULATOR_HOST
  await fetch(
    `http://${host}/emulator/v1/projects/${PROJETO}/databases/(default)/documents`,
    {
      method: 'DELETE',
    },
  )
  return firestoreEmulador
}

/** Banco limpo para cada teste. */
export const novoBanco = async () =>
  process.env.USAR_EMULADOR ? bancoDoEmulador() : criarFirestoreMemoria()

/** Monta a API com banco limpo e devolve helpers de requisição já com a chave. */
export async function montarApi({ chave = CHAVE, semente = 42 } = {}) {
  const db = await novoBanco()
  const aleatorio = sorteio(semente)
  const app = criarApp({
    contexto: () => criarContexto({ db, agora: () => AGORA, aleatorio }),
    chave: () => chave,
  })
  const comChave = (r) => r.set('x-api-key', CHAVE)
  return {
    db,
    app,
    get: (url) => comChave(request(app).get(url)),
    post: (url, body = {}) => comChave(request(app).post(url)).send(body),
    del: (url) => comChave(request(app).delete(url)),
    semChave: request(app),
  }
}

// Lê as listas de campos permitidos do firestore.rules, para o teste quebrar
// se as regras mudarem e a API ficar gravando documento fora do formato.
const regras = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')

/** Primeira lista de hasOnly([...]) depois do trecho indicado. */
function listaApos(trechoInicial) {
  const inicio = regras.indexOf(trechoInicial)
  if (inicio < 0) throw new Error(`Trecho não encontrado nas regras: ${trechoInicial}`)
  const resto = regras.slice(regras.indexOf('hasOnly(', inicio))
  const lista = resto.slice(resto.indexOf('['), resto.indexOf(']') + 1)
  return [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1])
}

export const CAMPOS_REGRAS = {
  cliente: listaApos('match /clientes/{cpf}'),
  endereco: listaApos('function enderecoValido'),
  detalhes: listaApos('function detalhesValidos'),
  parcela: listaApos('function parcelaValida'),
  contrato: listaApos('match /contratos/{id}'),
}
