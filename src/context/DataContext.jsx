import { createContext, useContext, useMemo } from 'react'
import { useCollection } from '../hooks/useCollection'
import { createStore } from '../lib/store'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { perfil } = useAuth()
  // Um store por perfil: ao trocar de usuário, a carteira é recarregada.
  const stores = useMemo(
    () => ({
      clientes: createStore('clientes', perfil),
      contratos: createStore('contratos', perfil),
    }),
    [perfil],
  )
  const clientes = useCollection(stores.clientes)
  const contratos = useCollection(stores.contratos)

  return (
    <DataContext.Provider value={{ clientes, contratos }}>
      {children}
    </DataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData precisa estar dentro de <DataProvider>')
  return context
}
