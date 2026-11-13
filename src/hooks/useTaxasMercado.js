import { useEffect, useState } from 'react'
import { carregarTaxasMercado } from '../lib/api/bcb'

export function useTaxasMercado() {
  const [taxas, setTaxas] = useState(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    carregarTaxasMercado()
      .then(setTaxas)
      .catch((err) => {
        console.error(err)
        setErro(true)
      })
  }, [])

  return { taxas, erro, carregando: !taxas && !erro }
}
