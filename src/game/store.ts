import { create } from 'zustand'
import { Agent, GameState, Memory, WorldEvent } from './types'
import { ChatMessage } from '../api/claude'

/** Top-level UI flow: character select (the gate) → create → enter arena. */
export type Screen = 'landing' | 'select' | 'summon' | 'game'

/** Sentinel stored as an agent's thought while its Nebius decision is in flight. */
export const THINKING = 'thinking'

interface AgentStore {
  screen: Screen
  setScreen: (screen: Screen) => void

  agents: Agent[]
  gameState: GameState
  memories: Memory[]

  /** Active Nebius API key (from manual connect or env). Empty until connected. */
  nebiusApiKey: string
  setNebiusApiKey: (key: string) => void

  /** Whether the in-game Claude (via the proxy) is connected. */
  claudeConnected: boolean
  setClaudeConnected: (connected: boolean) => void

  /** In-game chat transcript with Claude. */
  chat: ChatMessage[]
  addChat: (message: ChatMessage) => void
  clearChat: () => void

  /** The agent the player is currently driving around the arena. */
  controlledAgentId: string | null
  setControlledAgentId: (id: string | null) => void

  /**
   * Live reasoning per agent, shown as a floating thought bubble in the arena.
   * Set to the `THINKING` sentinel while a decision is in flight, then to the
   * agent's actual Nebius reasoning. Cleared at the start of each turn.
   */
  thoughts: Record<string, string>
  setThought: (agentId: string, text: string) => void
  clearThoughts: () => void

  // --- Real-time simulation --------------------------------------------------
  /** Whether the live, real-time agent simulation is currently running. */
  simRunning: boolean
  setSimRunning: (running: boolean) => void
  /** The ambient world situation all agents perceive; the director rotates it. */
  situation: string
  setSituation: (situation: string) => void
  /** Rolling feed of recent agent actions; agents react to each other via this. */
  events: WorldEvent[]
  pushEvent: (event: WorldEvent) => void
  clearEvents: () => void

  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  addMemory: (memory: Memory) => void
  setGameState: (state: Partial<GameState>) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  // Character select is the front gate — no one reaches the arena without a character.
  screen: 'select',
  setScreen: (screen) => set({ screen }),

  agents: [],
  gameState: {
    phase: 'lobby',
    turn: 0,
    maxTurns: 50,
    score: 0,
  },
  memories: [],

  nebiusApiKey: import.meta.env.VITE_NEBIUS_API_KEY || '',
  setNebiusApiKey: (key) => set({ nebiusApiKey: key }),

  claudeConnected: false,
  setClaudeConnected: (claudeConnected) => set({ claudeConnected }),

  chat: [],
  addChat: (message) => set((s) => ({ chat: [...s.chat, message] })),
  clearChat: () => set({ chat: [] }),

  controlledAgentId: null,
  setControlledAgentId: (controlledAgentId) => set({ controlledAgentId }),

  thoughts: {},
  setThought: (agentId, text) =>
    set((s) => ({ thoughts: { ...s.thoughts, [agentId]: text } })),
  clearThoughts: () => set({ thoughts: {} }),

  simRunning: false,
  setSimRunning: (simRunning) => set({ simRunning }),
  situation: 'The arena hums with latent energy. Nothing stirs yet.',
  setSituation: (situation) => set({ situation }),
  events: [],
  pushEvent: (event) => set((s) => ({ events: [...s.events.slice(-49), event] })),
  clearEvents: () => set({ events: [] }),

  addAgent: (agent) =>
    set((state) => ({
      agents: [...state.agents, agent],
      // First summoned agent becomes the one you drive by default.
      controlledAgentId: state.controlledAgentId ?? agent.id,
    })),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
      controlledAgentId:
        state.controlledAgentId === id
          ? (state.agents.find((a) => a.id !== id)?.id ?? null)
          : state.controlledAgentId,
    })),
  addMemory: (memory) => set((state) => ({ memories: [...state.memories, memory] })),
  setGameState: (state) => set((s) => ({ gameState: { ...s.gameState, ...state } })),
}))
