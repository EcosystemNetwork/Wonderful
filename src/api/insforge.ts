import { createClient } from '@insforge/sdk'
import type { Agent, Memory } from '../game/types'
import type { ChatMessage } from './claude'
import { toFetchableModelUrl } from './meshy'

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
const LOCAL_AGENT_KEY = 'wonderful-agents'
const LOCAL_CHAT_KEY = 'wonderful-chat'

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
// Summoned agents (the player's party, persisted across sessions)
// ---------------------------------------------------------------------------

export interface StoredAgent {
  id?: string
  user_id?: string | null
  agent_id: string
  name: string
  role: string
  level: number
  xp: number
  strategy?: string | null
  model_url?: string | null
  /** Full Agent object, so a restored party is lossless (stats/skills/memories). */
  snapshot?: Agent | null
  created_at?: string
}

/** Reconstruct a full Agent from a stored row, preferring the JSONB snapshot. */
function rowToAgent(row: StoredAgent): Agent {
  const base = (row.snapshot ?? {}) as Partial<Agent>
  return {
    id: base.id ?? row.agent_id,
    name: base.name ?? row.name,
    role: (base.role ?? row.role) as Agent['role'],
    level: base.level ?? row.level ?? 1,
    xp: base.xp ?? row.xp ?? 0,
    stats: base.stats ?? { strength: 4, intelligence: 4, agility: 4, wisdom: 4 },
    skills: base.skills ?? ['basic_attack'],
    memories: base.memories ?? [],
    personality: base.personality ?? 'curious, strategic',
    strategy: base.strategy ?? row.strategy ?? 'Explore and learn from surroundings',
    improvementLog: base.improvementLog ?? [],
    modelUrl: row.model_url ?? base.modelUrl,
    clearance: base.clearance ?? 0,
    knowledge: base.knowledge ?? 0,
  }
}

/**
 * Persist (or update) a summoned agent. Upserts on `agent_id` so re-saving the
 * same character — e.g. once its Meshy model attaches — updates the one row
 * instead of piling up duplicates. Stores the full agent as a JSONB snapshot.
 */
export async function saveAgent(
  agent: Agent,
  modelUrl?: string,
): Promise<{ backend: Backend }> {
  const row: StoredAgent = {
    agent_id: agent.id,
    name: agent.name,
    role: agent.role,
    level: agent.level,
    xp: agent.xp,
    strategy: agent.strategy,
    model_url: modelUrl ?? agent.modelUrl ?? null,
    snapshot: { ...agent, modelUrl: modelUrl ?? agent.modelUrl },
  }

  if (insforge) {
    try {
      const { error } = await insforge.database
        .from('summoned_agents')
        .upsert([row], { onConflict: 'agent_id' })
        .select()
      if (!error) return { backend: 'insforge' }
      console.warn('InsForge saveAgent failed, using local fallback:', error.message)
    } catch (e) {
      console.warn('InsForge saveAgent threw, using local fallback:', e instanceof Error ? e.message : e)
    }
  }
  const all = readLocal<StoredAgent>(LOCAL_AGENT_KEY).filter((a) => a.agent_id !== row.agent_id)
  all.push(row)
  writeLocal(LOCAL_AGENT_KEY, all)
  return { backend: 'local' }
}

/**
 * Load the persisted party as ready-to-use Agent objects (newest first),
 * deduped by agent_id. Used to restore the party on app load.
 */
export async function loadParty(limit = 50): Promise<Agent[]> {
  let rows: StoredAgent[] = []
  if (insforge) {
    try {
      const { data, error } = await insforge.database
        .from('summoned_agents')
        .select()
        .order('created_at', { ascending: false })
        .limit(limit)
      if (!error && data) rows = data as StoredAgent[]
    } catch (e) {
      console.warn('InsForge loadParty threw, using local fallback:', e instanceof Error ? e.message : e)
    }
  }
  if (rows.length === 0) {
    rows = readLocal<StoredAgent>(LOCAL_AGENT_KEY).slice().reverse()
  }
  const seen = new Set<string>()
  const party: Agent[] = []
  for (const row of rows) {
    if (seen.has(row.agent_id)) continue
    seen.add(row.agent_id)
    party.push(rowToAgent(row))
  }
  return party
}

// ---------------------------------------------------------------------------
// Chat transcript (in-game Claude chat, persisted across sessions)
// ---------------------------------------------------------------------------

interface StoredChat {
  id?: string
  user_id?: string | null
  role: string
  content: string
  created_at?: string
}

export async function saveChatMessage(message: ChatMessage): Promise<{ backend: Backend }> {
  const row: StoredChat = { role: message.role, content: message.content }

  if (insforge) {
    try {
      const { error } = await insforge.database.from('chat_messages').insert([row]).select()
      if (!error) return { backend: 'insforge' }
      console.warn('InsForge saveChatMessage failed, using local fallback:', error.message)
    } catch (e) {
      console.warn('InsForge saveChatMessage threw, using local fallback:', e instanceof Error ? e.message : e)
    }
  }
  const all = readLocal<StoredChat>(LOCAL_CHAT_KEY)
  all.push(row)
  writeLocal(LOCAL_CHAT_KEY, all)
  return { backend: 'local' }
}

export async function listChat(limit = 100): Promise<ChatMessage[]> {
  if (insforge) {
    try {
      const { data, error } = await insforge.database
        .from('chat_messages')
        .select()
        .order('created_at', { ascending: true })
        .limit(limit)
      if (!error && data) {
        return (data as StoredChat[]).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }))
      }
    } catch (e) {
      console.warn('InsForge listChat threw, using local fallback:', e instanceof Error ? e.message : e)
    }
  }
  return readLocal<StoredChat>(LOCAL_CHAT_KEY).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))
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
  // Meshy's CDN lacks CORS headers, so a direct browser fetch of the raw URL
  // throws "Failed to fetch" and useGLTF can't render it either. Route through
  // the dev proxy so both the re-hosting fetch and any fallback render work.
  const fetchable = toFetchableModelUrl(modelUrl)

  if (!insforge) {
    // No backend — hand back the (proxied) Meshy URL so it still renders.
    return { url: fetchable, key: modelUrl, backend: 'local' }
  }

  // Re-hosting is best-effort: a failed fetch/upload must NOT discard a
  // successful generation — fall back to the proxied Meshy URL so the character
  // still attaches and renders.
  let file: File
  let size: number
  try {
    const res = await fetch(fetchable)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    size = blob.size
    file = new File([blob], `${role}.glb`, { type: 'model/gltf-binary' })
  } catch (e) {
    console.warn(
      'Could not fetch Meshy asset for re-hosting; using proxied Meshy URL:',
      e instanceof Error ? e.message : e,
    )
    return { url: fetchable, key: modelUrl, backend: 'local' }
  }

  try {
    const { data, error } = await insforge.storage
      .from(CHARACTERS_BUCKET)
      .upload(`models/${role}-${size}.glb`, file)

    if (error || !data) {
      console.warn('InsForge storage upload failed:', error?.message)
      return { url: fetchable, key: modelUrl, backend: 'local' }
    }
    return { url: data.url, key: data.key, backend: 'insforge' }
  } catch (e) {
    console.warn('InsForge storage upload threw, using proxied Meshy URL:', e instanceof Error ? e.message : e)
    return { url: fetchable, key: modelUrl, backend: 'local' }
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
