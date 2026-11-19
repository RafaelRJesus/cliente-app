// Catálogo padrão de contratos (o mesmo da Central de Massa).
// Cada produto tem uma sigla e pode ter risco RSP (Respawn) ou FFC (Fundo
// Financeiro). O tipo do contrato é SIGLA_RISCO (ex.: EMP_RSP) e cada tipo
// tem uma razão especial própria (uma letra).

export const SIGLAS = {
  pessoal: 'EMP', // empréstimo pessoal
  consignado: 'CSG', // consignado
  veiculo: 'CGV', // crédito com garantia de veículo
  imovel: 'CGI', // crédito com garantia de imóvel
  pix: 'PXP', // pix parcelado
}

// O dígito do risco é o 1º dígito do número do contrato.
export const RISCOS = {
  RSP: { nome: 'Respawn', digito: '1' },
  FFC: { nome: 'Fundo Financeiro', digito: '2' },
}

export const RISCO_PADRAO = 'RSP'

export const RAZOES_ESPECIAIS = {
  EMP_RSP: 'E',
  EMP_FFC: 'F',
  CSG_RSP: 'C',
  CSG_FFC: 'D',
  CGV_RSP: 'G',
  CGV_FFC: 'H',
  CGI_RSP: 'I',
  CGI_FFC: 'J',
  PXP_RSP: 'P',
  PXP_FFC: 'Q',
}

// Os dois dígitos do produto no número do contrato (depois do dígito do risco).
export const CODIGOS_PRODUTO = {
  pessoal: '01',
  consignado: '02',
  veiculo: '03',
  imovel: '04',
  pix: '05',
}

/** Campos que todo contrato novo grava: sigla, risco e razão especial. */
export function classificarContrato(produto, risco = RISCO_PADRAO) {
  const sigla = SIGLAS[produto]
  if (!sigla) throw new Error(`Produto fora do catálogo: ${produto}`)
  if (!RISCOS[risco]) {
    throw new Error(`Risco inválido: ${risco}. Use ${Object.keys(RISCOS).join(' ou ')}.`)
  }
  return { sigla, risco, razaoEspecial: RAZOES_ESPECIAIS[`${sigla}_${risco}`] }
}

/** Prefixo de 3 dígitos do número: risco (1 RSP, 2 FFC) + produto (01 a 05). */
export function prefixoDoContrato(produto, risco = RISCO_PADRAO) {
  if (!CODIGOS_PRODUTO[produto]) throw new Error(`Produto sem prefixo: ${produto}`)
  if (!RISCOS[risco]) throw new Error(`Risco inválido: ${risco}`)
  return RISCOS[risco].digito + CODIGOS_PRODUTO[produto]
}

/** Contratos antigos (sem o campo) são do risco Respawn. */
export const riscoDoContrato = (contrato) => contrato?.risco ?? RISCO_PADRAO

/** Tipo do contrato no catálogo, ex.: EMP_RSP. */
export const tipoDoContrato = (contrato) =>
  `${contrato?.sigla ?? SIGLAS[contrato?.produto] ?? '?'}_${riscoDoContrato(contrato)}`
