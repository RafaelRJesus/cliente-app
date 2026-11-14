import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { simular } from '../../lib/credito'
import { formatMoney, today } from '../../lib/format'
import { PRODUTOS } from '../../lib/produtos'

const PRAZOS = [3, 6, 10, 12]
const pix = PRODUTOS.pix
const reais = (n) => formatMoney(n).replace(',00', '')

// A tela do app dentro de um celular, com o Pix parcelado funcionando de
// verdade: mesmo cálculo do simulador (IOF financiado, taxa padrão do produto).
export function Celular() {
  const [valor, setValor] = useState(1200)
  const [prazo, setPrazo] = useState(6)
  const idValor = useId()

  const resultado = useMemo(
    () =>
      simular({
        valor,
        taxaMensal: pix.taxaPadrao / 100,
        prazo,
        sistema: 'PRICE',
        dataContratacao: today(),
        iofFinanciado: true,
      }),
    [valor, prazo],
  )

  return (
    <figure className="celular" aria-label="Tela do app: Pix parcelado">
      <div className="celular-tela">
        <div className="celular-topo" aria-hidden="true">
          <span>9:41</span>
          <span className="celular-ilha" />
          <span>5G</span>
        </div>

        <div className="app-saldo">
          <span>Olá, Marina</span>
          <small>Saldo disponível</small>
          <strong>R$ 2.430,18</strong>
        </div>

        <div className="app-atalhos" aria-hidden="true">
          <span className="ativo">Pix</span>
          <span>Pagar</span>
          <span>Cartão</span>
          <span>Crédito</span>
        </div>

        <section className="app-pix">
          <div className="app-pix-cabeca">
            <strong>Pix parcelado</strong>
            <small>em até 12x</small>
          </div>

          <label htmlFor={idValor} className="app-rotulo">
            Quanto você quer enviar
          </label>
          <output htmlFor={idValor} className="app-valor">
            {reais(valor)}
          </output>
          <input
            id={idValor}
            type="range"
            min={100}
            max={5000}
            step={50}
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            aria-valuetext={reais(valor)}
          />

          <div className="app-prazos" role="radiogroup" aria-label="Em quantas vezes">
            {PRAZOS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={prazo === p}
                onClick={() => setPrazo(p)}
              >
                {p}x
              </button>
            ))}
          </div>

          <p className="app-parcela" aria-live="polite">
            <span>
              {prazo}x de <strong>{formatMoney(resultado.parcelas[0].valor)}</strong>
            </span>
            <small>
              Total {formatMoney(resultado.totalPago)}, com IOF e juros de{' '}
              {String(pix.taxaPadrao).replace('.', ',')}% ao mês
            </small>
          </p>

          <Link to="/criar-conta" className="app-botao">
            Continuar
          </Link>
        </section>
      </div>
    </figure>
  )
}
