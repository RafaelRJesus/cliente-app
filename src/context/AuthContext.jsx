import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authService } from '../lib/auth'
import { ehEquipe, ErroVinculo, perfis } from '../lib/perfis'

const AuthContext = createContext(null)

// Três estados depois de carregar: sem login, logado sem perfil (falta
// confirmar e-mail ou completar cadastro) e logado com perfil.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregarPerfil = useCallback(async (u) => {
    setErro('')
    if (!u?.verificado) {
      setPerfil(null)
      return
    }
    try {
      setPerfil(await perfis.carregar(u))
    } catch (err) {
      console.error(err)
      setErro(
        err instanceof ErroVinculo
          ? err.message
          : 'Não foi possível carregar seu acesso.',
      )
      setPerfil(null)
    }
  }, [])

  useEffect(
    () =>
      authService.observar(async (u) => {
        setCarregando(true)
        setUser(u)
        await carregarPerfil(u)
        setCarregando(false)
      }),
    [carregarPerfil],
  )

  const confirmarEmail = useCallback(async () => {
    const u = await authService.recarregar()
    setUser(u)
    await carregarPerfil(u)
    return u?.verificado
  }, [carregarPerfil])

  const valor = {
    user,
    perfil,
    carregando,
    erro,
    equipe: ehEquipe(perfil),
    admin: perfil?.papel === 'admin',
    setPerfil,
    confirmarEmail,
    entrar: authService.entrar,
    entrarComGoogle: authService.entrarComGoogle,
    criarConta: authService.criarConta,
    redefinirSenha: authService.redefinirSenha,
    reenviarConfirmacao: authService.reenviarConfirmacao,
    sair: authService.sair,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return context
}
