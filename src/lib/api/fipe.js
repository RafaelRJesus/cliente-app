import { cached, getJson } from './http'

// API aberta da tabela FIPE (parallelum.com.br/fipe). Tem limite de requisições
// por dia, por isso marcas/modelos ficam em cache.
const BASE = 'https://parallelum.com.br/fipe/api/v1'

export const TIPOS_VEICULO = { carros: 'Carro', motos: 'Moto', caminhoes: 'Caminhão' }

export const listarMarcas = (tipo) =>
  cached(`fipe:${tipo}:marcas`, 24 * 7, () => getJson(`${BASE}/${tipo}/marcas`))

export const listarModelos = (tipo, marca) =>
  cached(`fipe:${tipo}:${marca}:modelos`, 24 * 7, async () => {
    const data = await getJson(`${BASE}/${tipo}/marcas/${marca}/modelos`)
    return data.modelos
  })

export const listarAnos = async (tipo, marca, modelo) => {
  const anos = await cached(`fipe:${tipo}:${marca}:${modelo}:anos`, 24 * 7, () =>
    getJson(`${BASE}/${tipo}/marcas/${marca}/modelos/${modelo}/anos`),
  )
  return anos.map(nomeAno)
}

// A FIPE usa o ano 32000 para veículo zero km.
export const nomeAno = (ano) => ({
  ...ano,
  nome: ano.nome.replace(/^32000\b/, 'Zero km'),
})

export async function consultarPreco(tipo, marca, modelo, ano) {
  const data = await cached(`fipe:${tipo}:${marca}:${modelo}:${ano}`, 24, () =>
    getJson(`${BASE}/${tipo}/marcas/${marca}/modelos/${modelo}/anos/${ano}`),
  )
  return {
    valorFipe: parseValorFipe(data.Valor),
    codigoFipe: data.CodigoFipe,
    descricao: `${data.Marca} ${data.Modelo}`,
    // a FIPE usa 32000 para veículo zero km
    anoModelo: data.AnoModelo === 32000 ? new Date().getFullYear() : data.AnoModelo,
    combustivel: data.Combustivel,
    mesReferencia: data.MesReferencia,
  }
}

// "R$ 59.777,00" -> 59777
export const parseValorFipe = (valor) =>
  Number(valor.replace(/[^\d,]/g, '').replace(',', '.'))
