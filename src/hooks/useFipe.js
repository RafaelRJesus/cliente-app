import { useEffect, useState } from 'react'
import { consultarPreco, listarAnos, listarMarcas, listarModelos } from '../lib/api/fipe'

const vazio = { tipo: 'carros', marca: '', modelo: '', ano: '' }

// Carrega as listas em cascata: tipo -> marcas -> modelos -> anos -> preço.
export function useFipe(onPreco) {
  const [selecao, setSelecao] = useState(vazio)
  const [opcoes, setOpcoes] = useState({ marcas: [], modelos: [], anos: [] })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar(fn) {
    setCarregando(true)
    setErro('')
    try {
      return await fn()
    } catch (err) {
      console.error(err)
      setErro('Tabela FIPE indisponível no momento. Tente de novo em instantes.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    let ativo = true
    listarMarcas(selecao.tipo)
      .then((marcas) => ativo && setOpcoes({ marcas, modelos: [], anos: [] }))
      .catch((err) => {
        console.error(err)
        if (ativo)
          setErro('Tabela FIPE indisponível no momento. Tente de novo em instantes.')
      })
    return () => {
      ativo = false
    }
  }, [selecao.tipo])

  function alterar(campo, valor) {
    const proxima = { ...selecao, [campo]: valor }
    if (campo === 'tipo') Object.assign(proxima, { marca: '', modelo: '', ano: '' })
    if (campo === 'marca') Object.assign(proxima, { modelo: '', ano: '' })
    if (campo === 'modelo') proxima.ano = ''
    setSelecao(proxima)
    onPreco(null)

    if (!valor) return
    const { tipo, marca, modelo } = proxima
    if (campo === 'marca') {
      carregar(async () => {
        const modelos = await listarModelos(tipo, marca)
        setOpcoes((o) => ({ ...o, modelos, anos: [] }))
      })
    }
    if (campo === 'modelo') {
      carregar(async () => {
        const anos = await listarAnos(tipo, marca, modelo)
        setOpcoes((o) => ({ ...o, anos }))
      })
    }
    if (campo === 'ano') {
      carregar(async () => onPreco(await consultarPreco(tipo, marca, modelo, valor)))
    }
  }

  return { selecao, opcoes, alterar, carregando, erro }
}
