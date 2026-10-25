import { useEffect, useState } from 'react'
import { LanguageProvider } from './i18n'
import { AuthProvider } from './services/auth'
import { Home } from './components/Home'
import { AuthPage } from './components/AuthPage'
import { GardenPage } from './components/GardenPage'

type Route = { page: 'home' } | { page: 'login' } | { page: 'mine' } | { page: 'visit'; gardenId: string }

// Hash routes keep refreshes working on any static host: #/ · #/login · #/garden · #/garden/<id>
function readRoute(): Route {
  const path = location.hash.replace(/^#/, '')
  if (path === '/login') return { page: 'login' }
  if (path === '/garden') return { page: 'mine' }
  const visit = path.match(/^\/garden\/([\w-]+)$/)
  if (visit) return { page: 'visit', gardenId: visit[1] }
  return { page: 'home' }
}

export default function Root() {
  return <LanguageProvider><AuthProvider><Router /></AuthProvider></LanguageProvider>
}

function Router() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const update = () => setRoute(readRoute())
    addEventListener('hashchange', update)
    return () => removeEventListener('hashchange', update)
  }, [])

  if (route.page === 'home') return <Home />
  if (route.page === 'login') return <AuthPage />
  // A fresh key per garden tears down the old canvas instead of mixing two gardens.
  if (route.page === 'visit') return <GardenPage key={route.gardenId} gardenId={route.gardenId} />
  return <GardenPage key="mine" />
}
