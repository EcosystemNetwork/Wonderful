import { useState } from 'react'
import { useAgentStore } from '../game/store'
import { SelfImprovingAgent } from '../game/agent'
import { NebiusClient } from '../api/nebius'
import { SiaStorage } from '../storage/sia'
import { Challenge } from '../game/types'

/**
 * GameLoop - Core game orchestration
 * Manages turns, challenges, agent decisions, and self-improvement
 */
export function useGameLoop() {
  const { agents, gameState, setGameState, updateAgent, addMemory } = useAgentStore()
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const nebius = new NebiusClient(import.meta.env.VITE_NEBIUS_API_KEY || '')
  const sia = new SiaStorage()

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-50), `[T${gameState.turn}] ${msg}`])
  }

  const generateChallenge = (): Challenge => {
    const types: Challenge['type'][] = ['combat', 'puzzle', 'social', 'exploration']
    const type = types[Math.floor(Math.random() * types.length)]
    
    const descriptions: Record<string, string[]> = {
      combat: [
        'A wild beast blocks your path!',
        'Bandits ambush your party!',
        'A rival challenger approaches!',
      ],
      puzzle: [
        'An ancient mechanism bars the way.',
        'Riddles guard the treasure chamber.',
        'A magical lock requires a sequence.',
      ],
      social: [
        'A merchant offers a risky deal.',
        'A mysterious stranger seeks help.',
        'A diplomatic crisis unfolds.',
      ],
      exploration: [
        'A hidden cave beckons exploration.',
        'Strange ruins appear in the mist.',
        'A portal to an unknown realm opens.',
      ],
    }

    return {
      id: `challenge-${Date.now()}`,
      type,
      description: descriptions[type][Math.floor(Math.random() * descriptions[type].length)],
      difficulty: Math.min(gameState.turn + 3, 10),
      rewards: [
        { type: 'xp', value: 50 + gameState.turn * 10 },
        { type: 'skill', value: 'unknown' },
      ],
    }
  }

  const runTurn = async () => {
    if (agents.length === 0) {
      addLog('No agents in party!')
      return
    }

    setIsRunning(true)
    addLog('--- New Turn ---')

    const challenge = generateChallenge()
    addLog(`Challenge: ${challenge.description} (${challenge.type}, diff: ${challenge.difficulty})`)

    // Each agent decides their action
    for (const agent of agents) {
      try {
        const aiAgent = new SelfImprovingAgent(agent, nebius.getClient())
        const action = await aiAgent.decideAction(challenge, `Party of ${agents.length} agents`)
        
        addLog(`${agent.name}: ${action.action} (confidence: ${(action.confidence * 100).toFixed(0)}%)`)
        
        // Update agent with new memory
        updateAgent(agent.id, {
          memories: [...agent.memories, action.reasoning],
        })

        // Store memory on Sia
        const memory = {
          id: `mem-${Date.now()}-${agent.id}`,
          agentId: agent.id,
          content: action.reasoning,
          timestamp: Date.now(),
          importance: action.confidence,
        }
        
        try {
          const result = await sia.storeMemory(memory)
          addMemory({ ...memory, siaHash: result.hash })
        } catch {
          // Fallback to local storage
          sia.storeLocal(memory)
          addMemory(memory)
        }

        // Check for level up
        if (agent.xp > agent.level * 100) {
          updateAgent(agent.id, {
            level: agent.level + 1,
            xp: 0,
            stats: {
              strength: agent.stats.strength + (agent.role === 'warrior' ? 2 : 1),
              intelligence: agent.stats.intelligence + (agent.role === 'mage' ? 2 : 1),
              agility: agent.stats.agility + (agent.role === 'rogue' ? 2 : 1),
              wisdom: agent.stats.wisdom + (agent.role === 'healer' ? 2 : 1),
            },
          })
          addLog(`${agent.name} leveled up to ${agent.level + 1}!`)
        }

      } catch (e) {
        addLog(`${agent.name} failed to act: ${e}`)
      }
    }

    // Self-improvement phase every 5 turns
    if (gameState.turn % 5 === 0 && gameState.turn > 0) {
      addLog('--- Self-Improvement Phase ---')
      for (const agent of agents) {
        try {
          const aiAgent = new SelfImprovingAgent(agent, nebius.getClient())
          const performance = Math.min(50 + agent.level * 5, 100)
          await aiAgent.improveStrategy(performance, agent.memories.slice(-10))
          
          const improved = aiAgent.getAgent()
          updateAgent(agent.id, {
            strategy: improved.strategy,
            skills: improved.skills,
            improvementLog: improved.improvementLog,
          })
          
          const latestImprovement = improved.improvementLog[improved.improvementLog.length - 1]
          if (latestImprovement) {
            addLog(`${agent.name} improved: ${latestImprovement.newStrategy.substring(0, 60)}...`)
          }
        } catch (e) {
          addLog(`${agent.name} improvement failed: ${e}`)
        }
      }
    }

    setGameState({ turn: gameState.turn + 1 })
    
    if (gameState.turn >= gameState.maxTurns) {
      setGameState({ phase: 'ended' })
      addLog('Game Over!')
    }

    setIsRunning(false)
  }

  const autoRun = async (turns: number = 10) => {
    for (let i = 0; i < turns; i++) {
      if (gameState.phase === 'ended') break
      await runTurn()
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  return { runTurn, autoRun, isRunning, logs }
}
