import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { resetPassword, signIn, signUp, useAuth } from '../services/auth'
import { firebaseConfigured } from '../services/firebase'
import { LanguageSwitcher, useI18n, type Messages } from '../i18n'
import './home.css'

type Mode = 'signin' | 'signup' | 'reset'

function errorMessage(error: unknown, t: Messages['auth']): string {
  switch ((error as { code?: string }).code) {
    case 'auth/invalid-credential': case 'auth/wrong-password': case 'auth/user-not-found': return t.errors.invalidCredential
    case 'auth/email-already-in-use': return t.errors.emailInUse
    case 'auth/weak-password': return t.errors.weakPassword
    case 'auth/invalid-email': return t.errors.invalidEmail
    case 'auth/too-many-requests': return t.errors.tooMany
    case 'auth/network-request-failed': return t.errors.network
    case 'app/not-configured': return t.notConfigured
    default: return t.errors.generic
  }
}

/** Sign in, create an account, or ask for a password reset link. */
export function AuthPage() {
  const formId = useId()
  const { t: { auth: t, home }, locale } = useI18n()
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  // Someone already signed in has nothing to do here. During sign-up we navigate ourselves,
  // once the name is saved, so the garden is created with it.
  useEffect(() => { if (user && !busyRef.current) location.replace('#/garden') }, [user])

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'signup' && !name.trim()) { setError(t.errors.missingName); return }
    setError('')
    setNotice('')
    setBusy(true)
    busyRef.current = true
    try {
      if (mode === 'reset') {
        await resetPassword(email.trim())
        setNotice(t.resetSent)
      } else {
        if (mode === 'signup') await signUp(name.trim(), email.trim(), password)
        else await signIn(email.trim(), password)
        location.hash = '#/garden'
      }
    } catch (caught) {
      setError(errorMessage(caught, t))
    } finally {
      setBusy(false)
      busyRef.current = false
    }
  }

  const title = mode === 'signup' ? t.signUpTitle : mode === 'reset' ? t.resetTitle : t.signInTitle
  const submit = mode === 'signup' ? t.signUpSubmit : mode === 'reset' ? t.resetSubmit : t.signInSubmit

  return (
    <div className="home auth-page" lang={locale}>
      <div className="wrap">
        <nav>
          <a className="brand" href="#/" aria-label={home.homeLabel}>
            <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#1f2b22" /><path d="M16 25V14" stroke="#7fa36b" strokeWidth="2" strokeLinecap="round" /><path d="M16 18c-4 0-6-2.5-6-6 3.5 0 6 2 6 6Z" fill="#7fa36b" /><path d="M16 15c0-3.5 2.5-6 6.5-6 0 4-2.5 6-6.5 6Z" fill="#e8c46a" /></svg>
            My Memory Garden
          </a>
          <LanguageSwitcher />
        </nav>

        <main className="auth-card">
          <span className="eyebrow">My Memory Garden</span>
          <h1>{title}</h1>
          <p className="auth-intro">{mode === 'reset' ? t.resetIntro : t.intro}</p>

          {mode !== 'reset' && (
            <div className="auth-tabs" role="group">
              <button type="button" aria-pressed={mode === 'signin'} onClick={() => switchMode('signin')}>{t.signInTab}</button>
              <button type="button" aria-pressed={mode === 'signup'} onClick={() => switchMode('signup')}>{t.signUpTab}</button>
            </div>
          )}

          {!firebaseConfigured && <p className="auth-message auth-error" role="alert">{t.notConfigured}</p>}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label htmlFor={`${formId}-name`}>{t.name}
                <input id={`${formId}-name`} name="name" autoComplete="name" maxLength={60} required value={name} onChange={(event) => setName(event.target.value)} />
              </label>
            )}
            <label htmlFor={`${formId}-email`}>{t.email}
              <input id={`${formId}-email`} name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            {mode !== 'reset' && (
              <label htmlFor={`${formId}-password`}>{t.password}
                <input id={`${formId}-password`} name="password" type="password" minLength={6} required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  aria-describedby={mode === 'signup' ? `${formId}-hint` : undefined}
                  value={password} onChange={(event) => setPassword(event.target.value)} />
                {mode === 'signup' && <small id={`${formId}-hint`}>{t.passwordHint}</small>}
              </label>
            )}
            {error && <p className="auth-message auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-message auth-notice" role="status">{notice}</p>}
            <button type="submit" className="btn btn-dark" disabled={busy || !firebaseConfigured}>{busy ? t.working : submit}</button>
          </form>

          <div className="auth-links">
            {mode === 'signin' && <button type="button" onClick={() => switchMode('reset')}>{t.forgot}</button>}
            {mode === 'reset' && <button type="button" onClick={() => switchMode('signin')}>{t.backToSignIn}</button>}
            <a href="#/">← {t.backHome}</a>
          </div>
        </main>
      </div>
    </div>
  )
}
