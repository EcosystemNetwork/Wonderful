import { useAgentStore } from './store'
import { Agent } from './types'
import { makeAgent } from '../components/Summon'

/**
 * Actions the in-game Claude can take by emitting a JSON block in its reply.
 * These let the player reshape the arena conversationally ("spawn a healer and
 * have it play defensively"). Parsing is tolerant; execution goes through the
 * normal store so the 3D scene + party UI update reactively.
 */
export interface AiAction {
  type: 'spawn' | 'drive' | 'strategy' | 'dismiss'
  role?: Agent['role']
  name?: string
  /** A character name or role to act on. */
  target?: string
  strategy?: string
}

const ROLES: Agent['role'][] = ['warrior', 'mage', 'rogue', 'healer']

function tryParseArray(s: string): AiAction[] {
  try {
    const v = JSON.parse(s)
    if (Array.isArray(v)) return v as AiAction[]
    if (v && typeof v === 'object') return [v as AiAction]
  } catch {
    /* not valid JSON — ignore */
  }
  return []
}

/** Pull actions out of a reply: a ```action / ```json fence, else a bare array. */
export function parseAiActions(text: string): AiAction[] {
  const fence = text.match(/```(?:action|json)?\s*([\s\S]*?)```/i)
  if (fence) {
    const arr = tryParseArray(fence[1].trim())
    if (arr.length) return arr
  }
  const bare = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
  if (bare) return tryParseArray(bare[0])
  return []
}

/** Remove action/json code blocks so only the conversational prose is shown. */
export function stripActionBlocks(text: string): string {
  return text
    .replace(/```(?:action|json)?\s*[\s\S]*?```/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Resolve a target string to an agent by exact name, then by role. */
function resolveAgent(target?: string): Agent | undefined {
  if (!target) return undefined
  const { agents } = useAgentStore.getState()
  const t = target.toLowerCase()
  return (
    agents.find((a) => a.name.toLowerCase() === t) ||
    agents.find((a) => a.role === (t as Agent['role']))
  )
}

/**
 * Execute a batch of actions against the live store and return short notes for
 * each one applied (shown to the player as a "✦ …" summary under the reply).
 * Reads fresh state per action so a `drive` can target a just-`spawn`ed agent.
 */
export function executeAiActions(actions: AiAction[]): string[] {
  const store = useAgentStore.getState()
  const notes: string[] = []

  for (const a of actions) {
    switch (a.type) {
      case 'spawn': {
        const role = ROLES.includes(a.role as Agent['role']) ? (a.role as Agent['role']) : 'warrior'
        const name =
          a.name?.trim() ||
          `${role.charAt(0).toUpperCase() + role.slice(1)}-${Date.now().toString(36).slice(-4)}`
        store.addAgent(makeAgent(name, role))
        notes.push(`spawned ${name} (${role})`)
        break
      }
      case 'drive': {
        const ag = resolveAgent(a.target)
        if (ag) {
          store.setControlledAgentId(ag.id)
          notes.push(`now driving ${ag.name}`)
        }
        break
      }
      case 'strategy': {
        const ag = resolveAgent(a.target)
        if (ag && a.strategy?.trim()) {
          store.updateAgent(ag.id, { strategy: a.strategy.trim() })
          notes.push(`${ag.name}'s strategy updated`)
        }
        break
      }
      case 'dismiss': {
        const ag = resolveAgent(a.target)
        if (ag) {
          store.removeAgent(ag.id)
          notes.push(`dismissed ${ag.name}`)
        }
        break
      }
    }
  }

  return notes
}
