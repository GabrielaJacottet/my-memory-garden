import { useEffect, useState } from 'react'
import App from '../App'
import type { GardenMemory } from '../garden/types'
import { useAuth } from '../services/auth'
import { gardenStore, loadMyGarden, loadPublicGarden, type GardenStore } from '../services/gardens'
import type { PublicGarden } from '../services/public-gardens'
import { useI18n } from '../i18n'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; title: string; memories: GardenMemory[]; visiting?: PublicGarden; store?: GardenStore }

/** Loads a garden (yours, or one you are visiting) before the canvas opens. */
export function GardenPage({ gardenId }: { gardenId?: string }) {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const settle = (next: State) => { if (!cancelled) setState(next) }
    if (gardenId) {
      void loadPublicGarden(gardenId).then((garden) => settle(garden
        ? { status: 'ready', title: garden.name, memories: garden.memories, visiting: garden }
        : { status: 'error', message: t.garden.notFound }))
    } else if (!loading && !user) {
      location.replace('#/login')
    } else if (user) {
      loadMyGarden(user, t.auth.defaultGardenName(user.displayName ?? ''))
        .then(({ name, memories }) => settle({ status: 'ready', title: name, memories, store: gardenStore(user.uid, user.displayName ?? '') }))
        .catch(() => settle({ status: 'error', message: t.garden.loadMineError }))
    }
    return () => { cancelled = true }
    // The dictionary only names the garden on creation; switching language must not reload it.
  }, [gardenId, user, loading])

  if (state.status === 'ready') return <App title={state.title} initialMemories={state.memories} visiting={state.visiting} store={state.store} />
  return (
    <main className="app-shell">
      <div className="garden-loading" role={state.status === 'error' ? 'alert' : 'status'}>
        <p>{state.status === 'error' ? state.message : t.garden.loading}</p>
        {state.status === 'error' && <a className="view-switch" href="#/">{t.auth.backHome}</a>}
      </div>
    </main>
  )
}
