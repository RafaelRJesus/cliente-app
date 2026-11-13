import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmacaoInline } from '../components/ConfirmacaoInline'
import { StatusBadge } from '../components/StatusBadge'
import { Toast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { formatDateTime, maskCpf } from '../lib/format'
import { PAPEIS, perfis } from '../lib/perfis'

const FILTROS = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'admin', rotulo: 'Administradores' },
  { id: 'gestor', rotulo: 'Gestores' },
  { id: 'cliente', rotulo: 'Clientes' },
  { id: 'bloqueado', rotulo: 'Bloqueados' },
]

// Backoffice do admin: quem tem acesso ao banco e com qual papel.
// Lista os perfis (usuarios/*). Conta que criou login mas não concluiu o
// primeiro acesso ainda não tem perfil e não aparece aqui.
export function Usuarios() {
  const { perfil: eu } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [versao, setVersao] = useState(0)
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [confirmando, setConfirmando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let ativo = true
    perfis
      .listarUsuarios()
      .then((lista) => {
        if (ativo)
          setUsuarios(
            lista.sort((a, b) => (b.criadoEm ?? '').localeCompare(a.criadoEm ?? '')),
          )
      })
      .catch((err) => {
        console.error(err)
        if (ativo)
          setMessage({ text: 'Não foi possível carregar os usuários.', type: 'error' })
      })
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [versao])

  const contagem = useMemo(() => {
    const c = { todos: usuarios.length, admin: 0, gestor: 0, cliente: 0, bloqueado: 0 }
    for (const u of usuarios) {
      c[u.papel] = (c[u.papel] ?? 0) + 1
      if (u.bloqueado) c.bloqueado += 1
    }
    return c
  }, [usuarios])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return usuarios.filter((u) => {
      if (filtro === 'bloqueado' && !u.bloqueado) return false
      if (filtro !== 'todos' && filtro !== 'bloqueado' && u.papel !== filtro) return false
      if (!termo) return true
      const digitos = termo.replace(/\D/g, '')
      return (
        u.nome?.toLowerCase().includes(termo) ||
        u.email?.includes(termo) ||
        Boolean(digitos && u.clienteId?.includes(digitos))
      )
    })
  }, [usuarios, filtro, busca])

  async function alternarBloqueio(u) {
    setSalvando(true)
    try {
      await perfis.definirBloqueio(u.uid, !u.bloqueado)
      setMessage({
        text: u.bloqueado ? `${u.nome} desbloqueado.` : `${u.nome} bloqueado.`,
      })
      setConfirmando(null)
      setVersao((v) => v + 1)
    } catch (err) {
      console.error(err)
      setMessage({ text: 'Não foi possível alterar o acesso.', type: 'error' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <header className="page-header page-header-row">
        <div>
          <h1>Usuários</h1>
          <p>Quem acessa o banco, com qual papel, e quem está bloqueado.</p>
        </div>
        <Link to="/gestores" className="btn btn-ghost">
          Cadastrar gestor
        </Link>
      </header>

      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="kpis kpis-4">
        <div className="kpi">
          <span>Usuários</span>
          <strong>{contagem.todos}</strong>
        </div>
        <div className="kpi">
          <span>Gestores</span>
          <strong>{contagem.gestor}</strong>
        </div>
        <div className="kpi">
          <span>Clientes com acesso</span>
          <strong>{contagem.cliente}</strong>
        </div>
        <div className={contagem.bloqueado ? 'kpi kpi-danger' : 'kpi'}>
          <span>Bloqueados</span>
          <strong>{contagem.bloqueado}</strong>
        </div>
      </div>

      <section className="card">
        <div className="tabs">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={filtro === f.id ? 'tab active' : 'tab'}
              onClick={() => setFiltro(f.id)}
            >
              {f.rotulo} ({contagem[f.id] ?? 0})
            </button>
          ))}
        </div>

        <input
          className="search"
          type="search"
          placeholder="Buscar por nome, e-mail ou CPF"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {carregando && <p className="empty">Carregando...</p>}
        {!carregando && visiveis.length === 0 && (
          <p className="empty">Nenhum usuário encontrado.</p>
        )}

        {visiveis.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Papel</th>
                  <th>Cadastro vinculado</th>
                  <th>Desde</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visiveis.map((u) => (
                  <tr key={u.uid} data-uid={u.uid}>
                    <td>
                      <strong>{u.nome}</strong>
                      {u.uid === eu.uid && <span className="muted small"> (você)</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>{PAPEIS[u.papel] ?? u.papel}</td>
                    <td>
                      {u.clienteId ? (
                        <Link to={`/clientes/${u.clienteId}`}>
                          CPF {maskCpf(u.clienteId)}
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{u.criadoEm ? formatDateTime(u.criadoEm) : '—'}</td>
                    <td>
                      <StatusBadge status={u.bloqueado ? 'bloqueado' : 'ativo'} />
                    </td>
                    <td className="num">
                      {u.papel !== 'admin' &&
                        (confirmando === u.uid ? (
                          <ConfirmacaoInline
                            titulo={
                              u.bloqueado
                                ? `Desbloquear ${u.nome}?`
                                : `Bloquear ${u.nome}?`
                            }
                            rotuloConfirmar={
                              u.bloqueado ? 'Sim, desbloquear' : 'Sim, bloquear'
                            }
                            ocupado={salvando}
                            rotuloOcupado="Salvando..."
                            onConfirmar={() => alternarBloqueio(u)}
                            onCancelar={() => setConfirmando(null)}
                          >
                            {u.bloqueado
                              ? 'O acesso volta no próximo login.'
                              : 'A pessoa perde o acesso na hora.'}
                          </ConfirmacaoInline>
                        ) : (
                          <button
                            type="button"
                            className={
                              u.bloqueado
                                ? 'btn btn-ghost btn-sm'
                                : 'btn btn-danger btn-sm'
                            }
                            onClick={() => setConfirmando(u.uid)}
                          >
                            {u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
