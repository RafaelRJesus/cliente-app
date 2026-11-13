import { createContext, useContext } from 'react'
import { useCollection } from '../hooks/useCollection'
import { clientesStore, contratosStore } from '../lib/store'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const clientes = useCollection(clientesStore)
  const contratos = useCollection(contratosStore)

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
