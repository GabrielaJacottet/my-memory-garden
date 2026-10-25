import { initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

// Web config is public by design; what protects the data is firestore.rules.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** False until `.env.local` has the project keys; the example gardens still work without it. */
export const firebaseConfigured = !!(config.apiKey && config.projectId && config.appId)

const app = firebaseConfigured ? initializeApp(config) : null
export const auth: Auth | null = app && getAuth(app)
export const db: Firestore | null = app && getFirestore(app)
