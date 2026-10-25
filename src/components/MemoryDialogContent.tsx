import type { GardenMemory } from '../garden/types'
import { EMOTIONS } from './emotions'
import { useI18n } from '../i18n'

interface MemoryDialogContentProps {
  memory: GardenMemory
  /** Set when visiting someone else's garden: the memory is read-only. */
  owner?: string
  onClose: () => void
  onPluck: () => void
  onToggleShared: () => void
}

export function MemoryDialogContent({ memory, owner, onClose, onPluck, onToggleShared }: MemoryDialogContentProps) {
  const { t, locale } = useI18n()
  const emotion = EMOTIONS.find((option) => option.id === memory.emotion) ?? EMOTIONS[0]
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(memory.createdAt))

  return (
    <article className="memory-dialog-content">
      <h2 className="sr-only">{owner ? t.memory.from(owner) : t.memory.yours}</h2>
      <div className="memory-dialog-meta">
        <span className="memory-emotion-pill" style={{ backgroundColor: emotion.color }}>{t.emotions[emotion.id]}</span>
        <time dateTime={new Date(memory.createdAt).toISOString()}>{date}</time>
      </div>
      <p className="memory-dialog-description">{memory.description}</p>
      {owner
        ? <p className="memory-visibility">{t.memory.sharedBy(owner)}</p>
        : <label className="share-toggle memory-share-toggle">
          <span><strong>{memory.isPublic ? t.memory.sharedTitle : t.memory.privateTitle}</strong>{memory.isPublic ? t.memory.sharedHint : t.memory.privateHint}</span>
          <input type="checkbox" role="switch" checked={memory.isPublic} onChange={onToggleShared} />
        </label>}
      <div className="dialog-actions memory-dialog-actions">
        {!owner && <button type="button" className="dialog-button button-pluck" onClick={onPluck}>{t.memory.pluck} <span aria-hidden="true">🍃</span></button>}
        <button type="button" className="dialog-button button-green" onClick={onClose}>{t.memory.close}</button>
      </div>
    </article>
  )
}
