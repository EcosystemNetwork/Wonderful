export interface Agent {
  id: string
  name: string
  role: 'warrior' | 'mage' | 'rogue' | 'healer'
  level: number
  xp: number
  stats: {
    strength: number
    intelligence: number
    agility: number
    wisdom: number
  }
  skills: string[]
  memories: string[]
  personality: string
  strategy: string
  improvementLog: ImprovementEntry[]
  /** URL to a Meshy-generated .glb model (InsForge-stored when available). */
  modelUrl?: string
  /** Security clearance tier. Starts at 0 ("UNCLEARED"); rises as the agent learns. */
  clearance: number
  /** Knowledge points earned by solving challenges; crossing a threshold grants clearance. */
  knowledge: number
}

export interface ImprovementEntry {
  timestamp: number
  trigger: string
  oldStrategy: string
  newStrategy: string
  performanceDelta: number
}

export interface Memory {
  id: string
  agentId: string
  content: string
  embedding?: number[]
  timestamp: number
  importance: number
  turn?: number
  storageKey?: string
}

export interface GameState {
  phase: 'lobby' | 'playing' | 'paused' | 'ended'
  turn: number
  maxTurns: number
  score: number
  currentChallenge?: Challenge
}

export interface Challenge {
  id: string
  type: 'combat' | 'puzzle' | 'social' | 'exploration'
  description: string
  difficulty: number
  rewards: Reward[]
}

export interface Reward {
  type: 'xp' | 'skill' | 'item'
  value: string | number
}

export interface AgentAction {
  agentId: string
  action: string
  target?: string
  reasoning: string
  confidence: number
}

export interface GameEvent {
  type: 'agent_action' | 'challenge_complete' | 'level_up' | 'memory_stored'
  payload: unknown
  timestamp: number
}

/**
 * A single thing that happened in the live (real-time) world — one agent's
 * action at a moment in time. Agents perceive recent events from *other* agents
 * as context, so they react to each other asynchronously.
 */
export interface WorldEvent {
  id: string
  agentId: string
  agentName: string
  role: Agent['role']
  action: string
  reasoning: string
  confidence: number
  ts: number
}
