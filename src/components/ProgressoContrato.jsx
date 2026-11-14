import { CONQUISTAS, conquistasDe } from '../lib/conquistas'
import { BarraVida } from './BarraVida'

// Painel escuro do detalhe do contrato: barra de vida e conquistas.
export function ProgressoContrato({ pagas, total, nova, onFecharNova }) {
  const liberadas = new Set(conquistasDe(pagas, total).map((c) => c.id))
  const pct = total > 0 ? Math.round((pagas / total) * 100) : 0

  return (
    <section className="progresso-contrato" aria-labelledby="titulo-progresso">
      <div className="progresso-cabeca">
        <h2 id="titulo-progresso">Progresso do contrato</h2>
        <p>
          <strong>{pct}%</strong> {pagas} de {total} parcelas pagas
        </p>
      </div>
      <BarraVida pagas={pagas} total={total} rotulo="Parcelas pagas" />

      <ul className="conquistas" aria-label="Conquistas">
        {CONQUISTAS.map((c) => {
          const ok = liberadas.has(c.id)
          return (
            <li key={c.id} className={ok ? 'conquista liberada' : 'conquista'}>
              <strong>{c.nome}</strong>
              <span>{ok ? c.descricao : 'Bloqueada'}</span>
            </li>
          )
        })}
      </ul>

      <div role="status" className="conquista-nova-area">
        {nova && (
          <p className="conquista-nova">
            <span>
              Conquista desbloqueada: <strong>{nova.nome}</strong>
            </span>
            <button type="button" className="link-button" onClick={onFecharNova}>
              Fechar
            </button>
          </p>
        )}
      </div>
    </section>
  )
}
