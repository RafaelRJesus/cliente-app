import { useCallback, useEffect, useState } from 'react'
import { carregarTaxasMercado } from '../lib/api/bcb'

export function useTaxasMercado() {
  const [taxas, setTaxas] = useState(null)
  const [erro, setErro] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true
    carregarTaxasMercado()
      .then((dados) => {
        if (!ativo) return
        setTaxas(dados)
        setErro(false)
      })
      .catch((err) => {
        console.error(err)
        if (ativo) setErro(true)
      })
    return () => {
      ativo = false
    }
  }, [tentativa])

  const tentarDeNovo = useCallback(() => {
    setErro(false)
    setTentativa((n) => n + 1)
  }, [])

  return { taxas, erro, carregando: !taxas && !erro, tentarDeNovo }
}
