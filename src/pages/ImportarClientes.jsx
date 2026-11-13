import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { useData } from '../context/DataContext'
import { buscarCep } from '../lib/api/cep'
import { onlyDigits } from '../lib/format'
import {
  COLUNAS,
  MAX_LINHAS,
  lerLinhas,
  paraCliente,
  planilhaDeRecusadas,
  planilhaModelo,
  prepararImportacao,
} from '../lib/importacao'
import { baixarXlsx, lerPlanilha } from '../lib/planilha'

const ROTULO_STATUS = { ok: 'pronta', duplicado: 'ignorada', erro: 'com erro' }
const FILTROS = [
  { id: 'todos', rotulo: 'Todas' },
  { id: 'ok', rotulo: 'Prontas' },
  { id: 'duplicado', rotulo: 'Ignoradas' },
  { id: 'erro', rotulo: 'Com erro' },
]

export function ImportarClientes() {
  const { clientes } = useData()
  const [etapa, setEtapa] = useState('arquivo') // arquivo | lendo | previa | importando | fim
  const [arquivo, setArquivo] = useState(null)
  const [itens, setItens] = useState([])
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [progresso, setProgresso] = useState(0)

  const contagem = useMemo(() => {
    const c = { todos: itens.length, ok: 0, duplicado: 0, erro: 0, importado: 0 }
    for (const i of itens) c[i.status] += 1
    return c
  }, [itens])
  const visiveis = filtro === 'todos' ? itens : itens.filter((i) => i.status === filtro)
  const recusadas = itens.filter((i) => i.status !== 'ok' && i.status !== 'importado')

  async function escolher(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // deixa escolher o mesmo arquivo de novo
    if (!file) return
    setErro('')
    setArquivo(file.name)
    setEtapa('lendo')
    try {
      const { linhas, faltando } = lerLinhas(await lerPlanilha(file))
      if (faltando.length) {
        throw new Error(`Faltam as colunas: ${faltando.map((c) => c.rotulo).join(', ')}.`)
      }
      if (linhas.length === 0)
        throw new Error('A planilha não tem nenhuma linha de cliente.')
      if (linhas.length > MAX_LINHAS) {
        throw new Error(`São ${linhas.length} linhas; importe até ${MAX_LINHAS} por vez.`)
      }
      const cpfsExistentes = new Set(clientes.items.map((c) => onlyDigits(c.cpf)))
      setItens(await prepararImportacao(linhas, { cpfsExistentes, buscarCep }))
      setFiltro('todos')
      setEtapa('previa')
    } catch (err) {
      console.error(err)
      setErro(err.message || 'Não foi possível ler o arquivo.')
      setEtapa('arquivo')
    }
  }

  async function importar() {
    setEtapa('importando')
    setProgresso(0)
    const atualizados = [...itens]
    for (let i = 0; i < atualizados.length; i++) {
      if (atualizados[i].status !== 'ok') continue
      try {
        await clientes.add(paraCliente(atualizados[i].dados))
        atualizados[i] = { ...atualizados[i], status: 'importado' }
      } catch (err) {
        // CPF gravado por outra pessoa enquanto a prévia estava aberta
        const duplicado = err.code === 'permission-denied'
        atualizados[i] = {
          ...atualizados[i],
          status: duplicado ? 'duplicado' : 'erro',
          motivos: [duplicado ? 'CPF já cadastrado.' : 'Falha ao gravar. Tente de novo.'],
        }
      }
      setProgresso((p) => p + 1)
    }
    setItens(atualizados)
    setFiltro('todos')
    setEtapa('fim')
  }

  const baixarRecusadas = () =>
    baixarXlsx(
      `clientes-recusados-${new Date().toISOString().slice(0, 10)}.xlsx`,
      planilhaDeRecusadas(recusadas),
    )

  const recomecar = () => {
    setItens([])
    setArquivo(null)
    setErro('')
    setEtapa('arquivo')
  }

  return (
    <>
      <header className="page-header page-header-row">
        <div>
          <Link to="/clientes" className="back">
            ← Clientes
          </Link>
          <h1>Importar clientes</h1>
          <p>
            Cadastre vários clientes de uma vez a partir de uma planilha Excel ou CSV.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => baixarXlsx('modelo-importacao-clientes.xlsx', planilhaModelo())}
        >
          Baixar modelo
        </button>
      </header>

      {(etapa === 'arquivo' || etapa === 'lendo') && (
        <section className="card">
          <h2>1. Escolha o arquivo</h2>
          <ul className="dicas">
            <li>
              Colunas obrigatórias:{' '}
              {COLUNAS.filter((c) => c.obrigatoria)
                .map((c) => c.rotulo)
                .join(', ')}
              .
            </li>
            <li>
              Logradouro, bairro, cidade e UF são opcionais: o endereço é completado pelo
              CEP.
            </li>
            <li>CPF já cadastrado é ignorado. Até {MAX_LINHAS} linhas por arquivo.</li>
            <li>Use só dados fictícios.</li>
          </ul>
          <label className={etapa === 'lendo' ? 'arquivo ocupado' : 'arquivo'}>
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={escolher}
              disabled={etapa === 'lendo'}
              aria-describedby={erro ? 'erro-arquivo' : undefined}
            />
            <strong>
              {etapa === 'lendo'
                ? `Lendo ${arquivo}...`
                : 'Escolher planilha (.xlsx ou .csv)'}
            </strong>
            <span className="muted small">ou arraste o arquivo para cá</span>
          </label>
          {erro && (
            <p id="erro-arquivo" className="field-error" role="alert">
              {erro}
            </p>
          )}
        </section>
      )}

      {etapa !== 'arquivo' && etapa !== 'lendo' && (
        <>
          <div className="kpis kpis-4">
            {etapa === 'fim' ? (
              <div className="kpi">
                <span>Importados</span>
                <strong>{contagem.importado}</strong>
              </div>
            ) : (
              <div className="kpi">
                <span>Prontas para importar</span>
                <strong>{contagem.ok}</strong>
              </div>
            )}
            <div className="kpi">
              <span>Ignoradas (CPF já existe)</span>
              <strong>{contagem.duplicado}</strong>
            </div>
            <div className={contagem.erro ? 'kpi kpi-danger' : 'kpi'}>
              <span>Com erro</span>
              <strong>{contagem.erro}</strong>
            </div>
            <div className="kpi">
              <span>Linhas no arquivo</span>
              <strong>{contagem.todos}</strong>
            </div>
          </div>

          <section className="card">
            <div className="card-header">
              <h2>{etapa === 'fim' ? 'Resultado' : `2. Confira · ${arquivo}`}</h2>
            </div>

            {etapa === 'importando' && (
              <p role="status" className="progresso">
                Importando {progresso} de {contagem.ok}...
              </p>
            )}
            {etapa === 'fim' && (
              <p role="status" className="progresso">
                {contagem.importado} cliente(s) importado(s)
                {recusadas.length
                  ? `; ${recusadas.length} linha(s) ficaram de fora.`
                  : '.'}
              </p>
            )}

            <div className="barra-filtros">
              <div className="tabs">
                {FILTROS.filter((f) => etapa !== 'fim' || f.id !== 'ok').map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={filtro === f.id ? 'tab active' : 'tab'}
                    onClick={() => setFiltro(f.id)}
                  >
                    {f.rotulo} ({contagem[f.id]})
                  </button>
                ))}
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="num">Linha</th>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>E-mail</th>
                    <th>Cidade</th>
                    <th>Situação</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((i) => (
                    <tr key={i.linha}>
                      <td className="num">{i.linha}</td>
                      <td>{i.dados.nome || <span className="muted">—</span>}</td>
                      <td>{i.dados.cpf}</td>
                      <td>{i.dados.email}</td>
                      <td>{i.dados.cidade ? `${i.dados.cidade}/${i.dados.uf}` : '—'}</td>
                      <td>
                        <StatusBadge
                          status={
                            i.status === 'importado'
                              ? 'importada'
                              : ROTULO_STATUS[i.status]
                          }
                        />
                      </td>
                      <td className="small">{i.motivos.join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="actions">
              {etapa !== 'fim' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={importar}
                  disabled={etapa === 'importando' || contagem.ok === 0}
                >
                  {etapa === 'importando'
                    ? 'Importando...'
                    : `Importar ${contagem.ok} cliente(s)`}
                </button>
              )}
              {recusadas.length > 0 && etapa !== 'importando' && (
                <button type="button" className="btn btn-ghost" onClick={baixarRecusadas}>
                  Baixar linhas recusadas
                </button>
              )}
              {etapa === 'fim' && (
                <Link to="/clientes" className="btn btn-primary">
                  Ver clientes
                </Link>
              )}
              {etapa !== 'importando' && (
                <button type="button" className="btn btn-ghost" onClick={recomecar}>
                  {etapa === 'fim' ? 'Importar outro arquivo' : 'Escolher outro arquivo'}
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </>
  )
}
