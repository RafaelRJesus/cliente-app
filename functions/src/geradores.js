// Geradores de dados fictícios para a massa de teste.
// Nada aqui pertence a uma pessoa real: CPF com dígito válido e sorteado,
// nomes de listas genéricas, e-mails em example.com e endereços inventados.

import { maskCep, maskCpf, maskPhone, maskPlaca } from '../../src/lib/format.js'

const NOMES = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Elisa',
  'Fábio',
  'Gabriela',
  'Heitor',
  'Isabela',
  'João',
  'Karina',
  'Lucas',
  'Marina',
  'Nicolas',
  'Olívia',
  'Pedro',
  'Queila',
  'Rafael',
  'Sofia',
  'Tiago',
  'Úrsula',
  'Vitor',
  'Yasmin',
  'Zeca',
]
const SOBRENOMES = [
  'Almeida',
  'Barbosa',
  'Cardoso',
  'Dias',
  'Esteves',
  'Ferreira',
  'Gomes',
  'Lima',
  'Martins',
  'Nunes',
  'Oliveira',
  'Pereira',
  'Ramos',
  'Santos',
  'Teixeira',
  'Vieira',
]
const LOGRADOUROS = [
  'Rua das Acácias',
  'Avenida dos Testes',
  'Rua do Respawn',
  'Travessa da Massa',
  'Rua Nível Dois',
  'Avenida Save Point',
  'Rua do Checkpoint',
  'Alameda das Fases',
]
const BAIRROS = ['Centro', 'Jardim Teste', 'Vila Nova', 'Bela Vista', 'Parque das Flores']

// Cidade e faixa de CEP fictícia por UF (DDD de verdade, para o telefone ser válido).
const UFS = {
  RS: { cidade: 'Porto Alegre', ddd: '51', cep: '90' },
  SP: { cidade: 'São Paulo', ddd: '11', cep: '01' },
  RJ: { cidade: 'Rio de Janeiro', ddd: '21', cep: '20' },
  MG: { cidade: 'Belo Horizonte', ddd: '31', cep: '30' },
  PR: { cidade: 'Curitiba', ddd: '41', cep: '80' },
  SC: { cidade: 'Florianópolis', ddd: '48', cep: '88' },
  BA: { cidade: 'Salvador', ddd: '71', cep: '40' },
  PE: { cidade: 'Recife', ddd: '81', cep: '50' },
  CE: { cidade: 'Fortaleza', ddd: '85', cep: '60' },
  AM: { cidade: 'Manaus', ddd: '92', cep: '69' },
  DF: { cidade: 'Brasília', ddd: '61', cep: '70' },
  GO: { cidade: 'Goiânia', ddd: '62', cep: '74' },
}

export const UFS_SUPORTADAS = Object.keys(UFS)

const sortear = (lista, aleatorio) => lista[Math.floor(aleatorio() * lista.length)]
const digitos = (n, aleatorio) =>
  Array.from({ length: n }, () => Math.floor(aleatorio() * 10)).join('')

/** CPF de 11 dígitos com dígitos verificadores válidos (sem máscara). */
export function gerarCpf(aleatorio = Math.random) {
  let base
  do base = digitos(9, aleatorio)
  while (/^(\d)\1{8}$/.test(base))
  const dv = (parcial) => {
    const soma = [...parcial].reduce(
      (acc, d, i) => acc + Number(d) * (parcial.length + 1 - i),
      0,
    )
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  const d1 = dv(base)
  return base + d1 + dv(base + d1)
}

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Dados de um cadastro de cliente no mesmo formato que a tela Clientes grava. */
export function gerarCliente({
  uf = 'RS',
  agora = new Date(),
  aleatorio = Math.random,
} = {}) {
  const regiao = UFS[uf]
  if (!regiao) throw new Error(`UF não suportada: ${uf}`)
  const nome = `${sortear(NOMES, aleatorio)} ${sortear(SOBRENOMES, aleatorio)} ${sortear(SOBRENOMES, aleatorio)}`
  const [primeiro, , ultimo] = semAcento(nome).toLowerCase().split(' ')
  const cpf = gerarCpf(aleatorio)
  return {
    nome,
    email: `${primeiro}.${ultimo}.${cpf.slice(-4)}@example.com`,
    telefone: maskPhone(`${regiao.ddd}9${digitos(8, aleatorio)}`),
    cpf: maskCpf(cpf),
    endereco: {
      cep: maskCep(`${regiao.cep}${digitos(6, aleatorio)}`),
      logradouro: sortear(LOGRADOUROS, aleatorio),
      numero: String(1 + Math.floor(aleatorio() * 2000)),
      complemento: '',
      bairro: sortear(BAIRROS, aleatorio),
      cidade: regiao.cidade,
      uf,
    },
    criadoEm: agora.toISOString(),
  }
}

/** Placa no padrão Mercosul, com a mesma máscara da tela (ABC-1D23). */
export function gerarPlaca(aleatorio = Math.random) {
  const letra = () => String.fromCharCode(65 + Math.floor(aleatorio() * 26))
  return maskPlaca(
    `${letra()}${letra()}${letra()}${digitos(1, aleatorio)}${letra()}${digitos(2, aleatorio)}`,
  )
}
