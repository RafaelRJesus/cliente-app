export function ConfirmacaoInline({
  titulo,
  children,
  rotuloConfirmar = 'Sim, excluir',
  rotuloOcupado = 'Excluindo...',
  ocupado = false,
  onConfirmar,
  onCancelar,
}) {
  return (
    <div className="confirmacao" role="alertdialog" aria-label={titulo}>
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
      <div className="actions">
        <button
          type="button"
          className="btn btn-danger-solid btn-sm"
          onClick={onConfirmar}
          disabled={ocupado}
          autoFocus
        >
          {ocupado ? rotuloOcupado : rotuloConfirmar}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
