// Conquistas de um contrato: marcos de pagamento mostrados como num jogo.
// Só dependem de quantas parcelas foram pagas, então valem para qualquer produto.

export const CONQUISTAS = [
  {
    id: 'primeira',
    nome: 'Primeira parcela',
    descricao: 'O contrato saiu do zero.',
    alcancada: (pagas) => pagas >= 1,
  },
  {
    id: 'metade',
    nome: 'Metade do caminho',
    descricao: 'Metade das parcelas pagas.',
    alcancada: (pagas, total) => total > 1 && pagas >= Math.ceil(total / 2),
  },
  {
    id: 'zerou',
    nome: 'Contrato zerado',
    descricao: 'Todas as parcelas pagas. Fim de jogo, no bom sentido.',
    alcancada: (pagas, total) => total > 0 && pagas >= total,
  },
]

export function conquistasDe(pagas, total) {
  return CONQUISTAS.filter((c) => c.alcancada(pagas, total))
}

// A conquista que um pagamento acabou de liberar (a maior, se forem várias).
export function conquistaNova(pagasAntes, pagasDepois, total) {
  const antes = new Set(conquistasDe(pagasAntes, total).map((c) => c.id))
  const novas = conquistasDe(pagasDepois, total).filter((c) => !antes.has(c.id))
  return novas.at(-1) ?? null
}
