import { beforeEach, describe, expect, it } from 'vitest'
import { isValidCpf } from '../../src/lib/validators.js'
import { CAMPOS_REGRAS, HOJE, montarApi } from './apoio.js'

let api
beforeEach(async () => {
  api = await montarApi()
})

const dadosDe = async (colecao, id) => {
  const snap = await api.db.collection(colecao).doc(id).get()
  return snap.exists ? snap.data() : undefined
}

const soCampos = (obj, permitidos) =>
  Object.keys(obj).filter((k) => !permitidos.includes(k))

describe('acesso', () => {
  it('saúde responde sem chave', async () => {
    const r = await api.semChave.get('/api/massa/saude')
    expect(r.status).toBe(200)
    expect(r.body.ok).toBe(true)
  })

  it('recusa sem chave ou com chave errada', async () => {
    expect((await api.semChave.get('/api/massa/produtos')).status).toBe(401)
    const r = await api.semChave.get('/api/massa/produtos').set('x-api-key', 'outra')
    expect(r.status).toBe(401)
    expect(r.body.erro).toBe('NaoAutorizado')
  })

  it('avisa quando a chave não foi configurada', async () => {
    const semConfig = await montarApi({ chave: '' })
    const r = await semConfig.get('/api/massa/produtos')
    expect(r.status).toBe(503)
  })

  it('responde também na raiz (URL direta da função)', async () => {
    expect((await api.get('/produtos')).status).toBe(200)
  })

  it('rota desconhecida dá 404 em JSON', async () => {
    const r = await api.get('/api/massa/nada')
    expect(r.status).toBe(404)
    expect(r.body.erro).toBe('RotaNaoEncontrada')
  })
})

describe('produtos', () => {
  it('lista os cinco produtos com prefixo', async () => {
    const r = await api.get('/api/massa/produtos')
    expect(r.body.produtos.map((p) => `${p.id}:${p.prefixo}`)).toEqual([
      'pessoal:101',
      'consignado:102',
      'veiculo:103',
      'imovel:104',
      'pix:105',
    ])
    expect(r.body.situacoes).toEqual(['em dia', 'em atraso', 'quitado'])
  })

  it('traz o catálogo: sigla, prefixos e razão especial por risco', async () => {
    const r = await api.get('/api/massa/produtos')
    expect(r.body.riscos.map((x) => x.id)).toEqual(['RSP', 'FFC'])
    expect(
      r.body.produtos.map(
        (p) =>
          `${p.sigla}:${p.prefixos.RSP}/${p.prefixos.FFC}:${p.razoesEspeciais.RSP}${p.razoesEspeciais.FFC}`,
      ),
    ).toEqual([
      'EMP:101/201:EF',
      'CSG:102/202:CD',
      'CGV:103/203:GH',
      'CGI:104/204:IJ',
      'PXP:105/205:PQ',
    ])
  })
})

describe('clientes', () => {
  it('cria em lote com numeração sequencial e CPF válido', async () => {
    const r = await api.post('/api/massa/clientes', { quantidade: 3, uf: 'SP' })
    expect(r.status).toBe(201)
    expect(r.body.quantidade).toBe(3)
    expect(r.body.clientes.map((c) => c.numero)).toEqual([1, 2, 3])
    for (const c of r.body.clientes) {
      expect(isValidCpf(c.cpf)).toBe(true)
      expect(c.cpf).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
      expect(c.email).toMatch(/@example\.com$/)
      expect(c.endereco.uf).toBe('SP')
      expect(c.criadoPor).toBe('api-massa')
    }
    expect((await dadosDe('contadores', 'clientes')).ultimo).toBe(3)
  })

  it('grava o cadastro só com os campos que as regras aceitam', async () => {
    const r = await api.post('/api/massa/clientes', {})
    const doc = await dadosDe('clientes', r.body.clientes[0].id)
    expect(soCampos(doc, CAMPOS_REGRAS.cliente)).toEqual([])
    expect(soCampos(doc.endereco, CAMPOS_REGRAS.endereco)).toEqual([])
    expect(doc.nome.length).toBeLessThanOrEqual(120)
  })

  it('aceita dados informados e recusa CPF repetido', async () => {
    const dados = {
      nome: 'Cliente Fixo',
      cpf: '529.982.247-25',
      email: 'fixo@example.com',
    }
    const r1 = await api.post('/api/massa/clientes', { dados })
    expect(r1.status).toBe(201)
    expect(r1.body.clientes[0]).toMatchObject({ id: '52998224725', nome: 'Cliente Fixo' })
    const r2 = await api.post('/api/massa/clientes', { dados })
    expect(r2.status).toBe(409)
  })

  it('valida os dados como o formulário', async () => {
    const r = await api.post('/api/massa/clientes', { dados: { cpf: '111.111.111-11' } })
    expect(r.status).toBe(400)
    expect(r.body.detalhes.cpf).toBe('CPF inválido.')
  })

  it('recusa quantidade fora de 1 a 100 e UF sem suporte', async () => {
    expect((await api.post('/api/massa/clientes', { quantidade: 101 })).status).toBe(400)
    expect((await api.post('/api/massa/clientes', { uf: 'XX' })).status).toBe(400)
  })

  it('consulta por CPF, número e e-mail', async () => {
    const criado = (await api.post('/api/massa/clientes', {})).body.clientes[0]
    for (const q of [
      `cpf=${criado.cpf}`,
      `numero=${criado.numero}`,
      `email=${criado.email}`,
    ]) {
      const r = await api.get(`/api/massa/clientes?${q}`)
      expect(r.status).toBe(200)
      expect(r.body.cliente.id).toBe(criado.id)
      expect(r.body.situacao).toBe('sem contrato')
    }
    expect((await api.get('/api/massa/clientes?cpf=00000000000')).status).toBe(404)
    expect((await api.get('/api/massa/clientes')).status).toBe(400)
  })

  it('lista clientes sem contrato', async () => {
    await api.post('/api/massa/clientes', { quantidade: 2 })
    await api.post('/api/massa/contratos', {})
    const r = await api.get('/api/massa/clientes/sem-contrato')
    expect(r.body.clientes).toHaveLength(2)
  })
})

describe('contratos', () => {
  it('sem CPF cria cliente novo e contrato em dia, com o número do app', async () => {
    const r = await api.post('/api/massa/contratos', {})
    expect(r.status).toBe(201)
    const [c] = r.body.contratos
    expect(c.numeroContrato).toBe('1010000001001')
    expect(c).toMatchObject({
      produto: 'pessoal',
      prazo: 12,
      situacao: 'em dia',
      dataContratacao: HOJE,
    })
    const lote = await dadosDe('massaLotes', r.body.loteId)
    expect(lote.clientes).toEqual([c.clienteId])
    expect(lote.contratos).toEqual([c.id])
  })

  it('com CPF numera a sequência do mesmo cliente', async () => {
    const cliente = (await api.post('/api/massa/clientes', {})).body.clientes[0]
    const r = await api.post('/api/massa/contratos', {
      cpf: cliente.cpf,
      quantidade: 2,
      produto: 'consignado',
    })
    expect(r.body.contratos.map((c) => c.numeroContrato)).toEqual([
      '1020000001001',
      '1020000001002',
    ])
    expect((await dadosDe('clientes', cliente.id)).ultimoContrato).toBe(2)
  })

  it('cada produto gera contrato válido e no formato das regras', async () => {
    for (const produto of ['pessoal', 'consignado', 'veiculo', 'imovel', 'pix']) {
      const r = await api.post('/api/massa/contratos', { produto })
      expect(r.status, produto).toBe(201)
      const doc = await dadosDe('contratos', r.body.contratos[0].id)
      expect(soCampos(doc, CAMPOS_REGRAS.contrato), produto).toEqual([])
      expect(soCampos(doc.detalhes, CAMPOS_REGRAS.detalhes), produto).toEqual([])
      for (const p of doc.parcelas) expect(soCampos(p, CAMPOS_REGRAS.parcela)).toEqual([])
      expect(doc.parcelas).toHaveLength(doc.prazo)
      expect(doc.taxaMensal).toBeLessThanOrEqual(0.2)
    }
  })

  it('grava sigla, risco e razão especial; risco FFC troca o 1º dígito do número', async () => {
    const padrao = (await api.post('/api/massa/contratos', { produto: 'veiculo' })).body
      .contratos[0]
    expect(padrao).toMatchObject({ tipo: 'CGV_RSP', risco: 'RSP', razaoEspecial: 'G' })
    expect(padrao.numeroContrato.slice(0, 3)).toBe('103')

    const r = await api.post('/api/massa/contratos', { produto: 'imovel', risco: 'ffc' })
    expect(r.status).toBe(201)
    const [c] = r.body.contratos
    expect(c).toMatchObject({ tipo: 'CGI_FFC', risco: 'FFC', razaoEspecial: 'J' })
    expect(c.numeroContrato.slice(0, 3)).toBe('204')
    const doc = await dadosDe('contratos', c.id)
    expect(doc).toMatchObject({ sigla: 'CGI', risco: 'FFC', razaoEspecial: 'J' })
    expect(soCampos(doc, CAMPOS_REGRAS.contrato)).toEqual([])
  })

  it('recusa risco fora do catálogo', async () => {
    const r = await api.post('/api/massa/contratos', { risco: 'CPR' })
    expect(r.status).toBe(400)
    expect(r.body).toMatchObject({ erro: 'PedidoInvalido' })
    expect(r.body.mensagem).toMatch(/risco inválido/)
  })

  it('pix financia o IOF: quem recebe fica com o valor pedido', async () => {
    const r = await api.post('/api/massa/contratos', { produto: 'pix', valor: 1000 })
    const doc = await dadosDe('contratos', r.body.contratos[0].id)
    expect(doc.detalhes).toEqual({ valorPix: 1000, iofFinanciado: true })
    expect(doc.valor).toBeGreaterThan(1000)
  })

  it('veículo e consignado ganham garantia e renda que passam na validação', async () => {
    const v = await api.post('/api/massa/contratos', { produto: 'veiculo', valor: 30000 })
    const dv = await dadosDe('contratos', v.body.contratos[0].id)
    expect(dv.detalhes.placa).toMatch(/^[A-Z]{3}-\d[A-Z]\d{2}$/)
    expect(dv.detalhes.valorFipe * 0.7).toBeGreaterThanOrEqual(30000)
    const c = await api.post('/api/massa/contratos', {
      produto: 'consignado',
      convenio: 'publico',
    })
    const dc = await dadosDe('contratos', c.body.contratos[0].id)
    expect(dc.detalhes.convenio).toBe('Servidor público')
    expect(dc.parcelas[0].valor).toBeLessThanOrEqual(dc.detalhes.renda * 0.35)
  })

  it('gera contrato em atraso, com parcelas pagas e quitado', async () => {
    const atraso = await api.post('/api/massa/contratos', {
      situacao: 'em atraso',
      parcelasVencidas: 2,
    })
    expect(atraso.body.contratos[0]).toMatchObject({
      situacao: 'em atraso',
      parcelasVencidas: 2,
      parcelasPagas: 0,
    })

    const pagas = await api.post('/api/massa/contratos', { parcelasPagas: 3 })
    expect(pagas.body.contratos[0]).toMatchObject({
      situacao: 'em dia',
      parcelasPagas: 3,
      parcelasVencidas: 0,
    })

    const quitado = await api.post('/api/massa/contratos', {
      situacao: 'quitado',
      prazo: 6,
    })
    expect(quitado.body.contratos[0]).toMatchObject({
      situacao: 'quitado',
      parcelasPagas: 6,
      saldoDevedor: 0,
    })
  })

  it('recusa parâmetros fora das regras do produto antes de gravar', async () => {
    const r = await api.post('/api/massa/contratos', { produto: 'pix', valor: 50_000 })
    expect(r.status).toBe(400)
    expect(r.body.detalhes.valor).toMatch(/^Entre/)
    expect(
      (await api.get('/api/massa/clientes/sem-contrato')).body.clientes,
    ).toHaveLength(0)
    expect((await api.post('/api/massa/contratos', { produto: 'cartao' })).status).toBe(
      400,
    )
    expect((await api.post('/api/massa/contratos', { cpf: '52998224725' })).status).toBe(
      404,
    )
  })

  it('busca por produto, situação, faixa, número e CPF', async () => {
    await api.post('/api/massa/contratos', { produto: 'pessoal', quantidade: 2 })
    await api.post('/api/massa/contratos', { produto: 'pix', situacao: 'em atraso' })

    const pix = await api.get('/api/massa/contratos?produto=pix')
    expect(pix.body.contratos).toHaveLength(1)
    const atrasados = await api.get('/api/massa/contratos?situacao=em%20atraso')
    expect(atrasados.body.contratos.map((c) => c.produto)).toEqual(['pix'])
    const faixa = await api.get('/api/massa/contratos?de=1010000001001&ate=1019999999999')
    expect(faixa.body.contratos).toHaveLength(2)

    const um = pix.body.contratos[0]
    const porNumero = await api.get(`/api/massa/contratos/${um.numeroContrato}`)
    expect(porNumero.body.parcelas).toHaveLength(um.prazo)
    const porCpf = await api.get(`/api/massa/contratos?cpf=${um.clienteId}`)
    expect(porCpf.body.contratos[0].id).toBe(um.id)
    expect(
      (await api.get('/api/massa/contratos?aleatorio=true&limite=1')).body.contratos,
    ).toHaveLength(1)
    expect((await api.get('/api/massa/contratos/1019999999999')).status).toBe(404)
  })

  it('busca por risco', async () => {
    await api.post('/api/massa/contratos', { produto: 'pix' })
    await api.post('/api/massa/contratos', {
      produto: 'pix',
      risco: 'FFC',
      quantidade: 2,
    })
    const ffc = await api.get('/api/massa/contratos?risco=FFC')
    expect(ffc.body.contratos.map((c) => c.tipo)).toEqual(['PXP_FFC', 'PXP_FFC'])
    const rsp = await api.get('/api/massa/contratos?risco=rsp')
    expect(rsp.body.contratos.map((c) => c.tipo)).toEqual(['PXP_RSP'])
    expect((await api.get('/api/massa/contratos?risco=XYZ')).status).toBe(400)
  })
})

describe('pagamentos', () => {
  it('paga as vencidas com multa e juros de mora, e o contrato volta a ficar em dia', async () => {
    const criado = await api.post('/api/massa/contratos', {
      situacao: 'em atraso',
      parcelasVencidas: 2,
    })
    const numero = criado.body.contratos[0].numeroContrato
    const r = await api.post(`/api/massa/contratos/${numero}/pagamentos`, {
      parcelas: 'vencidas',
      formaPagamento: 'boleto',
    })
    expect(r.status).toBe(200)
    expect(r.body.pagamentos).toHaveLength(2)
    for (const p of r.body.pagamentos) {
      expect(p.dias).toBeGreaterThan(0)
      expect(p.multa).toBeGreaterThan(0)
      expect(p.total).toBeGreaterThan(p.multa + p.juros)
    }
    expect(r.body.contrato.situacao).toBe('em dia')
    const doc = (await api.get(`/api/massa/contratos/${numero}`)).body
    expect(doc.parcelas[0]).toMatchObject({ pagaEm: HOJE, formaPagamento: 'boleto' })
  })

  it('paga parcelas escolhidas e recusa parcela já paga', async () => {
    const numero = (await api.post('/api/massa/contratos', {})).body.contratos[0]
      .numeroContrato
    const r = await api.post(`/api/massa/contratos/${numero}/pagamentos`, {
      parcelas: [1, 2],
    })
    expect(r.body.pagamentos.map((p) => p.parcela)).toEqual([1, 2])
    expect(r.body.pagamentos[0].multa).toBe(0) // antes do vencimento: sem encargos
    const de_novo = await api.post(`/api/massa/contratos/${numero}/pagamentos`, {
      parcelas: [2],
    })
    expect(de_novo.status).toBe(409)
  })

  it('quita tudo com "todas" e não acha nada para pagar depois', async () => {
    const numero = (await api.post('/api/massa/contratos', { prazo: 3 })).body
      .contratos[0].numeroContrato
    const r = await api.post(`/api/massa/contratos/${numero}/pagamentos`, {
      parcelas: 'todas',
    })
    expect(r.body.contrato.situacao).toBe('quitado')
    expect((await api.post(`/api/massa/contratos/${numero}/pagamentos`, {})).status).toBe(
      409,
    )
  })
})

describe('simulações', () => {
  it('compara prazos sem gravar nada', async () => {
    const r = await api.post('/api/massa/simulacoes', {
      produto: 'pessoal',
      valor: 10000,
      prazos: [6, 12, 24],
    })
    expect(r.status).toBe(200)
    const parcelas = r.body.planos.map((p) => p.primeiraParcela)
    expect(parcelas[0]).toBeGreaterThan(parcelas[1])
    expect(parcelas[1]).toBeGreaterThan(parcelas[2])
    expect(r.body.planos[0].cetAnual).toBeGreaterThan(r.body.planos[0].taxaMensal * 12)
    expect((await api.get('/api/massa/lotes')).body.lotes).toEqual([])
  })

  it('devolve o cronograma quando pedido e valida o produto', async () => {
    const r = await api.post('/api/massa/simulacoes', {
      produto: 'imovel',
      valor: 100000,
      prazo: 120,
      sistema: 'SAC',
      cronograma: true,
    })
    expect(r.body.planos[0].parcelas).toHaveLength(120)
    expect(
      (await api.post('/api/massa/simulacoes', { produto: 'pix', prazo: 24 })).status,
    ).toBe(400)
  })
})

describe('lotes', () => {
  it('junta chamadas no mesmo lote e apaga tudo depois', async () => {
    const primeiro = await api.post('/api/massa/clientes', {
      quantidade: 2,
      descricao: 'regressão',
    })
    const { loteId } = primeiro.body
    await api.post('/api/massa/contratos', { loteId, quantidade: 2 })

    const lote = (await api.get(`/api/massa/lotes/${loteId}`)).body
    expect(lote).toMatchObject({ descricao: 'regressão' })
    expect(lote.clientes).toHaveLength(4)
    expect(lote.contratos).toHaveLength(2)
    expect((await api.get('/api/massa/lotes')).body.lotes[0]).toMatchObject({
      id: loteId,
      clientes: 4,
      contratos: 2,
    })

    const r = await api.del(`/api/massa/lotes/${loteId}`)
    expect(r.body).toMatchObject({
      contratosApagados: 2,
      clientesApagados: 4,
      clientesMantidos: [],
    })
    expect((await api.get('/api/massa/contratos')).body.contratos).toEqual([])
    expect((await api.get(`/api/massa/lotes/${loteId}`)).status).toBe(404)
  })

  it('não apaga cliente que já tem acesso ao app ou contrato fora do lote', async () => {
    const { loteId, clientes } = (
      await api.post('/api/massa/clientes', { quantidade: 2 })
    ).body
    const [comAcesso, comContrato] = clientes
    await api.db
      .collection('usuarios')
      .doc('uid-1')
      .set({ papel: 'cliente', clienteId: comAcesso.id })
    await api.post('/api/massa/contratos', { cpf: comContrato.cpf }) // outro lote

    const r = await api.del(`/api/massa/lotes/${loteId}`)
    expect(r.body.clientesApagados).toBe(0)
    expect(r.body.clientesMantidos.map((m) => m.motivo).sort()).toEqual([
      'tem acesso ao app',
      'tem contrato fora do lote',
    ])
    expect(await dadosDe('clientes', comAcesso.id)).toBeDefined()
  })
})
