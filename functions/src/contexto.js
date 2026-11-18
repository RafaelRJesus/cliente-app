// O que os serviços recebem de fora: banco, relógio e sorteio.
// Nos testes, o relógio e o sorteio são fixos para o resultado ser repetível.

export const FUSO = 'America/Sao_Paulo'

/** Data AAAA-MM-DD no fuso do Brasil (o app usa a data local do navegador). */
export const dataNoFuso = (data) => data.toLocaleDateString('sv-SE', { timeZone: FUSO })

export function criarContexto({ db, agora = () => new Date(), aleatorio = Math.random }) {
  return {
    db,
    agora,
    aleatorio,
    hoje: () => dataNoFuso(agora()),
  }
}

// Quem aparece como autor nos documentos gravados pela API.
export const CRIADO_POR = 'api-massa'
