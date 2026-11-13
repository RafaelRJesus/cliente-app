// Formas de pagamento de parcela. É uma simulação: nada é cobrado de verdade.
// Dinheiro só faz sentido no balcão, então só a equipe registra.
export const FORMAS_PAGAMENTO = [
  { id: 'pix', nome: 'Pix' },
  { id: 'credito', nome: 'Cartão de crédito' },
  { id: 'debito', nome: 'Cartão de débito' },
  { id: 'boleto', nome: 'Boleto' },
  { id: 'dinheiro', nome: 'Dinheiro', soEquipe: true },
]

export const formasPara = (equipe) =>
  FORMAS_PAGAMENTO.filter((f) => equipe || !f.soEquipe)

export const nomeFormaPagamento = (id) =>
  FORMAS_PAGAMENTO.find((f) => f.id === id)?.nome ?? ''
