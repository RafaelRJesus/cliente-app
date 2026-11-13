import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { AcessoLayout } from './AcessoLayout'

export function ConfirmarEmail() {
  const { user, confirmarEmail, reenviarConfirmacao, sair } = useAuth()
  const [aviso, setAviso] = useState('')

  async function jaConfirmei() {
    const ok = await confirmarEmail()
    if (!ok)
      setAviso(
        'Ainda não aparece como confirmado. Abra o link do e-mail e tente de novo.',
      )
  }

  async function reenviar() {
    try {
      await reenviarConfirmacao()
      setAviso('E-mail reenviado. Olhe também a caixa de spam.')
    } catch (err) {
      setAviso(err.message)
    }
  }

  return (
    <AcessoLayout
      titulo="Confirme seu e-mail"
      subtitulo={`Enviamos um link para ${user.email}. Abra o link e volte aqui.`}
    >
      <div className="form">
        <button type="button" className="btn btn-primary btn-block" onClick={jaConfirmei}>
          Já confirmei
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={reenviar}>
          Reenviar e-mail
        </button>
        {aviso && <p role="status">{aviso}</p>}
      </div>
      <p className="acesso-links">
        <button type="button" className="link-button" onClick={sair}>
          Sair
        </button>
      </p>
    </AcessoLayout>
  )
}
