import { useEffect, useState } from 'react'
import { ClienteForm } from '../../components/ClienteForm'
import { Field } from '../../components/Field'
import { useAuth } from '../../context/AuthContext'
import { maskCpf } from '../../lib/format'
import { ErroVinculo, perfis } from '../../lib/perfis'
import { isValidCpf } from '../../lib/validators'
import { AcessoLayout } from './AcessoLayout'

// Primeiro acesso depois de confirmar o e-mail:
// - e-mail convidado pelo admin → ativa como gestor;
// - CPF já cadastrado pela equipe com esse e-mail → vincula ao cadastro;
// - CPF sem cadastro → o próprio cliente preenche os dados.
export function CompletarCadastro() {
  const { user, setPerfil, sair } = useAuth()
  const [convite, setConvite] = useState(undefined)
  const [etapa, setEtapa] = useState('cpf') // cpf | cadastro
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true
    perfis
      .conviteDeGestor(user)
      .then((c) => ativo && setConvite(c))
      .catch(() => ativo && setConvite(null))
    return () => {
      ativo = false
    }
  }, [user])

  async function executar(acao) {
    setEnviando(true)
    try {
      setPerfil(await acao())
    } catch (err) {
      if (!(err instanceof ErroVinculo)) console.error(err)
      setEnviando(false)
      throw err
    }
  }

  async function ativarGestor(event) {
    event.preventDefault()
    if (!nome.trim()) return setErros({ nome: 'Informe seu nome.' })
    await executar(() => perfis.ativarGestor(user, nome.trim())).catch(() =>
      setErros({ nome: 'Não foi possível ativar o acesso.' }),
    )
  }

  async function vincular(event) {
    event.preventDefault()
    const novos = {}
    if (!nome.trim()) novos.nome = 'Informe seu nome.'
    if (!isValidCpf(cpf)) novos.cpf = 'CPF inválido.'
    if (Object.keys(novos).length) return setErros(novos)

    await executar(() => perfis.vincularCliente(user, cpf, nome.trim())).catch((err) => {
      if (err instanceof ErroVinculo) setEtapa('cadastro')
      else setErros({ cpf: 'Não foi possível continuar. Tente de novo.' })
    })
  }

  async function cadastrar(cliente) {
    try {
      await executar(() => perfis.cadastrarCliente(user, cliente))
    } catch (err) {
      return {
        cpf: err instanceof ErroVinculo ? err.message : 'Erro ao salvar o cadastro.',
      }
    }
  }

  const rodape = (
    <p className="acesso-links">
      <button type="button" className="link-button" onClick={sair}>
        Sair
      </button>
    </p>
  )

  if (convite === undefined) {
    return <AcessoLayout titulo="Carregando...">{rodape}</AcessoLayout>
  }

  if (convite) {
    return (
      <AcessoLayout
        titulo="Acesso de gestor"
        subtitulo={`O administrador liberou ${user.email} como gestor.`}
      >
        <form className="form" onSubmit={ativarGestor} noValidate>
          <Field
            label="Seu nome"
            name="nome"
            value={nome}
            maxLength={120}
            onChange={(e) => setNome(e.target.value)}
            error={erros.nome}
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            Ativar acesso
          </button>
        </form>
        {rodape}
      </AcessoLayout>
    )
  }

  if (etapa === 'cadastro') {
    return (
      <AcessoLayout
        titulo="Seus dados"
        subtitulo="Não achamos cadastro com esse CPF e e-mail. Complete seus dados para criar."
      >
        <ClienteForm
          inicial={{ nome, cpf, email: user.email }}
          travados={['email', 'cpf']}
          onSalvar={cadastrar}
          rotuloEnviar="Concluir cadastro"
          limparDepois={false}
        />
        <p className="acesso-links">
          <button type="button" className="link-button" onClick={() => setEtapa('cpf')}>
            Corrigir o CPF
          </button>
          <button type="button" className="link-button" onClick={sair}>
            Sair
          </button>
        </p>
      </AcessoLayout>
    )
  }

  return (
    <AcessoLayout
      titulo="Complete seu acesso"
      subtitulo="Informe seu CPF. Se você já é cliente, ligamos sua conta ao seu cadastro."
    >
      <form className="form" onSubmit={vincular} noValidate>
        <Field
          label="Nome"
          name="nome"
          value={nome}
          maxLength={120}
          onChange={(e) => setNome(e.target.value)}
          error={erros.nome}
        />
        <Field
          label="CPF"
          name="cpf"
          inputMode="numeric"
          value={cpf}
          onChange={(e) => {
            setCpf(maskCpf(e.target.value))
            setErros((er) => ({ ...er, cpf: undefined }))
          }}
          error={erros.cpf}
          placeholder="000.000.000-00"
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
          {enviando ? 'Verificando...' : 'Continuar'}
        </button>
      </form>
      {rodape}
    </AcessoLayout>
  )
}
