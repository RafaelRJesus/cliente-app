// Erro de negócio com o status HTTP que a API devolve.
export class ErroApi extends Error {
  constructor(status, codigo, mensagem, detalhes) {
    super(mensagem)
    this.status = status
    this.codigo = codigo
    this.detalhes = detalhes
  }
}

export const pedidoInvalido = (mensagem, detalhes) =>
  new ErroApi(400, 'PedidoInvalido', mensagem, detalhes)

export const naoEncontrado = (mensagem) => new ErroApi(404, 'NaoEncontrado', mensagem)

export const conflito = (mensagem, detalhes) =>
  new ErroApi(409, 'Conflito', mensagem, detalhes)
