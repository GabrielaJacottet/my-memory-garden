import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword,
  signOut as firebaseSignOut, updateProfile, type User,
} from 'firebase/auth'
import { auth } from './firebase'

interface AuthState {
  user: User | null
  /** True until Firebase has told us whether someone is signed in. */
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: !!auth })
  useEffect(() => auth ? onAuthStateChanged(auth, (user) => setState({ user, loading: false })) : undefined, [])
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

function requireAuth() {
  if (!auth) throw Object.assign(new Error('Firebase is not configured'), { code: 'app/not-configured' })
  return auth
}

export async function signUp(name: string, email: string, password: string): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(requireAuth(), email, password)
  await updateProfile(user, { displayName: name })
  return user
}

export async function signIn(email: string, password: string): Promise<User> {
  return (await signInWithEmailAndPassword(requireAuth(), email, password)).user
}

export function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(requireAuth(), email)
}

export function signOut(): Promise<void> {
  return firebaseSignOut(requireAuth())
}
