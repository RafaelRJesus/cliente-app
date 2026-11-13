import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { TabelaContratos } from '../components/TabelaContratos'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { situacaoDoCliente, totaisDosContratos } from '../lib/carteira'
import { saldoDevedor, situacaoContrato } from '../lib/credito'
import { formatDateTime, formatMoney, today } from '../lib/format'
import { perfis } from '../lib/perfis'

const enderecoCompleto = (e) =>
  e?.logradouro
    ? [
        `${e.logradouro}, ${e.numero}${e.complemento ? ` - ${e.complemento}` : ''}`,
        e.bairro,
        e.cidade && `${e.cidade}/${e.uf}`,
        e.cep && `CEP ${e.cep}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

// Ficha do cliente para a equipe: cadastro, acesso ao app e todos os contratos.
export function ClienteDetalhe() {
  const { id } = useParams()
  const { clientes, contratos } = useData()
  const hoje = today()
  const cliente = clientes.items.find((c) => c.id === id)

  const lista = useMemo(
    () =>
      contratos.items
        .filter((c) => c.clienteId === id)
        .map((c) => ({
          ...c,
          situacao: situacaoContrato(c, hoje),
          saldo: saldoDevedor(c),
        })),
    [contratos.items, id, hoje],
  )
  const totais = useMemo(() => totaisDosContratos(lista, hoje), [lista, hoje])

  if (clientes.loading || contratos.loading) return <p className="empty">Carregando...</p>
  if (!cliente && lista.length === 0) {
    return (
      <p className="empty">
        Cliente não encontrado. <Link to="/clientes">Voltar</Link>
      </p>
    )
  }

  const nome = cliente?.nome ?? lista[0].clienteNome
  const e = cliente?.endereco

  return (
    <>
      <header className="page-header page-header-row">
        <div>
          <Link to="/contratos?visao=cliente" className="back">
            ← Carteira por cliente
          </Link>
          <h1>{nome}</h1>
          <p>
            {cliente ? `CPF ${cliente.cpf}` : 'Sem cadastro (contrato antigo)'} ·{' '}
            <StatusBadge status={situacaoDoCliente(lista, hoje)} />
          </p>
        </div>
        {cliente && (
          <Link to={`/simulador?cliente=${cliente.id}`} className="btn btn-primary">
            Nova simulação
          </Link>
        )}
      </header>

      <div className="kpis kpis-4">
        <div className="kpi">
          <span>Contratos ativos</span>
          <strong>
            {totais.ativos} de {totais.contratos}
          </strong>
        </div>
        <div className="kpi">
          <span>Valor contratado</span>
          <strong>{formatMoney(totais.valorContratado)}</strong>
        </div>
        <div className="kpi">
          <span>Saldo devedor</span>
          <strong>{formatMoney(totais.saldo)}</strong>
        </div>
        <div className={totais.parcelasVencidas ? 'kpi kpi-danger' : 'kpi'}>
          <span>Parcelas vencidas</span>
          <strong>
            {totais.parcelasVencidas} · {formatMoney(totais.valorVencido)}
          </strong>
        </div>
      </div>

      {cliente && (
        <section className="card">
          <h2>Cadastro</h2>
          <dl className="ficha">
            <div>
              <dt>E-mail</dt>
              <dd>{cliente.email}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{cliente.telefone}</dd>
            </div>
            <div>
              <dt>Endereço</dt>
              <dd>{enderecoCompleto(e) || '—'}</dd>
            </div>
            <div>
              <dt>Cliente desde</dt>
              <dd>{cliente.criadoEm ? formatDateTime(cliente.criadoEm) : '—'}</dd>
            </div>
            <AcessoAoApp clienteId={cliente.id} />
          </dl>
        </section>
      )}

      <section className="card">
        <h2>Contratos</h2>
        {lista.length === 0 ? (
          <p className="empty">Nenhum contrato ainda.</p>
        ) : (
          <TabelaContratos linhas={lista} mostrarCliente={false} />
        )}
      </section>
    </>
  )
}

// Só o admin enxerga os perfis de acesso (regra do Firestore).
function AcessoAoApp({ clienteId }) {
  const { admin } = useAuth()
  const [acesso, setAcesso] = useState(undefined)

  useEffect(() => {
    if (!admin) return undefined
    let ativo = true
    perfis
      .listarUsuarios()
      .then(
        (usuarios) =>
          ativo && setAcesso(usuarios.find((u) => u.clienteId === clienteId) ?? null),
      )
      .catch(() => ativo && setAcesso(null))
    return () => {
      ativo = false
    }
  }, [admin, clienteId])

  if (!admin) return null
  return (
    <div>
      <dt>Acesso ao app</dt>
      <dd>
        {acesso === undefined && 'Verificando...'}
        {acesso === null && 'Ainda não criou acesso'}
        {acesso && (
          <>
            {acesso.email} ·{' '}
            <StatusBadge status={acesso.bloqueado ? 'bloqueado' : 'ativo'} />{' '}
            <Link to="/usuarios">gerenciar</Link>
          </>
        )}
      </dd>
    </div>
  )
}
