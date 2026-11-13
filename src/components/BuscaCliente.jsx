import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buscarClientes } from '../lib/buscaCliente'
import { formatarNumeroCliente } from '../lib/numeroCliente'

const MAX_SUGESTOES = 8

// Campo de cliente do simulador: digita nome, CPF ou nº e escolhe na lista.
// Combobox acessível: setas sobem/descem, Enter escolhe, Esc fecha.
export function BuscaCliente({ clientes, valor, onChange, erro }) {
  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const lista = useId()

  const escolhido = clientes.find((c) => c.id === valor)
  const sugestoes = useMemo(
    () => buscarClientes(clientes, termo, MAX_SUGESTOES),
    [clientes, termo],
  )

  function escolher(cliente) {
    onChange(cliente.id)
    setTermo('')
    setAberto(false)
  }

  function teclado(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setAberto(true)
      setAtivo((i) => Math.min(i + 1, sugestoes.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setAtivo((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && aberto && sugestoes[ativo]) {
      event.preventDefault()
      escolher(sugestoes[ativo])
    } else if (event.key === 'Escape') {
      setAberto(false)
    }
  }

  if (escolhido) {
    return (
      <div className="field">
        <span className="rotulo">Cliente</span>
        <div className="cliente-escolhido" data-testid="cliente-escolhido">
          <div>
            <strong>{escolhido.nome}</strong>
            <span className="muted small">
              Nº {formatarNumeroCliente(escolhido.numero)} · CPF {escolhido.cpf}
            </span>
          </div>
          <button type="button" className="link-button" onClick={() => onChange('')}>
            Trocar
          </button>
        </div>
        {!escolhido.numero && (
          <p className="field-error">
            Cliente sem número. <Link to="/clientes">Numere em Clientes</Link> antes de
            contratar.
          </p>
        )}
        {erro && <p className="field-error">{erro}</p>}
      </div>
    )
  }

  return (
    <div className="field busca-cliente">
      <label htmlFor="clienteId">Cliente</label>
      <input
        id="clienteId"
        type="search"
        role="combobox"
        autoComplete="off"
        aria-expanded={aberto}
        aria-controls={lista}
        aria-autocomplete="list"
        aria-activedescendant={
          aberto && sugestoes[ativo] ? `${lista}-${ativo}` : undefined
        }
        aria-invalid={Boolean(erro)}
        className={erro ? 'has-error' : undefined}
        placeholder="Nome completo, CPF ou nº do cliente"
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value)
          setAtivo(0)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={teclado}
      />
      {aberto && (
        <ul
          id={lista}
          role="listbox"
          className="sugestoes"
          aria-label="Clientes encontrados"
        >
          {sugestoes.map((c, i) => (
            <li
              key={c.id}
              id={`${lista}-${i}`}
              role="option"
              aria-selected={i === ativo}
              className={i === ativo ? 'ativa' : undefined}
              onMouseDown={(e) => {
                e.preventDefault()
                escolher(c)
              }}
              onMouseEnter={() => setAtivo(i)}
            >
              <strong>{c.nome}</strong>
              <span className="muted small">
                Nº {formatarNumeroCliente(c.numero)} · CPF {c.cpf}
              </span>
            </li>
          ))}
          {sugestoes.length === 0 && (
            <li className="vazio" role="presentation">
              {clientes.length === 0 ? (
                <>
                  Nenhum cliente ainda. <Link to="/clientes">Cadastre um</Link>.
                </>
              ) : (
                'Nenhum cliente encontrado.'
              )}
            </li>
          )}
        </ul>
      )}
      {erro && <p className="field-error">{erro}</p>}
    </div>
  )
}
