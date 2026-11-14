import { Link } from 'react-router-dom'
import { simular } from '../../lib/credito'
import { formatMoney, today } from '../../lib/format'
import { PRODUTOS } from '../../lib/produtos'
import { Logo } from '../../components/Logo'
import { Celular } from './Celular'
import { DemoVida } from './DemoVida'
import './inicio.css'

const reais = (n) => formatMoney(n).replace(',00', '')
const taxa = (n) => `${String(n).replace('.', ',')}% a.m.`

// Exemplo do bloco escuro, com o cálculo real do simulador.
const imovel = PRODUTOS.imovel
const exemploImovel = (() => {
  const valorImovel = 500_000
  const credito = valorImovel * imovel.ltv
  const r = simular({
    valor: credito,
    taxaMensal: imovel.taxaPadrao / 100,
    prazo: imovel.prazoMax,
    sistema: 'PRICE',
    dataContratacao: today(),
  })
  return { valorImovel, credito, parcela: r.parcelas[0].valor }
})()

const PASSOS = [
  ['Crie sua conta', 'Com e-mail e senha ou com a sua conta Google.'],
  [
    'Informe seu CPF',
    'Se a nossa equipe já te cadastrou, sua conta se liga aos seus contratos.',
  ],
  [
    'Simule e acompanhe',
    'Veja parcelas, IOF e custo total. Pague e acompanhe tudo pelo app.',
  ],
]

export function Inicio() {
  return (
    <div className="lp">
      <header className="lp-topo lp-largura">
        <Link to="/" className="lp-marca" aria-label="Respawn, início">
          <Logo className="lp-logo" />
          Respawn
        </Link>
        <nav className="lp-nav" aria-label="Seções">
          <a href="#produtos">Produtos</a>
          <a href="#como-funciona">Como funciona</a>
        </nav>
        <div className="lp-acoes">
          <Link to="/entrar" className="lp-link">
            Entrar
          </Link>
          <Link to="/criar-conta" className="lp-botao">
            Abrir conta
          </Link>
        </div>
      </header>

      <main>
        <section className="lp-heroi lp-largura">
          <div className="lp-heroi-texto">
            <h1>Crédito pra recomeçar, com o mapa aberto.</h1>
            <p className="lp-apoio">
              Simule empréstimo pessoal, consignado, com garantia e Pix parcelado com as
              taxas médias do Banco Central. Antes de assinar, você vê cada parcela, o IOF
              e o custo total. Nada escondido na névoa.
            </p>
            <div className="lp-ctas">
              <Link to="/criar-conta" className="lp-botao lp-botao-grande">
                Abrir conta
              </Link>
              <Link to="/entrar" className="lp-botao-secundario">
                Já tenho conta
              </Link>
            </div>
            <p className="lp-aviso">
              Ambiente de simulação: nenhuma moeda de verdade entra nesse jogo.
            </p>
          </div>
          <Celular />
        </section>

        <section
          className="lp-secao lp-largura lp-vida-secao"
          aria-labelledby="titulo-vida"
        >
          <div className="lp-vida-texto">
            <h2 id="titulo-vida">Cada parcela paga enche a barra.</h2>
            <p className="lp-apoio">
              No app, todo contrato tem uma barra de progresso e três conquistas pelo
              caminho. Você sabe quanto falta sem abrir planilha.
            </p>
          </div>
          <DemoVida />
        </section>

        <section id="produtos" className="lp-secao lp-largura">
          <h2>Cinco formas de crédito, com as regras à vista</h2>
          <p className="lp-apoio">
            Limites e prazos de cada produto. A taxa sugerida no simulador é a mediana do
            mercado na semana.
          </p>
          <table className="lp-produtos">
            <caption className="sr-only">Produtos de crédito</caption>
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col">Valor</th>
                <th scope="col">Prazo</th>
                <th scope="col">Taxa de referência</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(PRODUTOS).map(([id, p]) => (
                <tr key={id}>
                  <th scope="row">
                    <strong>{p.nome}</strong>
                    <span>{p.descricao}</span>
                  </th>
                  <td>
                    {reais(p.valorMin)} a {reais(p.valorMax)}
                  </td>
                  <td>até {p.prazoMax} meses</td>
                  <td>{taxa(p.taxaPadrao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="lp-escuro" aria-labelledby="titulo-imovel">
          <div className="lp-largura lp-escuro-grade">
            <div>
              <h2 id="titulo-imovel">Seu imóvel quitado vale crédito de longo prazo.</h2>
              <p className="lp-apoio">
                Com o imóvel como garantia, você pega até {imovel.ltv * 100}% do valor
                dele e paga em até {imovel.prazoMax} meses, com a taxa de referência do
                financiamento imobiliário publicada pelo Banco Central.
              </p>
              <Link to="/criar-conta" className="lp-botao lp-botao-claro">
                Simular com meu imóvel
              </Link>
            </div>
            <div className="lp-exemplo">
              <dl aria-label="Exemplo de crédito com garantia de imóvel">
                <div>
                  <dt>Imóvel avaliado em</dt>
                  <dd>{reais(exemploImovel.valorImovel)}</dd>
                </div>
                <div className="lp-exemplo-destaque">
                  <dt>Crédito de até</dt>
                  <dd>{reais(exemploImovel.credito)}</dd>
                </div>
                <div>
                  <dt>Em {imovel.prazoMax} parcelas de, aproximadamente,</dt>
                  <dd>{formatMoney(exemploImovel.parcela)}</dd>
                </div>
              </dl>
              <p>Exemplo com {taxa(imovel.taxaPadrao)}, tabela Price, sem IOF.</p>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="lp-secao lp-largura">
          <h2>Como funciona</h2>
          <ol className="lp-passos">
            {PASSOS.map(([titulo, texto]) => (
              <li key={titulo}>
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </li>
            ))}
          </ol>
          <Link to="/criar-conta" className="lp-botao lp-botao-grande">
            Abrir conta
          </Link>
        </section>
      </main>

      <footer className="lp-rodape lp-largura">
        <p>
          Respawn é um projeto de estudo: não é uma instituição financeira e não oferece
          crédito real. Use apenas dados fictícios.
        </p>
        <Link to="/entrar">Entrar</Link>
      </footer>
    </div>
  )
}
