// Quem pode abrir a documentação das APIs.
// A página exige uma sessão aberta pelo Google: é ela que vira o token das
// chamadas de teste. Sessão de e-mail e senha (aberta no app, no mesmo
// navegador) não basta.

/**
 * @param {{ firebaseEnabled: boolean, usuario: undefined | null | { provedor: string } }} p
 *   usuario undefined = ainda carregando; null = ninguém logado.
 * @returns {'local' | 'carregando' | 'entrar' | 'trocar' | 'liberado'}
 */
export function estadoDoAcesso({ firebaseEnabled, usuario }) {
  if (!firebaseEnabled) return 'local'
  if (usuario === undefined) return 'carregando'
  if (usuario === null) return 'entrar'
  return usuario.provedor === 'google.com' ? 'liberado' : 'trocar'
}

const FIRESTORE = 'https://firestore.googleapis.com/'
const IDENTITY = 'https://identitytoolkit.googleapis.com/'

/**
 * Completa a requisição do "Try it out": token da sessão nas chamadas do
 * Firestore e a chave pública do app nas do Firebase Authentication.
 */
export function completarRequisicao(req, { token, chave }) {
  if (req.url.startsWith(FIRESTORE) && token) {
    req.headers = { ...req.headers, Authorization: `Bearer ${token}` }
  }
  if (req.url.startsWith(IDENTITY) && chave && !/[?&]key=/.test(req.url)) {
    req.url += `${req.url.includes('?') ? '&' : '?'}key=${encodeURIComponent(chave)}`
  }
  return req
}
