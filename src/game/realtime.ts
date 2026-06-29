import { useCallback, useEffect, useRef } from 'react'
import { useAgentStore } from './store'
import { THINKING } from './store'
import { SelfImprovingAgent } from './agent'
import { NebiusClient } from '../api/nebius'
import { saveMemory } from '../api/insforge'
import { Agent, AgentAction, Challenge } from './types'

/**
 * Real-time simulation engine.
 *
 * Instead of a global turn loop, every agent runs its OWN autonomous brain loop:
 * perceive → decide (Nebius) → act → wait a role-specific beat → repeat. Loops
 * run concurrently and desynchronized, so many agents think and act at the same
 * time (or at different times), reacting to each other through a shared world
 * event feed. A lightweight "director" rotates the ambient situation to keep the
 * world alive.
 */

// --- Concurrency limiter (protects Nebius rate limits / cost) ----------------
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

// --- Per-role pacing ----------------------------------------------------------
// Base milliseconds between an agent's actions; jittered so nobody stays in sync.
const BASE_CADENCE: Record<Agent['role'], number> = {
  rogue: 2600, // impulsive, fast
  warrior: 3600,
  healer: 4400, // reactive
  mage: 5200, // contemplative
}

function cadence(agent: Agent): number {
  const base = BASE_CADENCE[agent.role] ?? 4000
  const jitter = base * 0.35
  return base - jitter + Math.random() * jitter * 2
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

class SimEngine {
  private brains = new Map<string, () => void>() // agentId -> stop()
  private running = false
  private unsub?: () => void
  private idsKey = ''
  private directorTimer?: ReturnType<typeof setInterval>

  constructor(private getClient: () => NebiusClient) {}

  start() {
    if (this.running) return
    this.running = true
    useAgentStore.getState().clearEvents()
    this.syncBrains()
    // Re-sync whenever the agent roster changes (add/remove).
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

  private spawn(agentId: string): () => void {
    let alive = true
    const loop = async () => {
      // Random stagger so agents don't all fire on the same frame.
      await sleep(Math.random() * 1800)
      while (alive && this.running) {
        const agent = useAgentStore.getState().agents.find((a) => a.id === agentId)
        if (!agent) break
        try {
          useAgentStore.getState().setThought(agentId, THINKING)
          // Clone the agent so SelfImprovingAgent's internal memory push doesn't
          // mutate store state directly.
          const ai = new SelfImprovingAgent(
            { ...agent, memories: [...agent.memories] },
            this.getClient().getClient(),
          )
          const action = await limit(() =>
            ai.decideAction(challengeFor(agent), perceive(agentId)),
          )
          if (!alive) break
          this.applyAction(agentId, action)
        } catch {
          if (alive) useAgentStore.getState().setThought(agentId, '⚠ glitched')
        }
        await sleep(cadence(agent))
      }
    }
    void loop()
    return () => {
      alive = false
    }
  }

  private applyAction(agentId: string, action: AgentAction) {
    const store = useAgentStore.getState()
    const agent = store.agents.find((a) => a.id === agentId)
    if (!agent) return

    store.setThought(agentId, action.reasoning)
    store.pushEvent({
      id: `ev-${Date.now()}-${agentId}`,
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

    // Best-effort, non-blocking, throttled persistence (avoid hammering InsForge).
    if (Math.random() < 0.34) {
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
      const current = useAgentStore.getState().situation
      let next = current
      while (next === current) next = SITUATIONS[Math.floor(Math.random() * SITUATIONS.length)]
      useAgentStore.getState().setSituation(next)
    }
    // First beat shortly after going live, then every ~22s (jittered).
    setTimeout(rotate, 4000)
    this.directorTimer = setInterval(rotate, 18000 + Math.random() * 8000)
  }
}

/**
 * React hook that owns a SimEngine instance and exposes start/stop. The engine
 * keeps running across re-renders and is torn down on unmount.
 */
export function useRealtimeSim() {
  const live = useAgentStore((s) => s.simRunning)
  const nebiusApiKey = useAgentStore((s) => s.nebiusApiKey)
  const engineRef = useRef<SimEngine | null>(null)
  const clientRef = useRef<NebiusClient>(new NebiusClient(nebiusApiKey))

  // Keep the client in sync with the active key without restarting loops.
  useEffect(() => {
    clientRef.current = new NebiusClient(nebiusApiKey)
  }, [nebiusApiKey])

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
