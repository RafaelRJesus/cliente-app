import { describe, expect, it } from 'vitest'
import { completarRequisicao, estadoDoAcesso } from './acesso'

describe('estadoDoAcesso', () => {
  it('sem Firebase (modo local) abre sem login', () => {
    expect(estadoDoAcesso({ firebaseEnabled: false, usuario: null })).toBe('local')
  })

  it('pede login com Google enquanto ninguém entrou', () => {
    expect(estadoDoAcesso({ firebaseEnabled: true, usuario: undefined })).toBe(
      'carregando',
    )
    expect(estadoDoAcesso({ firebaseEnabled: true, usuario: null })).toBe('entrar')
  })

  it('sessão de e-mail e senha precisa trocar pelo Google', () => {
    const usuario = { provedor: 'password' }
    expect(estadoDoAcesso({ firebaseEnabled: true, usuario })).toBe('trocar')
  })

  it('libera com sessão do Google', () => {
    const usuario = { provedor: 'google.com' }
    expect(estadoDoAcesso({ firebaseEnabled: true, usuario })).toBe('liberado')
  })
})

describe('completarRequisicao', () => {
  const sessao = { token: 'tok', chave: 'chave publica' }

  it('põe o token da sessão nas chamadas do Firestore', () => {
    const req = completarRequisicao(
      {
        url: 'https://firestore.googleapis.com/v1/projects/x/documents/clientes',
        headers: {},
      },
      sessao,
    )
    expect(req.headers.Authorization).toBe('Bearer tok')
  })

  it('põe a chave do app nas chamadas do Firebase Authentication', () => {
    const req = completarRequisicao(
      { url: 'https://identitytoolkit.googleapis.com/v1/accounts:signUp', headers: {} },
      sessao,
    )
    expect(req.url).toBe(
      'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=chave%20publica',
    )
    expect(req.headers.Authorization).toBeUndefined()
  })

  it('não mexe nas APIs externas nem repete a chave', () => {
    const cep = completarRequisicao(
      { url: 'https://brasilapi.com.br/api/cep/v2/1', headers: {} },
      sessao,
    )
    expect(cep).toEqual({ url: 'https://brasilapi.com.br/api/cep/v2/1', headers: {} })
    const comChave = completarRequisicao(
      {
        url: 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=a',
        headers: {},
      },
      sessao,
    )
    expect(comChave.url).toBe(
      'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=a',
    )
  })
})
