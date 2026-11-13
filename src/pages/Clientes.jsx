import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmacaoInline } from '../components/ConfirmacaoInline'
import { ClienteForm } from '../components/ClienteForm'
import { Toast } from '../components/Toast'
import { useData } from '../context/DataContext'
import { buscarClientes } from '../lib/buscaCliente'
import { formatDateTime, onlyDigits } from '../lib/format'
import { formatarNumeroCliente } from '../lib/numeroCliente'

const enderecoResumido = ({ endereco: e }) =>
  e?.cidade ? `${e.logradouro}, ${e.numero} · ${e.cidade}/${e.uf}` : null

export function Clientes() {
  const { clientes, contratos } = useData()
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState(null)
  const [confirmandoId, setConfirmandoId] = useState(null)
  const [removendo, setRemovendo] = useState(false)
  const contratosPorCliente = useMemo(() => {
    const count = {}
    for (const c of contratos.items) count[c.clienteId] = (count[c.clienteId] ?? 0) + 1
    return count
  }, [contratos.items])

  const filtrados = useMemo(
    () => buscarClientes(clientes.items, search),
    [clientes.items, search],
  )

  // Cadastros de antes do número do cliente: numera do mais antigo para o mais novo.
  const semNumero = clientes.items.filter((c) => !c.numero)
  const [numerando, setNumerando] = useState(false)

  async function numerarAntigos() {
    setNumerando(true)
    try {
      const ordem = [...semNumero].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
      for (const c of ordem) await clientes.numerar(c.id)
      setMessage({ text: `${ordem.length} cliente(s) numerado(s).` })
    } catch (err) {
      console.error(err)
      setMessage({
        text: 'Não foi possível numerar todos. Tente de novo.',
        type: 'error',
      })
    } finally {
      setNumerando(false)
    }
  }

  // Devolve erros por campo para o formulário, ou nada quando gravou.
  async function salvar(cliente) {
    try {
      await clientes.add(cliente)
      setMessage({ text: 'Cliente cadastrado.' })
    } catch (err) {
      console.error(err)
      if (err.code === 'permission-denied') return { cpf: 'CPF já cadastrado.' }
      setMessage({ text: 'Erro ao salvar o cliente.', type: 'error' })
      return {} // mantém o que foi digitado
    }
  }

  async function handleRemove(cliente) {
    setRemovendo(true)
    try {
      await clientes.remove(cliente.id)
      setMessage({ text: `${cliente.nome} removido.` })
      setConfirmandoId(null)
    } catch (err) {
      console.error(err)
      setMessage({ text: 'Erro ao remover o cliente.', type: 'error' })
    } finally {
      setRemovendo(false)
    }
  }

  // Sem a lista de contratos carregada não dá para saber se o cliente pode sair.
  const contratosIndisponiveis = contratos.loading || Boolean(contratos.error)

  function motivoBloqueio(qtdContratos) {
    if (contratos.loading) return 'Aguarde: carregando contratos'
    if (contratos.error) return 'Não foi possível verificar os contratos'
    if (qtdContratos > 0) return 'Cliente possui contratos'
    return undefined
  }

  return (
    <>
      <header className="page-header page-header-row">
        <div>
          <h1>Clientes</h1>
          <p>Cadastro de clientes para usar nas simulações e contratos.</p>
        </div>
        <Link to="/clientes/importar" className="btn btn-ghost">
          Importar planilha
        </Link>
      </header>

      <Toast message={message} onClose={() => setMessage(null)} />

      {!clientes.loading && semNumero.length > 0 && (
        <div className="aviso">
          <span>
            {semNumero.length} cliente(s) cadastrado(s) antes do número do cliente ainda
            sem número.
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={numerarAntigos}
            disabled={numerando}
          >
            {numerando ? 'Numerando...' : 'Numerar agora'}
          </button>
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <h2>Novo cliente</h2>
          <ClienteForm
            validar={(form) =>
              clientes.items.some((c) => onlyDigits(c.cpf) === onlyDigits(form.cpf))
                ? { cpf: 'CPF já cadastrado.' }
                : {}
            }
            onSalvar={salvar}
          />
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Carteira de clientes</h2>
            <span className="pill">{clientes.items.length}</span>
          </div>

          <input
            className="search"
            type="search"
            placeholder="Buscar por nome, CPF ou nº do cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {clientes.loading && <p className="empty">Carregando...</p>}
          {clientes.error && <p className="empty">{clientes.error}</p>}
          {!clientes.loading && !clientes.error && filtrados.length === 0 && (
            <p className="empty">Nenhum cliente encontrado.</p>
          )}

          <ul className="list">
            {filtrados.map((cliente) => {
              const qtdContratos = contratosPorCliente[cliente.id] ?? 0
              return (
                <li key={cliente.id} className="list-item">
                  <div>
                    <Link to={`/clientes/${cliente.id}`} className="nome-link">
                      <strong>{cliente.nome}</strong>
                    </Link>
                    <span className="muted">
                      Nº {formatarNumeroCliente(cliente.numero)} · CPF {cliente.cpf}
                    </span>
                    <span className="muted">
                      {cliente.email} · {cliente.telefone}
                    </span>
                    {enderecoResumido(cliente) && (
                      <span className="muted">{enderecoResumido(cliente)}</span>
                    )}
                    <span className="muted small">
                      Desde {formatDateTime(cliente.criadoEm)} · {qtdContratos}{' '}
                      contrato(s)
                    </span>
                  </div>
                  {confirmandoId === cliente.id ? (
                    <ConfirmacaoInline
                      titulo={`Remover ${cliente.nome}?`}
                      ocupado={removendo}
                      rotuloConfirmar="Sim, remover"
                      onConfirmar={() => handleRemove(cliente)}
                      onCancelar={() => setConfirmandoId(null)}
                    >
                      Essa ação não pode ser desfeita.
                    </ConfirmacaoInline>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={contratosIndisponiveis || qtdContratos > 0}
                      title={motivoBloqueio(qtdContratos)}
                      onClick={() => setConfirmandoId(cliente.id)}
                    >
                      Remover
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </>
  )
}
