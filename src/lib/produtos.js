// Parâmetros genéricos de cada produto do simulador.
// São regras de exemplo (próximas das praticadas no mercado), não de um banco específico.

export const PRODUTOS = {
  pessoal: {
    nome: 'Crédito pessoal',
    descricao: 'Sem garantia, dinheiro na conta.',
    valorMin: 500,
    valorMax: 100_000,
    prazoMax: 60,
    taxaPadrao: 5.0,
    referenciaBcb: 'Crédito pessoal não consignado - Prefixado',
  },
  consignado: {
    nome: 'Consignado',
    descricao: 'Parcela descontada em folha ou benefício.',
    valorMin: 500,
    valorMax: 300_000,
    prazoMax: 84,
    taxaPadrao: 1.8,
    margem: 0.35,
    convenios: {
      inss: {
        nome: 'INSS (aposentado/pensionista)',
        referenciaBcb: 'Crédito pessoal consignado INSS - Prefixado',
      },
      publico: {
        nome: 'Servidor público',
        referenciaBcb: 'Crédito pessoal consignado público - Prefixado',
      },
      privado: {
        nome: 'CLT (setor privado)',
        referenciaBcb: 'Crédito pessoal consignado privado - Prefixado',
      },
    },
  },
  veiculo: {
    nome: 'Garantia de veículo',
    descricao: 'Refinanciamento com o carro/moto quitado como garantia.',
    valorMin: 3_000,
    valorMax: 250_000,
    prazoMax: 60,
    taxaPadrao: 1.9,
    ltv: 0.7,
    idadeMaxVeiculo: 15,
    referenciaBcb: 'Aquisição de veículos - Prefixado',
    referenciaObs:
      'O BC não publica taxa de refinanciamento de veículo; usamos aquisição de veículos como referência.',
  },
  imovel: {
    nome: 'Garantia de imóvel',
    descricao: 'Home equity: imóvel quitado como garantia, prazo longo.',
    valorMin: 30_000,
    valorMax: 2_000_000,
    prazoMax: 240,
    taxaPadrao: 1.2,
    ltv: 0.6,
    referenciaBcb: 'Financiamento imobiliário com taxas de mercado - Prefixado',
    referenciaObs:
      'O BC não publica taxa de home equity; usamos financiamento imobiliário como referência.',
  },
  pix: {
    nome: 'Pix parcelado',
    descricao: 'Paga um Pix agora e parcela em até 12x.',
    valorMin: 50,
    valorMax: 10_000,
    prazoMax: 12,
    taxaPadrao: 6.5,
    referenciaBcb: 'Cartão de crédito - parcelado - Prefixado',
    referenciaObs:
      'O BC ainda não publica taxa de Pix parcelado; usamos cartão parcelado como referência.',
  },
}

export const referenciaBcb = (produto, convenio) =>
  produto === 'consignado'
    ? PRODUTOS.consignado.convenios[convenio]?.referenciaBcb
    : PRODUTOS[produto].referenciaBcb

export function valorMaximo(produto, garantia = {}) {
  const regra = PRODUTOS[produto]
  if (produto === 'veiculo' && garantia.valorFipe) {
    return Math.min(regra.valorMax, Math.floor(garantia.valorFipe * regra.ltv))
  }
  if (produto === 'imovel' && garantia.valorImovel) {
    return Math.min(regra.valorMax, Math.floor(garantia.valorImovel * regra.ltv))
  }
  return regra.valorMax
}

export function validarProduto(
  { produto, valor, prazo, taxa, primeiraParcela, garantia = {}, consignado = {} },
  anoAtual = new Date().getFullYear(),
) {
  const regra = PRODUTOS[produto]
  const errors = {}
  const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (produto === 'veiculo') {
    if (!garantia.valorFipe)
      errors.garantia = 'Selecione o veículo para buscar o valor FIPE.'
    else if (anoAtual - garantia.anoModelo > regra.idadeMaxVeiculo) {
      errors.garantia = `Veículo com mais de ${regra.idadeMaxVeiculo} anos não é aceito como garantia.`
    }
  }

  if (produto === 'imovel' && !(garantia.valorImovel > 0)) {
    errors.garantia = 'Informe o valor do imóvel.'
  }

  const max = valorMaximo(produto, garantia)
  if (!(valor >= regra.valorMin && valor <= max)) {
    errors.valor =
      max < regra.valorMin
        ? 'O valor da garantia não permite crédito neste produto.'
        : `Entre ${brl(regra.valorMin)} e ${brl(max)}.`
  }

  if (!(Number.isInteger(prazo) && prazo >= 1 && prazo <= regra.prazoMax)) {
    errors.prazo = `De 1 a ${regra.prazoMax} meses.`
  }

  if (taxa == null) errors.taxa = 'Informe a taxa.'
  else if (!(taxa >= 0 && taxa <= 20)) errors.taxa = 'Entre 0% e 20% a.m.'

  if (produto === 'consignado') {
    if (!(consignado.renda > 0)) errors.renda = 'Informe a renda líquida.'
    else if (primeiraParcela > consignado.renda * regra.margem) {
      errors.valor = `Parcela acima da margem consignável (${brl(consignado.renda * regra.margem)}).`
    }
  }

  return errors
}
