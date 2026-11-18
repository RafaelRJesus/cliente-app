// Rotas HTTP da API de massa. Responde em /api/massa/... (pelo Hosting)
// e também na raiz (URL direta da função).

import { timingSafeEqual } from 'node:crypto'
import express from 'express'
import { PREFIXOS } from '../../src/lib/numeracao.js'
import { PRODUTOS } from '../../src/lib/produtos.js'
import { FORMAS_PAGAMENTO } from '../../src/lib/pagamento.js'
import { ErroApi } from './erros.js'
import { criarClientes } from './servicos/clientes.js'
import { criarContratos, SITUACOES } from './servicos/contratos.js'
import {
  buscarContratos,
  clientesSemContrato,
  consultarCliente,
  obterContrato,
} from './servicos/consultas.js'
import { apagarLote, listarLotes, novoLoteId, obterLote } from './servicos/lotes.js'
import { pagarParcelas } from './servicos/pagamentos.js'
import { simularPlanos } from './servicos/simulacoes.js'

export const CABECALHO_CHAVE = 'x-api-key'

function chaveConfere(recebida, esperada) {
  if (typeof recebida !== 'string' || !esperada) return false
  const a = Buffer.from(recebida)
  const b = Buffer.from(esperada)
  return a.length === b.length && timingSafeEqual(a, b)
}

const simNao = (v) => v === true || v === 'true' || v === '1'

/**
 * @param {object} opcoes
 * @param {() => object} opcoes.contexto  devolve { db, agora, hoje, aleatorio }
 * @param {() => string} opcoes.chave     chave esperada no cabeçalho x-api-key
 */
export function criarApp({ contexto, chave }) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '200kb' }))

  const rotas = express.Router()

  // saúde não pede chave: serve para o smoke test ver se a função subiu
  rotas.get('/saude', (_req, res) => res.json({ ok: true, servico: 'respawn-api-massa' }))

  rotas.use((req, res, next) => {
    const esperada = chave()
    if (!esperada) {
      return res.status(503).json({
        erro: 'ChaveNaoConfigurada',
        mensagem: 'A chave da API de massa não foi configurada.',
      })
    }
    if (!chaveConfere(req.get(CABECALHO_CHAVE), esperada)) {
      return res.status(401).json({
        erro: 'NaoAutorizado',
        mensagem: 'Envie a chave no cabeçalho x-api-key.',
      })
    }
    next()
  })

  // cada chamada que grava usa o lote informado ou abre um novo
  const lote = (ctx, body) => body.loteId ?? novoLoteId(ctx)
  const ctx = () => contexto()

  rotas.get('/produtos', (_req, res) =>
    res.json({
      produtos: Object.entries(PRODUTOS).map(([id, p]) => ({
        id,
        prefixo: PREFIXOS[id],
        ...p,
      })),
      sistemas: ['PRICE', 'SAC'],
      situacoes: SITUACOES,
      formasPagamento: FORMAS_PAGAMENTO.map((f) => f.id),
    }),
  )

  rotas.post('/simulacoes', (req, res) =>
    res.json({ planos: simularPlanos(ctx(), req.body) }),
  )

  rotas.post('/clientes', async (req, res) => {
    const c = ctx()
    const loteId = lote(c, req.body)
    const clientes = await criarClientes(c, { ...req.body, loteId })
    res.status(201).json({ loteId, quantidade: clientes.length, clientes })
  })

  rotas.get('/clientes/sem-contrato', async (req, res) =>
    res.json({
      clientes: await clientesSemContrato(ctx(), {
        limite: req.query.limite,
        aleatorio: simNao(req.query.aleatorio),
      }),
    }),
  )

  rotas.get('/clientes', async (req, res) =>
    res.json(await consultarCliente(ctx(), req.query)),
  )

  rotas.post('/contratos', async (req, res) => {
    const c = ctx()
    const loteId = lote(c, req.body)
    const contratos = await criarContratos(c, { ...req.body, loteId })
    res.status(201).json({ loteId, quantidade: contratos.length, contratos })
  })

  rotas.get('/contratos', async (req, res) =>
    res.json({
      contratos: await buscarContratos(ctx(), {
        ...req.query,
        aleatorio: simNao(req.query.aleatorio),
      }),
    }),
  )

  rotas.get('/contratos/:numero', async (req, res) =>
    res.json(await obterContrato(ctx(), req.params.numero)),
  )

  rotas.post('/contratos/:numero/pagamentos', async (req, res) =>
    res.json(await pagarParcelas(ctx(), req.params.numero, req.body)),
  )

  rotas.get('/lotes', async (_req, res) => res.json({ lotes: await listarLotes(ctx()) }))
  rotas.get('/lotes/:id', async (req, res) =>
    res.json(await obterLote(ctx(), req.params.id)),
  )
  rotas.delete('/lotes/:id', async (req, res) =>
    res.json(await apagarLote(ctx(), req.params.id)),
  )

  app.use('/api/massa', rotas)
  app.use('/', rotas)

  app.use((_req, res) =>
    res.status(404).json({ erro: 'RotaNaoEncontrada', mensagem: 'Rota não existe.' }),
  )

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ErroApi) {
      return res.status(err.status).json({
        erro: err.codigo,
        mensagem: err.message,
        ...(err.detalhes ? { detalhes: err.detalhes } : {}),
      })
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({
        erro: 'JsonInvalido',
        mensagem: 'Corpo da requisição não é um JSON válido.',
      })
    }
    console.error(err)
    res
      .status(500)
      .json({ erro: 'ErroInterno', mensagem: 'Erro inesperado na API de massa.' })
  })

  return app
}
