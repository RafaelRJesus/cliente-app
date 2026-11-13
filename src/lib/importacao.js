import { maskCep, maskCpf, maskPhone, onlyDigits } from './format'
import { validateCliente } from './validators'

// Importação de clientes por planilha: a leitura do arquivo fica em
// planilha.js; aqui só regras, para dar para testar sem arquivo.

export const MAX_LINHAS = 500

// Ordem das colunas do modelo. Endereço é opcional: o CEP completa.
export const COLUNAS = [
  { campo: 'nome', rotulo: 'Nome', obrigatoria: true, exemplo: 'Maria Silva' },
  { campo: 'cpf', rotulo: 'CPF', obrigatoria: true, exemplo: '529.982.247-25' },
  { campo: 'email', rotulo: 'E-mail', obrigatoria: true, exemplo: 'maria@exemplo.com' },
  {
    campo: 'telefone',
    rotulo: 'Telefone',
    obrigatoria: true,
    exemplo: '(51) 99999-8888',
  },
  { campo: 'cep', rotulo: 'CEP', obrigatoria: true, exemplo: '01001-000' },
  { campo: 'numero', rotulo: 'Número', obrigatoria: true, exemplo: '100' },
  { campo: 'complemento', rotulo: 'Complemento', exemplo: 'Apto 12' },
  { campo: 'logradouro', rotulo: 'Logradouro', exemplo: '' },
  { campo: 'bairro', rotulo: 'Bairro', exemplo: '' },
  { campo: 'cidade', rotulo: 'Cidade', exemplo: '' },
  { campo: 'uf', rotulo: 'UF', exemplo: '' },
]

const ROTULO = Object.fromEntries(COLUNAS.map((c) => [c.campo, c.rotulo]))

// Cabeçalhos aceitos, já normalizados (minúsculo, sem acento nem símbolo).
const APELIDOS = {
  nome: 'nome',
  nomecompleto: 'nome',
  cliente: 'nome',
  cpf: 'cpf',
  email: 'email',
  telefone: 'telefone',
  celular: 'telefone',
  fone: 'telefone',
  whatsapp: 'telefone',
  cep: 'cep',
  numero: 'numero',
  n: 'numero',
  no: 'numero',
  complemento: 'complemento',
  logradouro: 'logradouro',
  endereco: 'logradouro',
  rua: 'logradouro',
  bairro: 'bairro',
  cidade: 'cidade',
  municipio: 'cidade',
  uf: 'uf',
  estado: 'uf',
}

export const normalizarCabecalho = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const texto = (valor) =>
  valor === null || valor === undefined ? '' : String(valor).trim()

// Excel guarda CPF e CEP digitados como número e perde o zero da frente.
const comZeros = (valor, tamanho) => {
  const digitos = onlyDigits(texto(valor))
  return typeof valor === 'number' && digitos.length < tamanho
    ? digitos.padStart(tamanho, '0')
    : texto(valor)
}

/**
 * Converte a matriz da planilha (linhas x células) em registros.
 * A primeira linha não vazia é o cabeçalho; colunas desconhecidas são ignoradas.
 */
export function lerLinhas(matriz) {
  const vazia = (linha) => !linha || linha.every((c) => texto(c) === '')
  const inicio = matriz.findIndex((linha) => !vazia(linha))
  if (inicio === -1) return { linhas: [], faltando: COLUNAS.filter((c) => c.obrigatoria) }

  const mapa = matriz[inicio].map((h) => APELIDOS[normalizarCabecalho(h)] ?? null)
  const faltando = COLUNAS.filter((c) => c.obrigatoria && !mapa.includes(c.campo))

  const linhas = []
  matriz.slice(inicio + 1).forEach((celulas, i) => {
    if (vazia(celulas)) return
    const dados = Object.fromEntries(COLUNAS.map((c) => [c.campo, '']))
    mapa.forEach((campo, j) => {
      if (!campo) return
      const valor = celulas[j]
      if (campo === 'cpf') dados.cpf = comZeros(valor, 11)
      else if (campo === 'cep') dados.cep = comZeros(valor, 8)
      else dados[campo] = texto(valor)
    })
    linhas.push({ linha: inicio + i + 2, dados })
  })
  return { linhas, faltando }
}

// Máscaras iguais às do formulário. Tamanho errado fica como veio, para a
// validação acusar em vez de a máscara cortar dígitos.
function formatar(d) {
  const cpf = onlyDigits(d.cpf)
  const cep = onlyDigits(d.cep)
  return {
    ...d,
    cpf: cpf.length === 11 ? maskCpf(cpf) : d.cpf,
    telefone: [10, 11].includes(onlyDigits(d.telefone).length)
      ? maskPhone(d.telefone)
      : d.telefone,
    cep: cep.length === 8 ? maskCep(cep) : d.cep,
    email: d.email.toLowerCase(),
    uf: d.uf.toUpperCase(),
  }
}

const precisaDoCep = (d) => !d.logradouro || !d.cidade || !d.uf

/**
 * Classifica cada linha em ok, duplicado ou erro, completando o endereço pelo
 * CEP quando faltar. buscarCep é injetado (testes e cache).
 */
export async function prepararImportacao(
  linhas,
  { cpfsExistentes = new Set(), buscarCep },
) {
  const ceps = new Map()
  const consultarCep = (cep) => {
    const chave = onlyDigits(cep)
    if (!ceps.has(chave))
      ceps.set(
        chave,
        buscarCep(chave).catch(() => null),
      )
    return ceps.get(chave)
  }

  const vistos = new Map()
  const resultado = []
  for (const { linha, dados: brutos } of linhas) {
    let dados = formatar(brutos)
    const motivos = []

    if (precisaDoCep(dados) && onlyDigits(dados.cep).length === 8) {
      const endereco = await consultarCep(dados.cep)
      if (endereco) {
        dados = {
          ...dados,
          logradouro: dados.logradouro || endereco.logradouro,
          bairro: dados.bairro || endereco.bairro,
          cidade: dados.cidade || endereco.cidade,
          uf: dados.uf || endereco.uf,
        }
      } else {
        motivos.push('CEP: não encontrado; preencha logradouro, cidade e UF.')
      }
    }

    const erros = validateCliente(dados)
    if (erros.cpf === undefined && onlyDigits(brutos.cpf).length !== 11)
      erros.cpf = 'CPF inválido.'
    for (const [campo, msg] of Object.entries(erros)) {
      if (campo === 'cep' && motivos.length) continue
      motivos.push(`${ROTULO[campo] ?? campo}: ${msg}`)
    }

    const cpf = onlyDigits(dados.cpf)
    let status = motivos.length ? 'erro' : 'ok'
    if (status === 'ok' && cpfsExistentes.has(cpf)) {
      status = 'duplicado'
      motivos.push('CPF já cadastrado.')
    } else if (status === 'ok' && vistos.has(cpf)) {
      status = 'duplicado'
      motivos.push(`CPF repetido na planilha (linha ${vistos.get(cpf)}).`)
    }
    if (status === 'ok') vistos.set(cpf, linha)

    resultado.push({ linha, dados, status, motivos })
  }
  return resultado
}

/** Mesmo formato que o cadastro manual grava. */
export function paraCliente(dados, agora = new Date()) {
  return {
    nome: dados.nome.trim(),
    email: dados.email.trim().toLowerCase(),
    telefone: dados.telefone,
    cpf: dados.cpf,
    endereco: {
      cep: dados.cep,
      logradouro: dados.logradouro.trim(),
      numero: dados.numero.trim(),
      complemento: dados.complemento.trim(),
      bairro: dados.bairro.trim(),
      cidade: dados.cidade.trim(),
      uf: dados.uf.trim().toUpperCase(),
    },
    criadoEm: agora.toISOString(),
  }
}

/** Planilha de volta para corrigir: as colunas do modelo + linha e motivo. */
export function planilhaDeRecusadas(itens) {
  return [
    ['Linha', 'Motivo', ...COLUNAS.map((c) => c.rotulo)],
    ...itens.map((i) => [
      i.linha,
      i.motivos.join(' '),
      ...COLUNAS.map((c) => i.dados[c.campo] ?? ''),
    ]),
  ]
}

export const planilhaModelo = () => [
  COLUNAS.map((c) => c.rotulo),
  COLUNAS.map((c) => c.exemplo),
]
