import { useCallback, useEffect, useRef } from 'react'
import { useAgentStore } from './store'
import { THINKING } from './store'
import { SelfImprovingAgent } from './agent'
import { GatewayClient } from '../api/aiGateway'
import { saveMemory } from '../api/insforge'
import { Agent, AgentAction, Challenge } from './types'

/**
 * Real-time simulation engine.
 *
 * Every agent runs its OWN autonomous brain loop: perceive → decide → act →
 * wait a role-specific beat → repeat. Loops run concurrently and desynchronized,
 * so many agents think and act at the same time, reacting to each other through a
 * shared world event feed. A lightweight "director" rotates the ambient situation.
 *
 * COST GOVERNANCE — inference is the dominant cost, so the loop spends it only
 * when it buys something:
 *   1. Change-detection — an agent only calls the LLM when the world actually
 *      changed for it (new situation, or a NEW substantive action by someone
 *      else). Otherwise it takes a free rule-based "routine" action.
 *   2. Pause-when-unwatched — when the tab is hidden, no one is watching, so the
 *      loop drops to routine-only (zero inference) until it's visible again.
 *   3. Rate ceiling — a hard cap on LLM calls/min across the whole sim, so a
 *      runaway reaction chain can never run up a surprise bill.
 * All inference goes through the InsForge `ai-chat` gateway (no key in the
 * browser); non-Meta models only, per project policy.
 */

// --- Concurrency limiter (protects gateway rate limits / cost) ----------------
function createLimiter(max: number) {
  let active = 0
  const queue: Array<() => void> = []
  const drain = () => {
    if (active >= max || queue.length === 0) return
    active++
    const run = queue.shift()!
    run()
  }
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--
            drain()
          })
      })
      drain()
    })
  }
}
const limit = createLimiter(5)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// --- Rate ceiling: token bucket of LLM calls per minute (whole sim) -----------
const MAX_CALLS_PER_MIN = Number(import.meta.env.VITE_AI_MAX_CALLS_PER_MIN) || 20

class RateGovernor {
  private hits: number[] = []
  constructor(private maxPerMin: number) {}
  /** Consume one token if the last-60s budget allows; returns false when capped. */
  take(): boolean {
    const now = Date.now()
    const cutoff = now - 60_000
    this.hits = this.hits.filter((t) => t > cutoff)
    if (this.hits.length >= this.maxPerMin) return false
    this.hits.push(now)
    return true
  }
}

// --- Per-role pacing ----------------------------------------------------------
const BASE_CADENCE: Record<Agent['role'], number> = {
  rogue: 2600,
  warrior: 3600,
  healer: 4400,
  mage: 5200,
}

function cadence(agent: Agent): number {
  const base = BASE_CADENCE[agent.role] ?? 4000
  const jitter = base * 0.35
  return base - jitter + Math.random() * jitter * 2
}

// --- Free, rule-based "routine" actions (no inference) ------------------------
// Used when nothing changed, the tab is hidden, or the rate ceiling is hit. The
// world still feels alive; these just don't cost an LLM call and don't ripple
// out to make OTHER agents think (their event ids are prefixed `routine-`).
const ROUTINE: Record<Agent['role'], string[]> = {
  warrior: ['holds the line, scanning for threats', 'paces the perimeter, blade ready', 'tests their footing on the cracked stone'],
  mage: ['studies the ambient mana currents', 'mutters a half-formed incantation', 'traces a sigil in the air, thinking'],
  rogue: ['melts into the shadows, watching', 'checks the exits out of old habit', 'palms a coin, eyeing the room'],
  healer: ['tends a small wound in silence', 'centers themselves, sensing the group', 'sorts through a pouch of herbs'],
}

function routineAction(agent: Agent): AgentAction {
  const lines = ROUTINE[agent.role] ?? ['observes the surroundings']
  return {
    agentId: agent.id,
    action: lines[Math.floor(Math.random() * lines.length)],
    reasoning: 'biding time — nothing new to react to',
    confidence: 0.3,
  }
}

// --- Ambient world ------------------------------------------------------------
const SITUATIONS = [
  'A shimmering rift tears open to the north, leaking raw mana.',
  'Shadows lengthen — something large moves beyond the pillars.',
  'A wounded traveler stumbles in, begging for aid.',
  'Ancient glyphs ignite across the floor, pulsing in sequence.',
  'Rival adventurers appear at the gate, eyeing your party.',
  'The ground trembles; loot glints in a newly-opened fissure.',
  'An eerie calm settles. The air tastes of ozone.',
  'A spectral merchant flickers into view, offering a strange bargain.',
]

function inferType(situation: string): Challenge['type'] {
  const s = situation.toLowerCase()
  if (/(moves|shadow|rival|trembl|beast)/.test(s)) return 'combat'
  if (/(traveler|merchant|bargain|begging)/.test(s)) return 'social'
  if (/(glyph|sequence|rift|mana|lock)/.test(s)) return 'puzzle'
  return 'exploration'
}

function challengeFor(agent: Agent): Challenge {
  const situation = useAgentStore.getState().situation
  return {
    id: `live-${Date.now()}`,
    type: inferType(situation),
    description: situation,
    difficulty: Math.min(3 + agent.level, 10),
    rewards: [],
  }
}

/** What an agent "sees" right now: the situation + recent actions of OTHERS. */
function perceive(agentId: string): string {
  const { situation, events } = useAgentStore.getState()
  const others = events.filter((e) => e.agentId !== agentId).slice(-5)
  const feed = others.length
    ? others.map((e) => `- ${e.agentName} (${e.role}) ${e.action}`).join('\n')
    : '- (quiet around you for now)'
  return [
    'You are acting in REAL TIME alongside other autonomous agents — there are no turns.',
    `Current situation: ${situation}`,
    'Recent activity around you:',
    feed,
    'React naturally: cooperate, compete, or pursue your own goal. Keep your action short and specific.',
  ].join('\n')
}

/**
 * A signature of "what this agent could meaningfully react to": the current
 * situation plus the id of the latest SUBSTANTIVE (non-routine) action by anyone
 * else. If it hasn't changed since this agent last acted, there's nothing new to
 * think about — so we skip inference and take a free routine action.
 */
function worldSignature(agentId: string): string {
  const { situation, events } = useAgentStore.getState()
  let lastOther = ''
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.agentId !== agentId && !e.id.startsWith('routine-')) {
      lastOther = e.id
      break
    }
  }
  return `${situation}::${lastOther}`
}

class SimEngine {
  private brains = new Map<string, () => void>() // agentId -> stop()
  private running = false
  private unsub?: () => void
  private idsKey = ''
  private directorTimer?: ReturnType<typeof setInterval>
  private lastSig = new Map<string, string>() // agentId -> last world signature acted on
  private gov = new RateGovernor(MAX_CALLS_PER_MIN)

  constructor(private getClient: () => GatewayClient) {}

  start() {
    if (this.running) return
    this.running = true
    useAgentStore.getState().clearEvents()
    this.lastSig.clear()
    this.syncBrains()
    this.unsub = useAgentStore.subscribe(() => this.syncBrains())
    this.runDirector()
  }

  stop() {
    this.running = false
    this.unsub?.()
    this.unsub = undefined
    if (this.directorTimer) clearInterval(this.directorTimer)
    for (const stop of this.brains.values()) stop()
    this.brains.clear()
    this.idsKey = ''
  }

  /** Start a loop for any new agent, kill loops for removed agents. */
  private syncBrains() {
    if (!this.running) return
    const agents = useAgentStore.getState().agents
    const key = agents.map((a) => a.id).join(',')
    if (key === this.idsKey) return
    this.idsKey = key
    const ids = new Set(agents.map((a) => a.id))
    for (const a of agents) {
      if (!this.brains.has(a.id)) this.brains.set(a.id, this.spawn(a.id))
    }
    for (const id of [...this.brains.keys()]) {
      if (!ids.has(id)) {
        this.brains.get(id)!()
        this.brains.delete(id)
      }
    }
  }

  /**
   * Decide whether this beat warrants a real LLM call. Inference is spent only
   * when ALL hold: the world changed for this agent, the tab is visible (someone
   * is watching), and the rate ceiling has budget. Otherwise → free routine.
   */
  private shouldThink(agentId: string): boolean {
    const sig = worldSignature(agentId)
    const changed = sig !== this.lastSig.get(agentId)
    this.lastSig.set(agentId, sig)
    const watched = typeof document === 'undefined' || !document.hidden
    if (!changed || !watched) return false
    return this.gov.take()
  }

  private spawn(agentId: string): () => void {
    let alive = true
    const loop = async () => {
      // Random stagger so agents don't all fire on the same frame.
      await sleep(Math.random() * 1800)
      while (alive && this.running) {
        const agent = useAgentStore.getState().agents.find((a) => a.id === agentId)
        if (!agent) break

        if (this.shouldThink(agentId)) {
          // --- Inference path (costs a gateway call) ---
          try {
            useAgentStore.getState().setThought(agentId, THINKING)
            const ai = new SelfImprovingAgent(
              { ...agent, memories: [...agent.memories] },
              this.getClient().getClient(),
            )
            const action = await limit(() =>
              ai.decideAction(challengeFor(agent), perceive(agentId)),
            )
            if (!alive) break
            this.applyAction(agentId, action, false)
          } catch {
            // Gateway down / over budget / parse fail — keep the world moving for free.
            if (alive) this.applyAction(agentId, routineAction(agent), true)
          }
        } else {
          // --- Free path (no inference) ---
          this.applyAction(agentId, routineAction(agent), true)
        }

        await sleep(cadence(agent))
      }
    }
    void loop()
    return () => {
      alive = false
    }
  }

  private applyAction(agentId: string, action: AgentAction, isRoutine: boolean) {
    const store = useAgentStore.getState()
    const agent = store.agents.find((a) => a.id === agentId)
    if (!agent) return

    store.setThought(agentId, action.reasoning)
    store.pushEvent({
      // Routine events are tagged so they DON'T make other agents spend inference.
      id: `${isRoutine ? 'routine' : 'ev'}-${Date.now()}-${agentId}`,
      agentId,
      agentName: agent.name,
      role: agent.role,
      action: action.action,
      reasoning: action.reasoning,
      confidence: action.confidence,
      ts: Date.now(),
    })

    // Progression: gain XP, level up on threshold.
    const gained = Math.max(1, Math.round(action.confidence * 25))
    let { level, xp, stats } = agent
    xp += gained
    const updates: Partial<Agent> = {
      memories: [...agent.memories.slice(-39), action.reasoning],
    }
    if (xp >= level * 100) {
      xp -= level * 100
      level += 1
      stats = {
        strength: stats.strength + (agent.role === 'warrior' ? 2 : 1),
        intelligence: stats.intelligence + (agent.role === 'mage' ? 2 : 1),
        agility: stats.agility + (agent.role === 'rogue' ? 2 : 1),
        wisdom: stats.wisdom + (agent.role === 'healer' ? 2 : 1),
      }
      updates.level = level
      updates.stats = stats
    }
    updates.xp = xp
    store.updateAgent(agentId, updates)

    // Persist only substantive memories (routine filler isn't worth a write),
    // and even then throttle to avoid hammering the backend.
    if (!isRoutine && Math.random() < 0.34) {
      void saveMemory({
        id: `mem-${Date.now()}-${agentId}`,
        agentId,
        content: action.reasoning,
        timestamp: Date.now(),
        importance: action.confidence,
        turn: 0,
      })
    }
  }

  private runDirector() {
    const rotate = () => {
      if (!this.running) return
      // Don't churn the situation (which makes everyone think) while unwatched.
      if (typeof document !== 'undefined' && document.hidden) return
      const current = useAgentStore.getState().situation
      let next = current
      while (next === current) next = SITUATIONS[Math.floor(Math.random() * SITUATIONS.length)]
      useAgentStore.getState().setSituation(next)
    }
    setTimeout(rotate, 4000)
    this.directorTimer = setInterval(rotate, 18000 + Math.random() * 8000)
  }
}

/**
 * React hook that owns a SimEngine instance and exposes start/stop. The engine
 * keeps running across re-renders and is torn down on unmount. Inference goes
 * through the InsForge gateway, so no API key is needed in the browser.
 */
export function useRealtimeSim() {
  const live = useAgentStore((s) => s.simRunning)
  const engineRef = useRef<SimEngine | null>(null)
  const clientRef = useRef<GatewayClient>(new GatewayClient())

  const start = useCallback(() => {
    if (engineRef.current) return
    const engine = new SimEngine(() => clientRef.current)
    engineRef.current = engine
    engine.start()
    useAgentStore.getState().setSimRunning(true)
  }, [])

  const stop = useCallback(() => {
    engineRef.current?.stop()
    engineRef.current = null
    useAgentStore.getState().setSimRunning(false)
  }, [])

  // Tear down if the component using the hook unmounts.
  useEffect(
    () => () => {
      engineRef.current?.stop()
      engineRef.current = null
    },
    [],
  )

  return { live, start, stop }
}
