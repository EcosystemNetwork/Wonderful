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
