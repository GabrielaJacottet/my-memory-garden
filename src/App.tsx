import { useEffect, useRef, useState } from 'react'
import type { PhaserGarden } from './garden/PhaserGarden'
import type { GardenMemory, GardenView, PlantMemoryInput } from './garden/types'
import { SEASONS } from './garden/seasons'
import { fieldSlot } from './garden/field-art'
import { GardenDialog } from './components/GardenDialog'
import { PlantMemoryForm } from './components/PlantMemoryForm'
import { MemoryDialogContent } from './components/MemoryDialogContent'
import { RenameGardenForm } from './components/RenameGardenForm'
import type { PublicGarden } from './services/public-gardens'
import type { GardenStore } from './services/gardens'
import { signOut } from './services/auth'
import { LanguageSwitcher, useI18n } from './i18n'

const PLOTS = [
  [.775, .865], [.36, .865], [.55, .85], [.18, .86],
  [.66, .855], [.46, .87], [.88, .86], [.27, .845],
  [.60, .875], [.71, .88], [.41, .84], [.12, .87],
]
// The 3/4 meadow is the default; the side view stays one click away in Help.
// `?view=side` or `?view=top` still overrides the saved choice for a single visit.
const VIEW_KEY = 'my-memory-garden:view'
function preferredView(): GardenView {
  const fromUrl = new URLSearchParams(location.search).get('view')
  if (fromUrl === 'side' || fromUrl === 'top') return fromUrl
  try { return localStorage.getItem(VIEW_KEY) === 'side' ? 'side' : 'top' } catch { return 'top' }
}
const FIELD_VIEW = preferredView() === 'top'

/** The canvas is built for one view, so switching saves the choice and reopens the page. */
function switchView() {
  try { localStorage.setItem(VIEW_KEY, FIELD_VIEW ? 'side' : 'top') } catch { /* the URL below still switches this visit */ }
  location.replace(`${location.pathname}?view=${FIELD_VIEW ? 'side' : 'top'}${location.hash}`)
}

/** Lays saved memories out in planting order, so each view gets positions it understands. */
function layOut(memories: GardenMemory[]): GardenMemory[] {
  return memories.map((memory, index) => {
    if (FIELD_VIEW) return { ...memory, position: fieldSlot(index) }
    const [x, y] = PLOTS[index % PLOTS.length]
    return { ...memory, position: { x: index < PLOTS.length ? x : x + ((index * .37) % .06) - .03, y } }
  })
}

interface AppProps {
  title: string
  initialMemories: GardenMemory[]
  /** A garden someone opened to visitors; without it, you tend your own. */
  visiting?: PublicGarden
  /** Where your own garden is saved; absent while visiting. */
  store?: GardenStore
}

export default function App({ title, initialMemories, visiting, store }: AppProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const gardenRef = useRef<PhaserGarden | null>(null)
  const [ready, setReady] = useState(false)
  const [growing, setGrowing] = useState(false)
  const [memories, setMemories] = useState<GardenMemory[]>(() => layOut(initialMemories))
  const nextPlotRef = useRef(memories.length)
  const [panel, setPanel] = useState<'plant' | 'help' | 'rename' | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const selected = memories.find((memory) => memory.id === selectedId) ?? null
  const [seasonIndex, setSeasonIndex] = useState(0)
  const [error, setError] = useState('')
  const [gardenName, setGardenName] = useState(title)
  const [notice, setNotice] = useState('')
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const { t } = useI18n()
  const season = SEASONS[seasonIndex]
  const seasonLabel = t.seasons[season.id]

  useEffect(() => {
    let cancelled = false
    void import('./garden/PhaserGarden').then(({ PhaserGarden }) => {
      if (cancelled || !hostRef.current) return
      gardenRef.current = new PhaserGarden(hostRef.current, {
        onReady: () => setReady(true),
        onSelect: (memory) => setSelectedId(memory.id),
        onGrowthChange: setGrowing,
        onError: setError,
      }, FIELD_VIEW ? 'top' : 'side')
    }).catch(() => setError(t.garden.loadError))
    return () => {
      cancelled = true
      gardenRef.current?.destroy()
      gardenRef.current = null
    }
  }, [])

  // Memories that were planted before this visit are already in bloom.
  useEffect(() => { if (ready) for (const memory of memories) gardenRef.current?.plant(memory, true) }, [ready])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])
  useEffect(() => { gardenRef.current?.setReducedMotion(reducedMotion) }, [ready, reducedMotion])
  useEffect(() => { hostRef.current?.querySelector('canvas')?.setAttribute('aria-label', FIELD_VIEW ? t.garden.canvasTop : t.garden.canvasSide) }, [ready, t])
  useEffect(() => { gardenRef.current?.setSeason(SEASONS[seasonIndex].id) }, [ready, seasonIndex])

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  function plant(input: PlantMemoryInput) {
    const occupied = new Set(memories.map(({ position }) => `${position.x},${position.y}`))
    let x: number, y: number
    if (FIELD_VIEW) {
      let slot = 0
      while (occupied.has(`${fieldSlot(slot).x},${fieldSlot(slot).y}`)) slot += 1
      ;({ x, y } = fieldSlot(slot))
    } else {
      const freePlot = PLOTS.find(([px, py], offset) => offset >= nextPlotRef.current % PLOTS.length && !occupied.has(`${px},${py}`))
        ?? PLOTS.find(([px, py]) => !occupied.has(`${px},${py}`))
      ;[x, y] = freePlot ?? [.12 + Math.random() * .76, .84 + Math.random() * .04]
      nextPlotRef.current += 1
    }
    const memory: GardenMemory = {
      id: crypto.randomUUID(),
      description: input.description.trim(),
      emotion: input.emotion,
      importance: input.importance,
      createdAt: new Date().toISOString(),
      position: { x, y },
      isPublic: input.isPublic,
    }
    gardenRef.current?.plant(memory)
    setMemories((items) => [...items, memory])
    setPanel(null)
    save(store?.plant(memory, [...memories, memory]))
  }

  // The garden answers right away; a failed save is reported instead of undoing the flower.
  function save(pending: Promise<void> | undefined) {
    pending?.catch(() => setNotice(t.garden.saveError))
  }

  function pluck() {
    if (!selected) return
    gardenRef.current?.remove(selected.id)
    const rest = memories.filter((memory) => memory.id !== selected.id)
    setMemories(rest)
    setSelectedId('')
    save(store?.remove(selected.id, rest))
  }

  function rename(name: string) {
    setGardenName(name)
    setPanel(null)
    save(store?.rename(name))
  }

  function toggleShared() {
    if (!selected) return
    const changed = { ...selected, isPublic: !selected.isPublic }
    const next = memories.map((memory) => memory.id === changed.id ? changed : memory)
    setMemories(next)
    save(store?.update(changed, next))
  }

  return (
    <main className="app-shell" aria-label={gardenName}>
      <div className="garden-host" ref={hostRef} data-testid="garden-host" />
      <header className="garden-header">
        <a className="round-button garden-back" href="#/" aria-label={t.garden.back} title={t.garden.back}><span aria-hidden="true">←</span></a>
        <h1 className="garden-brand">{store
          ? <button type="button" className="garden-name-button" title={t.garden.rename} onClick={() => setPanel('rename')}>
            {gardenName} <span aria-hidden="true">✎</span><span className="sr-only">, {t.garden.rename}</span>
          </button>
          : gardenName}</h1>
        <div className="garden-status" aria-live="polite">
          <span className="status-badge">{t.garden.count(memories.length, !!visiting)}</span>
          <span className="status-badge season-badge"><span aria-hidden="true">{season.icon}</span> {seasonLabel}</span>
        </div>
        <div className="garden-header-actions">
          <button className="round-button" aria-label={t.garden.changeSeason} title={t.garden.seasonTitle(seasonLabel, t.seasons[SEASONS[(seasonIndex + 1) % SEASONS.length].id])} disabled={!ready} onClick={() => setSeasonIndex((index) => (index + 1) % SEASONS.length)}><span aria-hidden="true">{season.icon}</span></button>
          <button className="round-button help-button" aria-label={t.garden.help} onClick={() => setPanel('help')}>?</button>
        </div>
      </header>

      {(!ready || error) && <div className="garden-loading" role={error ? 'alert' : 'status'}>{error || t.garden.loading}</div>}

      {visiting
        ? <p className="visit-banner">{t.garden.visitBanner(visiting.owner)} <a href="#/garden">{t.garden.goToMine}</a></p>
        : <button className="plant-memory-button" disabled={!ready || growing || !!error} onClick={() => setPanel('plant')}>
          <span aria-hidden="true">✨</span> {growing ? t.garden.growing : t.garden.plant}
        </button>}
      <p className="toast-msg" role="status">{notice}</p>

      {panel === 'rename' && <GardenDialog onClose={() => setPanel(null)} className="plant-dialog"><RenameGardenForm name={gardenName} onRename={rename} onCancel={() => setPanel(null)} /></GardenDialog>}
      {panel === 'plant' && <GardenDialog onClose={() => setPanel(null)} className="plant-dialog"><PlantMemoryForm onPlant={plant} onCancel={() => setPanel(null)} /></GardenDialog>}
      {selected && <GardenDialog onClose={() => setSelectedId('')} className="memory-dialog">
        <MemoryDialogContent memory={selected} owner={visiting?.owner} onClose={() => setSelectedId('')} onPluck={pluck} onToggleShared={toggleShared} />
      </GardenDialog>}
      {panel === 'help' && <GardenDialog title={t.garden.helpTitle} onClose={() => setPanel(null)} className="help-dialog">
        <div className="help-copy">{(visiting
          ? t.garden.helpVisit(visiting.owner) : t.garden.helpOwn).map((text) => <p key={text}>{text}</p>)}</div>
        <p className="help-season-note">{t.garden.seasonNote}</p>
        {FIELD_VIEW && <p className="help-season-note">{t.garden.fieldNote}</p>}
        <button type="button" className="view-switch" onClick={switchView}>{FIELD_VIEW ? t.garden.viewSide : t.garden.viewTop}</button>
        <label className="motion-toggle help-motion-toggle"><span>{t.garden.reduceMotion}</span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label>
        <div className="help-language"><span>{t.language}</span><LanguageSwitcher /></div>
        <div className="dialog-actions">
          {store && <button className="dialog-button button-outline" onClick={() => void signOut().then(() => { location.hash = '#/' })}>{t.garden.signOut}</button>}
          <button className="button button-primary" onClick={() => setPanel(null)}>{t.garden.backToGarden}</button>
        </div>
      </GardenDialog>}
    </main>
  )
}
