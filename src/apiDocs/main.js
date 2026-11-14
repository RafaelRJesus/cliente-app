import '@fontsource-variable/instrument-sans/wdth.css'
import 'swagger-ui-dist/swagger-ui.css'
import './api-docs.css'
import SwaggerUI from 'swagger-ui-dist/swagger-ui-es-bundle.js'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { ErroAuth } from '../lib/auth'
import { auth, firebaseEnabled } from '../lib/firebase'
import { completarRequisicao, estadoDoAcesso } from './acesso'

const $ = (id) => document.getElementById(id)
const portao = $('portao')
const swagger = $('swagger')
const sessao = $('sessao')
let swaggerMontado = false

function montarSwagger() {
  swagger.hidden = false
  if (swaggerMontado) return
  swaggerMontado = true
  SwaggerUI({
    url: './openapi.yaml',
    dom_id: '#swagger',
    deepLinking: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 1,
    // o token da sessão Google e a chave do app entram sozinhos em cada chamada
    requestInterceptor: async (req) =>
      completarRequisicao(req, {
        token: auth?.currentUser ? await auth.currentUser.getIdToken() : null,
        chave: import.meta.env.VITE_FIREBASE_API_KEY,
      }),
  })
}

const BOTAO_GOOGLE = `
  <button type="button" class="botao-google" id="entrar-google">
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
    Entrar com Google
  </button>
  <p class="erro" id="erro" role="alert"></p>`

const escapar = (texto) => texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const TELAS = {
  carregando: () => '<p class="aviso">Verificando sua sessão...</p>',
  entrar: () => `
    <h1>Documentação das APIs</h1>
    <p>Entre com uma conta Google para ver e testar as APIs do Respawn.</p>
    <p>As chamadas de teste usam a sua sessão: o que você consegue ler ou gravar segue
      o seu perfil no app. Conta sem perfil no Respawn recebe 403 nas rotas do Firestore.</p>
    ${BOTAO_GOOGLE}`,
  trocar: (usuario) => `
    <h1>Documentação das APIs</h1>
    <p>Você está no app com e-mail e senha (<strong>${escapar(usuario.email)}</strong>).
      A documentação pede uma conta Google.</p>
    <p class="aviso">Entrar com o Google troca a sessão do app neste navegador.</p>
    ${BOTAO_GOOGLE}`,
}

async function entrarComGoogle(botao) {
  const erro = $('erro')
  erro.textContent = ''
  botao.disabled = true
  botao.lastChild.textContent = ' Abrindo o Google...'
  try {
    await signInWithPopup(auth, new GoogleAuthProvider())
  } catch (err) {
    if (
      err.code !== 'auth/popup-closed-by-user' &&
      err.code !== 'auth/cancelled-popup-request'
    ) {
      erro.textContent = new ErroAuth(err.code).message
    }
    botao.disabled = false
    botao.lastChild.textContent = ' Entrar com Google'
  }
}

function mostrar(estado, usuario) {
  sessao.replaceChildren()
  if (estado === 'local') {
    portao.innerHTML = `<p class="aviso">Modo local: sem Firebase configurado, a documentação
      abre sem login e as chamadas ao Firestore saem sem token.</p>`
    portao.hidden = false
    return montarSwagger()
  }

  if (estado === 'liberado') {
    portao.hidden = true
    const quem = document.createElement('span')
    quem.textContent = usuario.email
    const sair = document.createElement('button')
    sair.type = 'button'
    sair.textContent = 'Sair'
    sair.onclick = () => signOut(auth)
    sessao.append(quem, sair)
    return montarSwagger()
  }

  swagger.hidden = true
  portao.hidden = false
  portao.innerHTML = TELAS[estado](usuario)
  const botao = $('entrar-google')
  if (botao) botao.onclick = () => entrarComGoogle(botao)
}

if (!firebaseEnabled) {
  mostrar('local')
} else {
  mostrar('carregando')
  auth.languageCode = 'pt-BR'
  onAuthStateChanged(auth, async (u) => {
    const usuario = u
      ? { email: u.email ?? '', provedor: (await u.getIdTokenResult()).signInProvider }
      : null
    mostrar(estadoDoAcesso({ firebaseEnabled, usuario }), usuario)
  })
}
