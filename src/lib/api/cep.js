import { onlyDigits } from '../format'
import { getJson } from './http'

// BrasilAPI consulta vários provedores; ViaCEP fica de reserva.
export async function buscarCep(value) {
  const cep = onlyDigits(value)
  if (cep.length !== 8) throw new Error('CEP inválido')

  try {
    const data = await getJson(`https://brasilapi.com.br/api/cep/v2/${cep}`)
    return {
      logradouro: data.street ?? '',
      bairro: data.neighborhood ?? '',
      cidade: data.city,
      uf: data.state,
    }
  } catch {
    const data = await getJson(`https://viacep.com.br/ws/${cep}/json/`)
    if (data.erro) throw new Error('CEP não encontrado')
    return {
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      uf: data.uf,
    }
  }
}
