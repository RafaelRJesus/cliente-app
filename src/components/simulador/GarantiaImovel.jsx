import { formatMoney } from '../../lib/format'
import { PRODUTOS, valorMaximo } from '../../lib/produtos'
import { Field } from '../Field'

const TIPOS = ['Casa', 'Apartamento', 'Sala comercial', 'Terreno']

export function GarantiaImovel({ garantia, onChange, erro }) {
  const set = (campo) => (e) => onChange((g) => ({ ...g, [campo]: e.target.value }))
  const valorImovel = Number(garantia.valorImovel) || 0

  return (
    <fieldset className="fieldset">
      <legend>Imóvel em garantia</legend>
      <div className="form-row">
        <Field
          label="Tipo"
          name="tipoImovel"
          as="select"
          value={garantia.tipoImovel ?? TIPOS[0]}
          onChange={set('tipoImovel')}
        >
          {TIPOS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Field>
        <Field
          label="Valor do imóvel (R$)"
          name="valorImovel"
          type="number"
          min="0"
          step="1000"
          required
          value={garantia.valorImovel ?? ''}
          onChange={set('valorImovel')}
          error={erro}
        />
      </div>
      {valorImovel > 0 && (
        <p className="field-hint">
          Crédito até {Math.round(PRODUTOS.imovel.ltv * 100)}% do imóvel:{' '}
          {formatMoney(valorMaximo('imovel', { valorImovel }))}
        </p>
      )}
    </fieldset>
  )
}
