// Tamanho máximo de cada campo de texto. Precisa bater com firestore.rules
// (o teste limites.test.js confere).
export const LIMITES_CLIENTE = {
  nome: 120,
  email: 160,
  telefone: 20,
  cpf: 14,
  cep: 9,
  logradouro: 120,
  numero: 10,
  complemento: 60,
  bairro: 60,
  cidade: 60,
  uf: 2,
}
