import { createClient } from '@insforge/sdk'
import type { Memory } from '../game/types'

/**
 * InsForge backend integration for Wonderful.
 *
 * Provides three things the game needs:
 *   1. Auth        — optional email sign-in so runs are tied to a player
 *   2. Database    — persistent agent_runs + agent_memories tables
 *   3. Storage     — a `characters` bucket holding Meshy-generated .glb models
 *
 * If the InsForge env vars are missing the module degrades gracefully to
 * localStorage so the game is always demoable. Every method reports which
 * backend actually served the request via the `backend` field.
 */

const BASE_URL = import.meta.env.VITE_INSFORGE_URL || ''
const ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY || ''

export const isInsforgeConfigured = Boolean(BASE_URL && ANON_KEY)

export const insforge = isInsforgeConfigured
  ? createClient({ baseUrl: BASE_URL, anonKey: ANON_KEY })
  : null

const CHARACTERS_BUCKET = 'characters'
const LOCAL_MEM_KEY = 'wonderful-memories'
const LOCAL_RUN_KEY = 'wonderful-runs'

export type Backend = 'insforge' | 'local'

export interface AgentRun {
  id?: string
  user_id?: string | null
  agent_name: string
  agent_role: string
  level: number
  xp: number
  turns: number
  final_strategy: string
  score: number
  created_at?: string
}

export interface StoredMemory {
  id?: string
  user_id?: string | null
  agent_id: string
  content: string
  importance: number
  turn: number
  created_at?: string
}

// ---------------------------------------------------------------------------
// Auth (optional — the game runs anonymously too)
// ---------------------------------------------------------------------------

export async function getCurrentUser() {
  if (!insforge) return null
  const { data } = await insforge.auth.getCurrentUser()
  return data?.user ?? null
}

export async function signIn(email: string, password: string) {
  if (!insforge) throw new Error('InsForge not configured')
  const { data, error } = await insforge.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data?.user ?? null
}

export async function signUp(email: string, password: string, name: string) {
  if (!insforge) throw new Error('InsForge not configured')
  const { data, error } = await insforge.auth.signUp({ email, password, name })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  if (!insforge) return
  await insforge.auth.signOut()
}

// ---------------------------------------------------------------------------
// Memories
// ---------------------------------------------------------------------------

export async function saveMemory(memory: Memory): Promise<{ backend: Backend; key: string }> {
  const row: StoredMemory = {
    agent_id: memory.agentId,
    content: memory.content,
    importance: memory.importance,
    turn: memory.turn ?? 0,
  }

  if (insforge) {
    try {
      const { data, error } = await insforge.database
        .from('agent_memories')
        .insert([row])
        .select()
      if (!error && data?.[0]) {
        return { backend: 'insforge', key: data[0].id }
      }
      // fall through to local on error so a turn never hard-fails
      console.warn('InsForge saveMemory failed, using local fallback:', error?.message)
    } catch (e) {
      // Network throw (offline / CORS / DNS) — degrade to local, never reject.
      console.warn('InsForge saveMemory threw, using local fallback:', e instanceof Error ? e.message : e)
    }
  }

  const all = readLocal<Memory>(LOCAL_MEM_KEY)
  all.push(memory)
  writeLocal(LOCAL_MEM_KEY, all)
  return { backend: 'local', key: memory.id }
}

export async function listMemories(agentId: string): Promise<Memory[]> {
  if (insforge) {
    try {
      const { data, error } = await insforge.database
        .from('agent_memories')
        .select()
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (!error && data) {
        return (data as StoredMemory[]).map((m) => ({
          id: m.id!,
          agentId: m.agent_id,
          content: m.content,
          importance: m.importance,
          turn: m.turn,
          timestamp: m.created_at ? Date.parse(m.created_at) : 0,
          storageKey: m.id,
        }))
      }
    } catch (e) {
      console.warn('InsForge listMemories threw, using local fallback:', e instanceof Error ? e.message : e)
    }
  }
  return readLocal<Memory>(LOCAL_MEM_KEY).filter((m) => m.agentId === agentId)
}

// ---------------------------------------------------------------------------
// Runs (leaderboard-style record of a completed game)
// ---------------------------------------------------------------------------

export async function saveRun(run: AgentRun): Promise<{ backend: Backend }> {
  if (insforge) {
    try {
      const { error } = await insforge.database.from('agent_runs').insert([run]).select()
      if (!error) return { backend: 'insforge' }
      console.warn('InsForge saveRun failed, using local fallback:', error.message)
    } catch (e) {
      console.warn('InsForge saveRun threw, using local fallback:', e instanceof Error ? e.message : e)
    }
  }
  const all = readLocal<AgentRun>(LOCAL_RUN_KEY)
  all.push({ ...run, created_at: undefined })
  writeLocal(LOCAL_RUN_KEY, all)
  return { backend: 'local' }
}

export async function topRuns(limit = 10): Promise<AgentRun[]> {
  if (insforge) {
    try {
      const { data, error } = await insforge.database
        .from('agent_runs')
        .select()
        .order('score', { ascending: false })
        .limit(limit)
      if (!error && data) return data as AgentRun[]
    } catch (e) {
      console.warn('InsForge topRuns threw, using local fallback:', e instanceof Error ? e.message : e)
    }
  }
  return readLocal<AgentRun>(LOCAL_RUN_KEY)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ---------------------------------------------------------------------------
// Storage — Meshy .glb models
// ---------------------------------------------------------------------------

/**
 * Pull a generated model from Meshy and persist it in InsForge Storage so it
 * survives past the temporary Meshy URL. Returns the public URL + key.
 */
export async function storeCharacterModel(
  role: string,
  modelUrl: string,
): Promise<{ url: string; key: string; backend: Backend }> {
  if (!insforge) {
    // No backend — just hand back the ephemeral Meshy URL.
    return { url: modelUrl, key: modelUrl, backend: 'local' }
  }

  // Re-hosting is best-effort. Meshy serves models from a signed CDN URL that
  // usually lacks CORS headers, so a browser fetch() of it can throw "Failed to
  // fetch". That must NOT discard a successful generation — fall back to the
  // ephemeral Meshy URL so the character still attaches.
  let file: File
  let size: number
  try {
    const res = await fetch(modelUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    size = blob.size
    file = new File([blob], `${role}.glb`, { type: 'model/gltf-binary' })
  } catch (e) {
    console.warn(
      'Could not fetch Meshy asset for re-hosting (likely CORS on the CDN); using ephemeral Meshy URL:',
      e instanceof Error ? e.message : e,
    )
    return { url: modelUrl, key: modelUrl, backend: 'local' }
  }

  try {
    const { data, error } = await insforge.storage
      .from(CHARACTERS_BUCKET)
      .upload(`models/${role}-${size}.glb`, file)

    if (error || !data) {
      console.warn('InsForge storage upload failed:', error?.message)
      return { url: modelUrl, key: modelUrl, backend: 'local' }
    }
    return { url: data.url, key: data.key, backend: 'insforge' }
  } catch (e) {
    console.warn('InsForge storage upload threw, using ephemeral Meshy URL:', e instanceof Error ? e.message : e)
    return { url: modelUrl, key: modelUrl, backend: 'local' }
  }
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function readLocal<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[]
  } catch {
    return []
  }
}

function writeLocal<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value))
}
