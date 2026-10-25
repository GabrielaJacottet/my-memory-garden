import { useId, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import type { EmotionId, PlantMemoryInput } from '../garden/types'
import { EMOTIONS } from './emotions'
import { useI18n } from '../i18n'

interface PlantMemoryFormProps {
  onPlant: (input: PlantMemoryInput) => void
  onCancel: () => void
}

export function PlantMemoryForm({ onPlant, onCancel }: PlantMemoryFormProps) {
  const formId = useId()
  const { t } = useI18n()
  const IMPORTANCE_LABELS = t.form.levels
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const emotionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [description, setDescription] = useState('')
  const [emotion, setEmotion] = useState<EmotionId>('joy')
  const [importance, setImportance] = useState(3)
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!description.trim()) {
      setError(t.form.errorEmpty)
      descriptionRef.current?.focus()
      return
    }
    if (description.length > 1000) {
      setError(t.form.errorLong)
      descriptionRef.current?.focus()
      return
    }
    onPlant({ description: description.trim(), emotion, importance, isPublic })
  }

  return (
    <form className="plant-memory-form" onSubmit={handleSubmit} noValidate>
      <h2 className="dialog-title">{t.form.title}</h2>
      <div className="memory-form-field">
        <label className="field-label" htmlFor={`${formId}-description`}>{t.form.what}</label>
        <textarea
          ref={descriptionRef}
          id={`${formId}-description`}
          name="description"
          rows={3}
          maxLength={1000}
          value={description}
          onChange={(event) => { setDescription(event.target.value); if (error) setError('') }}
          placeholder={t.form.placeholder}
          required
          aria-invalid={!!error}
          aria-describedby={error ? `${formId}-error` : undefined}
        />
        {error && <p className="form-error" id={`${formId}-error`} role="alert">{error}</p>}
      </div>
      <fieldset className="emotion-fieldset">
        <legend className="field-label" id={`${formId}-emotion-label`}>{t.form.felt}</legend>
        <div className="emotion-grid" role="radiogroup" aria-labelledby={`${formId}-emotion-label`}>
          {EMOTIONS.map((option, index) => (
            <button
              key={option.id}
              ref={(element) => { emotionRefs.current[index] = element }}
              type="button"
              role="radio"
              aria-checked={emotion === option.id}
              tabIndex={emotion === option.id ? 0 : -1}
              className={`emotion-option${emotion === option.id ? ' selected' : ''}`}
              style={{ '--emotion-color': option.color } as CSSProperties}
              onClick={() => setEmotion(option.id)}
              onKeyDown={(event) => {
                if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? EMOTIONS.length - 1 : (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + EMOTIONS.length) % EMOTIONS.length
                setEmotion(EMOTIONS[nextIndex].id)
                emotionRefs.current[nextIndex]?.focus()
              }}
            >
              <span className="emotion-icon" aria-hidden="true">{option.icon}</span>{t.emotions[option.id]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="memory-form-field importance-field">
        <div className="importance-heading"><label className="field-label" htmlFor={`${formId}-importance`}>{t.form.importance}</label><span className="importance-value">{IMPORTANCE_LABELS[importance - 1]}</span></div>
        <input
          id={`${formId}-importance`}
          name="importance"
          className="importance-range"
          type="range"
          min={1}
          max={5}
          step={1}
          value={importance}
          onChange={(event) => setImportance(Number(event.target.value))}
          aria-valuetext={IMPORTANCE_LABELS[importance - 1]}
          style={{ '--range-progress': `${(importance - 1) * 25}%` } as CSSProperties}
        />
      </div>
      <label className="share-toggle">
        <span><strong>{t.form.shareTitle}</strong>{t.form.shareHint}</span>
        <input type="checkbox" role="switch" name="isPublic" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
      </label>
      <div className="dialog-actions">
        <button type="button" className="dialog-button button-outline" onClick={onCancel}>{t.form.cancel}</button>
        <button type="submit" className="dialog-button button-green">{t.form.submit} <span aria-hidden="true">🌼</span></button>
      </div>
    </form>
  )
}
