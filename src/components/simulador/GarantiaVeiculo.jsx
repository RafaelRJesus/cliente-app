import { useFipe } from '../../hooks/useFipe'
import { TIPOS_VEICULO } from '../../lib/api/fipe'
import { formatMoney, maskPlaca } from '../../lib/format'
import { PRODUTOS, valorMaximo } from '../../lib/produtos'
import { isValidPlaca, tipoPlaca } from '../../lib/validators'
import { Field } from '../Field'

export function GarantiaVeiculo({ garantia, onChange, erro }) {
  const fipe = useFipe((preco) =>
    onChange((g) => (preco ? { ...g, ...preco } : { placa: g.placa })),
  )
  const { selecao, opcoes } = fipe
  const placaPreenchida = garantia.placa?.replace('-', '').length === 7
  const placaInvalida = placaPreenchida && !isValidPlaca(garantia.placa)

  return (
    <fieldset className="fieldset">
      <legend>Veículo em garantia</legend>

      <Field
        label="Placa"
        name="placa"
        required
        value={garantia.placa ?? ''}
        onChange={(e) => onChange((g) => ({ ...g, placa: maskPlaca(e.target.value) }))}
        placeholder="ABC-1D23"
        error={placaInvalida ? 'Placa inválida.' : undefined}
        hint={
          placaPreenchida && !placaInvalida
            ? `Placa ${tipoPlaca(garantia.placa)} válida`
            : undefined
        }
      />

      <div className="form-row">
        <Field
          label="Tipo"
          name="tipoVeiculo"
          as="select"
          value={selecao.tipo}
          onChange={(e) => fipe.alterar('tipo', e.target.value)}
        >
          {Object.entries(TIPOS_VEICULO).map(([valor, nome]) => (
            <option key={valor} value={valor}>
              {nome}
            </option>
          ))}
        </Field>
        <Field
          label="Marca"
          name="marca"
          as="select"
          value={selecao.marca}
          onChange={(e) => fipe.alterar('marca', e.target.value)}
        >
          <option value="">Selecione...</option>
          {opcoes.marcas.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.nome}
            </option>
          ))}
        </Field>
      </div>

      <div className="form-row">
        <Field
          label="Modelo"
          name="modelo"
          as="select"
          value={selecao.modelo}
          disabled={!opcoes.modelos.length}
          onChange={(e) => fipe.alterar('modelo', e.target.value)}
        >
          <option value="">Selecione...</option>
          {opcoes.modelos.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.nome}
            </option>
          ))}
        </Field>
        <Field
          label="Ano"
          name="anoModelo"
          as="select"
          value={selecao.ano}
          disabled={!opcoes.anos.length}
          onChange={(e) => fipe.alterar('ano', e.target.value)}
        >
          <option value="">Selecione...</option>
          {opcoes.anos.map((a) => (
            <option key={a.codigo} value={a.codigo}>
              {a.nome}
            </option>
          ))}
        </Field>
      </div>

      {fipe.carregando && <p className="field-hint">Consultando tabela FIPE...</p>}
      {fipe.erro && <p className="field-error">{fipe.erro}</p>}

      {garantia.valorFipe && (
        <div className="garantia-box">
          <span>
            FIPE {garantia.codigoFipe} · {garantia.mesReferencia}
          </span>
          <strong>{formatMoney(garantia.valorFipe)}</strong>
          <span>
            Crédito até {Math.round(PRODUTOS.veiculo.ltv * 100)}% do valor:{' '}
            {formatMoney(valorMaximo('veiculo', garantia))}
          </span>
        </div>
      )}
      {erro && <p className="field-error">{erro}</p>}
    </fieldset>
  )
}
