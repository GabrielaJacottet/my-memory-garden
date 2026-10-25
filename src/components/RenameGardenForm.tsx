import { useId, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'

interface RenameGardenFormProps {
  name: string
  onRename: (name: string) => void
  onCancel: () => void
}

export function RenameGardenForm({ name, onRename, onCancel }: RenameGardenFormProps) {
  const formId = useId()
  const { t } = useI18n()
  const [value, setValue] = useState(name)
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!value.trim()) { setError(t.garden.renameEmpty); return }
    onRename(value.trim())
  }

  return (
    <form className="plant-memory-form" onSubmit={handleSubmit} noValidate>
      <h2 className="dialog-title">{t.garden.renameTitle}</h2>
      <div className="memory-form-field">
        <label className="field-label" htmlFor={`${formId}-name`}>{t.garden.renameLabel}</label>
        <input id={`${formId}-name`} className="text-field" name="name" maxLength={60} autoComplete="off" required autoFocus
          value={value} onChange={(event) => { setValue(event.target.value); if (error) setError('') }}
          aria-invalid={!!error} aria-describedby={`${formId}-hint`} />
        <p className="field-hint" id={`${formId}-hint`}>{error ? <span className="form-error" role="alert">{error}</span> : t.garden.renameHint}</p>
      </div>
      <div className="dialog-actions">
        <button type="button" className="dialog-button button-outline" onClick={onCancel}>{t.form.cancel}</button>
        <button type="submit" className="dialog-button button-green">{t.garden.save}</button>
      </div>
    </form>
  )
}
