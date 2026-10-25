import { useEffect, useId, useRef, type ReactNode } from 'react'

interface GardenDialogProps {
  title?: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function GardenDialog({ title, onClose, children, className = '' }: GardenDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose)
  const titleId = useId()
  closeRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    const heading = dialog.querySelector('h2')
    if (heading) {
      if (!heading.id) heading.id = titleId
      dialog.setAttribute('aria-labelledby', heading.id)
      dialog.removeAttribute('aria-label')
    }
    document.body.style.overflow = 'hidden'
    dialog.showModal()

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [titleId])

  return (
    <dialog
      ref={dialogRef}
      className={`garden-dialog ${className}`.trim()}
      aria-modal="true"
      aria-label={title ? undefined : 'Memory garden'}
      aria-labelledby={title ? titleId : undefined}
      onCancel={(event) => { event.preventDefault(); closeRef.current() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeRef.current()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter((element) => element.getClientRects().length > 0)
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!first) { event.preventDefault(); return }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }}
    >
      {title && <h2 id={titleId} className="dialog-title">{title}</h2>}
      {children}
    </dialog>
  )
}
