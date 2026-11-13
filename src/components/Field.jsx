export function Field({ label, name, error, hint, required, as = 'input', ...props }) {
  const Component = as
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <Component
        id={name}
        name={name}
        className={error ? 'has-error' : undefined}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <p className="field-error">{error}</p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  )
}
