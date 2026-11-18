// Cadastro de clientes de massa, no mesmo formato e com a mesma numeração da tela Clientes.

import { onlyDigits } from '../../../src/lib/format.js'
import { validateCliente } from '../../../src/lib/validators.js'
import { CRIADO_POR } from '../contexto.js'
import { conflito, pedidoInvalido } from '../erros.js'
import { gerarCliente, UFS_SUPORTADAS } from '../geradores.js'
import { registrarNoLote } from './lotes.js'

export const MAX_POR_CHAMADA = 100

const TENTATIVAS_CPF = 5

/** Mesmas validações do formulário de cliente (que trabalha com o endereço "achatado"). */
export const validarCliente = (cliente) =>
  validateCliente({ ...cliente, ...cliente.endereco })

function mesclar(gerado, dados = {}) {
  const { endereco, ...resto } = dados
  return { ...gerado, ...resto, endereco: { ...gerado.endereco, ...endereco } }
}

/**
 * Grava um cliente (id = CPF só números) com o próximo número do contador,
 * na mesma transação, como faz gravarClienteNumerado no app.
 */
async function gravarNumerado(ctx, cliente) {
  const cpf = onlyDigits(cliente.cpf)
  const db = ctx.db
  const contador = db.collection('contadores').doc('clientes')
  const ref = db.collection('clientes').doc(cpf)
  return db.runTransaction(async (tx) => {
    const [atual, existente] = await Promise.all([tx.get(contador), tx.get(ref)])
    if (existente.exists)
      throw conflito(`Já existe cliente com o CPF ${cliente.cpf}.`, { cpf })
    const numero = (atual.exists ? atual.data().ultimo : 0) + 1
    tx.set(contador, { ultimo: numero })
    const gravado = { ...cliente, criadoPor: CRIADO_POR, numero }
    tx.create(ref, gravado)
    return { id: cpf, ...gravado }
  })
}

/** Cria um cliente: com CPF informado ele é obrigatório; gerado, tenta outro se repetir. */
export async function criarUmCliente(ctx, { uf = 'RS', dados } = {}) {
  if (!UFS_SUPORTADAS.includes(uf)) {
    throw pedidoInvalido(`UF não suportada. Use uma de: ${UFS_SUPORTADAS.join(', ')}.`)
  }
  const cpfInformado = Boolean(dados?.cpf)
  for (let tentativa = 1; ; tentativa++) {
    const cliente = mesclar(
      gerarCliente({ uf, agora: ctx.agora(), aleatorio: ctx.aleatorio }),
      dados,
    )
    const erros = validarCliente(cliente)
    if (Object.keys(erros).length)
      throw pedidoInvalido('Dados de cliente inválidos.', erros)
    try {
      return await gravarNumerado(ctx, cliente)
    } catch (err) {
      const repetido = err.codigo === 'Conflito' || err.code === 6
      if (!repetido || cpfInformado || tentativa >= TENTATIVAS_CPF) throw err
    }
  }
}

/** POST /clientes: cria de 1 a 100 clientes e registra no lote. */
export async function criarClientes(
  ctx,
  { quantidade = 1, uf = 'RS', dados, loteId, descricao },
) {
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_POR_CHAMADA) {
    throw pedidoInvalido(`quantidade deve ser um inteiro de 1 a ${MAX_POR_CHAMADA}.`)
  }
  if (dados && quantidade > 1) {
    throw pedidoInvalido('dados só pode ser usado com quantidade 1.')
  }

  const criados = []
  try {
    for (let i = 0; i < quantidade; i++)
      criados.push(await criarUmCliente(ctx, { uf, dados }))
  } finally {
    // mesmo se parar no meio, o que já foi gravado entra no lote (dá para apagar)
    if (criados.length) {
      await registrarNoLote(
        ctx,
        loteId,
        { clientes: criados.map((c) => c.id) },
        descricao,
      )
    }
  }
  return criados
}
