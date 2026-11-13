import { useState } from 'react'
import { buscarCep } from '../lib/api/cep'

export function useCep(onFound) {
  const [status, setStatus] = useState('idle') // idle | loading | ok | error
  const [error, setError] = useState('')

  async function consultar(cep) {
    setStatus('loading')
    setError('')
    try {
      const endereco = await buscarCep(cep)
      onFound(endereco)
      setStatus('ok')
    } catch (err) {
      console.error(err)
      setError('CEP não encontrado. Preencha o endereço manualmente.')
      setStatus('error')
    }
  }

  return { consultar, status, error }
}
