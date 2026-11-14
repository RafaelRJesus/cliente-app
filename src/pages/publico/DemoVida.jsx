import { useState } from 'react'
import { BarraVida } from '../../components/BarraVida'
import { CONQUISTAS, conquistaNova, conquistasDe } from '../../lib/conquistas'

const TOTAL = 24

// Demonstração da barra de vida: cada clique paga uma parcela de mentira.
export function DemoVida() {
  const [pagas, setPagas] = useState(3)
  const [nova, setNova] = useState(null)
  const liberadas = new Set(conquistasDe(pagas, TOTAL).map((c) => c.id))
  const zerou = pagas === TOTAL

  function pagar() {
    setNova(conquistaNova(pagas, pagas + 1, TOTAL))
    setPagas((p) => p + 1)
  }

  function recomecar() {
    setNova(null)
    setPagas(0)
  }

  return (
    <div className="lp-demo">
      <div className="lp-demo-placar">
        <p>
          <strong>{pagas}</strong> de {TOTAL} parcelas pagas
        </p>
        <div className="lp-demo-botoes">
          {zerou ? (
            <button type="button" className="lp-botao" onClick={recomecar}>
              Recomeçar
            </button>
          ) : (
            <button type="button" className="lp-botao" onClick={pagar}>
              Pagar uma parcela
            </button>
          )}
        </div>
      </div>

      <BarraVida
        pagas={pagas}
        total={TOTAL}
        rotulo="Exemplo de contrato em 24 parcelas"
        className="lp-vida"
      />

      <p role="status" className="lp-demo-aviso">
        {nova ? `Conquista desbloqueada: ${nova.nome}.` : ''}
      </p>

      <ul className="lp-conquistas" aria-label="Conquistas do exemplo">
        {CONQUISTAS.map((c) => (
          <li key={c.id} className={liberadas.has(c.id) ? 'liberada' : undefined}>
            <strong>{c.nome}</strong>
            <span>{liberadas.has(c.id) ? c.descricao : 'Ainda bloqueada'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
