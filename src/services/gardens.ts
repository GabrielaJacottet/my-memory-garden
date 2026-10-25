import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import type { EmotionId, GardenMemory } from '../garden/types'
import { db } from './firebase'
import { EXAMPLE_GARDENS, type PublicGarden } from './public-gardens'

// Firestore layout (see firestore.rules):
//   gardens/{uid}                 { name, owner, publicCount, emotions, search }  readable while publicCount > 0
//   gardens/{uid}/memories/{id}   { description, emotion, importance, createdAt, isPublic }
//                                 readable by visitors only when isPublic is true

/** What the gate shows for a garden, without loading any memory text. */
export interface GardenSummary {
  id: string
  name: string
  owner: string
  example?: boolean
  publicCount: number
  /** Feelings among the public memories, to paint the card's flowers. */
  emotions: EmotionId[]
}

export interface GardenStore {
  rename(name: string): Promise<void>
  plant(memory: GardenMemory, all: GardenMemory[]): Promise<void>
  update(memory: GardenMemory, all: GardenMemory[]): Promise<void>
  remove(id: string, all: GardenMemory[]): Promise<void>
}

type StoredMemory = Pick<GardenMemory, 'description' | 'emotion' | 'importance' | 'createdAt' | 'isPublic'>

// Memories planted in this browser before accounts existed; they move into the account on first sign-in.
const LOCAL_KEY = 'my-memory-garden:memories'

function requireDb() {
  if (!db) throw Object.assign(new Error('Firebase is not configured'), { code: 'app/not-configured' })
  return db
}

const gardenRef = (uid: string) => doc(requireDb(), 'gardens', uid)
const memoriesRef = (uid: string) => collection(requireDb(), 'gardens', uid, 'memories')

const toStored = ({ description, emotion, importance, createdAt, isPublic }: GardenMemory): StoredMemory =>
  ({ description, emotion, importance, createdAt, isPublic })
const toMemory = (id: string, data: StoredMemory): GardenMemory => ({ id, ...data, position: { x: 0, y: 0 } })
const byDate = (a: GardenMemory, b: GardenMemory) => a.createdAt.localeCompare(b.createdAt)

/** Counts only public memories, so a garden never reveals how much it keeps private. */
function publicSummary(memories: GardenMemory[]) {
  const shared = memories.filter((memory) => memory.isPublic)
  return { publicCount: shared.length, emotions: [...new Set(shared.map((memory) => memory.emotion))] }
}

const MAX_PREFIX = 15

/** Lowercase words without accents, so "Jardim da Lúcia" is found by "lucia". */
function words(text: string): string[] {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

/** Every word prefix of the garden and gardener names: Firestore has no text search, so it matches these exactly. */
function searchTerms(name: string, owner: string): string[] {
  const terms = new Set<string>()
  for (const word of words(`${name} ${owner}`)) {
    for (let size = 1; size <= Math.min(word.length, MAX_PREFIX); size += 1) terms.add(word.slice(0, size))
  }
  return [...terms].slice(0, 300)
}

/** Each typed word must start some word of the garden's or the gardener's name. */
function matches(garden: Pick<GardenSummary, 'name' | 'owner'>, typed: string[]): boolean {
  const own = words(`${garden.name} ${garden.owner}`)
  return typed.every((word) => own.some((candidate) => candidate.startsWith(word)))
}

const toSummary = (id: string, data: Record<string, unknown>): GardenSummary => ({
  id, name: data.name as string, owner: data.owner as string,
  publicCount: data.publicCount as number, emotions: data.emotions as EmotionId[],
})

function summarize(garden: PublicGarden): GardenSummary {
  return { id: garden.id, name: garden.name, owner: garden.owner, example: garden.example, ...publicSummary(garden.memories) }
}

export const EXAMPLE_SUMMARIES = EXAMPLE_GARDENS.map(summarize)

export async function listGardens(): Promise<GardenSummary[]> {
  if (!db) return EXAMPLE_SUMMARIES
  const snapshot = await getDocs(query(collection(db, 'gardens'), where('publicCount', '>', 0), orderBy('publicCount', 'desc'), limit(24)))
  const real = snapshot.docs.map((garden) => toSummary(garden.id, garden.data()))
  return [...real, ...EXAMPLE_SUMMARIES]
}

/** Searches open gardens by garden name or gardener name; an empty search lists them all. */
export async function searchGardens(text: string): Promise<GardenSummary[]> {
  const typed = words(text)
  if (!typed.length) return listGardens()
  const examples = EXAMPLE_SUMMARIES.filter((garden) => matches(garden, typed))
  if (!db) return examples
  // Firestore matches one term; the longest narrows the most, and the rest are checked here.
  const term = typed.reduce((longest, word) => word.length > longest.length ? word : longest).slice(0, MAX_PREFIX)
  const snapshot = await getDocs(query(collection(db, 'gardens'),
    where('search', 'array-contains', term), where('publicCount', '>', 0), orderBy('publicCount', 'desc'), limit(24)))
  const real = snapshot.docs.map((garden) => toSummary(garden.id, garden.data())).filter((garden) => matches(garden, typed))
  return [...real, ...examples]
}

/** A garden as a visitor sees it: private memories are refused by the rules, not just filtered here. */
export async function loadPublicGarden(id: string): Promise<PublicGarden | null> {
  const example = EXAMPLE_GARDENS.find((garden) => garden.id === id)
  if (example) return example
  if (!db) return null
  try {
    const profile = await getDoc(gardenRef(id))
    if (!profile.exists()) return null
    const snapshot = await getDocs(query(memoriesRef(id), where('isPublic', '==', true)))
    const memories = snapshot.docs.map((memory) => toMemory(memory.id, memory.data() as StoredMemory)).sort(byDate)
    if (!memories.length) return null
    return { id, name: profile.get('name'), owner: profile.get('owner'), blurb: '', memories }
  } catch {
    // Permission denied means the garden has nothing public; treat it as not found.
    return null
  }
}

function takeLocalMemories(): GardenMemory[] {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as GardenMemory[]
    return Array.isArray(stored) ? stored.map((memory) => ({ ...memory, isPublic: memory.isPublic ?? false })) : []
  } catch {
    return []
  }
}

export async function loadMyGarden(user: User, defaultName: string): Promise<{ name: string; memories: GardenMemory[] }> {
  const profile = await getDoc(gardenRef(user.uid))
  const name = profile.exists() ? profile.get('name') as string : defaultName
  const owner = user.displayName ?? ''
  if (!profile.exists()) await setDoc(gardenRef(user.uid), { name, owner, publicCount: 0, emotions: [], search: searchTerms(name, owner) })
  // Gardens created before search existed get their terms the next time their gardener visits.
  else if (!profile.get('search')) await updateDoc(gardenRef(user.uid), { search: searchTerms(name, profile.get('owner') ?? owner) })
  const snapshot = await getDocs(memoriesRef(user.uid))
  const memories = snapshot.docs.map((memory) => toMemory(memory.id, memory.data() as StoredMemory))

  const local = takeLocalMemories().filter((memory) => !memories.some(({ id }) => id === memory.id))
  if (local.length) {
    const batch = writeBatch(requireDb())
    for (const memory of local) batch.set(doc(memoriesRef(user.uid), memory.id), toStored(memory))
    memories.push(...local)
    batch.update(gardenRef(user.uid), publicSummary(memories))
    await batch.commit()
    try { localStorage.removeItem(LOCAL_KEY) } catch { /* nothing left to clean up */ }
  }
  return { name, memories: memories.sort(byDate) }
}

/** Every write also refreshes the garden's public summary in the same batch. */
export function gardenStore(uid: string, owner: string): GardenStore {
  const commit = (all: GardenMemory[], change: (batch: ReturnType<typeof writeBatch>) => void) => {
    const batch = writeBatch(requireDb())
    change(batch)
    batch.update(gardenRef(uid), publicSummary(all))
    return batch.commit()
  }
  return {
    rename: (name) => updateDoc(gardenRef(uid), { name, search: searchTerms(name, owner) }),
    plant: (memory, all) => commit(all, (batch) => batch.set(doc(memoriesRef(uid), memory.id), toStored(memory))),
    update: (memory, all) => commit(all, (batch) => batch.set(doc(memoriesRef(uid), memory.id), toStored(memory))),
    remove: (id, all) => commit(all, (batch) => batch.delete(doc(memoriesRef(uid), id))),
  }
}
