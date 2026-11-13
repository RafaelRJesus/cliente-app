import { describe, expect, it, vi } from 'vitest'

const fb = vi.hoisted(() => ({ ouvinte: null }))

vi.mock('./firebase', () => ({ auth: {}, db: {}, firebaseEnabled: true }))
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: (_auth, cb) => {
    fb.ouvinte = cb
    return () => {}
  },
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}))

const { authService } = await import('./auth')

describe('usuário entregue ao app (modo Firebase)', () => {
  it('traz como a sessão foi aberta: o admin depende disso', async () => {
    const recebido = new Promise((ok) => authService.observar(ok))
    await fb.ouvinte({
      uid: 'u1',
      email: 'Rafael@Exemplo.com',
      emailVerified: true,
      getIdTokenResult: async () => ({ signInProvider: 'google.com' }),
    })
    expect(await recebido).toEqual({
      uid: 'u1',
      email: 'rafael@exemplo.com',
      verificado: true,
      provedor: 'google.com',
    })
  })

  it('sem sessão entrega null', async () => {
    const recebido = new Promise((ok) => authService.observar(ok))
    await fb.ouvinte(null)
    expect(await recebido).toBeNull()
  })
})
