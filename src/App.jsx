import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Clientes } from './pages/Clientes'
import { Contratos } from './pages/Contratos'
import { Dashboard } from './pages/Dashboard'
import { Simulador } from './pages/Simulador'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="simulador" element={<Simulador />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="contratos/:id" element={<Contratos />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
