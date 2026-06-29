import { create } from 'zustand'
import { Agent, GameState, Memory } from './types'
import { ChatMessage } from '../api/claude'

/** Top-level UI flow: landing → summon party → enter arena. */
export type Screen = 'landing' | 'summon' | 'game'

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

  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  addMemory: (memory: Memory) => void
  setGameState: (state: Partial<GameState>) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  screen: 'landing',
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
