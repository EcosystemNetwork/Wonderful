import { create } from 'zustand'
import { Agent, GameState, Memory } from './types'

interface AgentStore {
  agents: Agent[]
  gameState: GameState
  memories: Memory[]
  /** Active Nebius API key (from manual connect or env). Empty until connected. */
  nebiusApiKey: string
  setNebiusApiKey: (key: string) => void
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  addMemory: (memory: Memory) => void
  setGameState: (state: Partial<GameState>) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
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
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  addMemory: (memory) => set((state) => ({ memories: [...state.memories, memory] })),
  setGameState: (state) => set((s) => ({ gameState: { ...s.gameState, ...state } })),
}))
