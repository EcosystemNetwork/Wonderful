import { useMemo, useState } from 'react'
import { useAgentStore, THINKING } from '../game/store'
import { SelfImprovingAgent } from '../game/agent'
import { GatewayClient } from '../api/aiGateway'
import { saveMemory, saveRun } from '../api/insforge'
import { Challenge } from '../game/types'
import { knowledgeGain, applyLearning, clearanceForKnowledge, clearanceLabel } from '../game/progression'

/**
 * GameLoop - Core game orchestration
 * Manages turns, challenges, agent decisions, and self-improvement
 */
export function useGameLoop() {
  const { setGameState, updateAgent, addMemory, setThought } =
    useAgentStore()
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  // All inference goes through the InsForge `ai-chat` gateway — no provider key
  // in the browser. The client is stateless, so one instance is enough.
  const nebius = useMemo(() => new GatewayClient(), [])

  const addLog = (msg: string) => {
    const t = useAgentStore.getState().gameState.turn
    setLogs(prev => [...prev.slice(-50), `[T${t}] ${msg}`])
  }

  const generateChallenge = (turn: number): Challenge => {
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
      difficulty: Math.min(turn + 3, 10),
      rewards: [
        { type: 'xp', value: 50 + turn * 10 },
        { type: 'skill', value: 'unknown' },
      ],
    }
  }

  const runTurn = async () => {
    // Read a fresh store snapshot every turn. Destructuring `agents`/`gameState`
    // at hook-render time froze them in this closure, so autoRun's loop kept
    // seeing turn 0 — the end condition never tripped and saveRun never ran.
    const { agents, gameState } = useAgentStore.getState()

    if (agents.length === 0) {
      addLog('No agents in party!')
      return
    }

    setIsRunning(true)
    addLog('--- New Turn ---')

    const challenge = generateChallenge(gameState.turn)
    addLog(`Challenge: ${challenge.description} (${challenge.type}, diff: ${challenge.difficulty})`)

    // Each agent decides their action
    for (const agent of agents) {
      try {
        setThought(agent.id, THINKING)
        const aiAgent = new SelfImprovingAgent(agent, nebius.getClient())
        const action = await aiAgent.decideAction(challenge, `Party of ${agents.length} agents`)

        // Surface the live reasoning as a floating thought bubble in the arena.
        setThought(agent.id, action.reasoning)
        addLog(`${agent.name}: ${action.action} (confidence: ${(action.confidence * 100).toFixed(0)}%)`)
        
        // Update agent with new memory
        updateAgent(agent.id, {
          memories: [...agent.memories, action.reasoning],
        })

        // Persist memory to InsForge (auto-falls back to localStorage)
        const memory = {
          id: `mem-${Date.now()}-${agent.id}`,
          agentId: agent.id,
          content: action.reasoning,
          timestamp: Date.now(),
          importance: action.confidence,
          turn: gameState.turn,
        }

        const result = await saveMemory(memory)
        addMemory({ ...memory, storageKey: result.key })
        if (result.backend === 'insforge') {
          addLog(`  ↳ memory saved to InsForge (${result.key.slice(0, 8)})`)
        }

        // Learn from the attempt: earn Knowledge. Clearance is NOT granted here —
        // the player decides who gets promoted and when. Learning just makes a
        // character *eligible*; we flag that the first time they cross a tier.
        const gained = knowledgeGain(action.confidence, challenge.difficulty)
        const learned = applyLearning(agent, gained)
        updateAgent(agent.id, {
          knowledge: learned.knowledge,
          xp: agent.xp + gained,
        })
        addLog(`  ↳ ${agent.name} learned +${gained} knowledge (${learned.knowledge} total)`)
        const eligibleBefore = clearanceForKnowledge(agent.knowledge)
        const eligibleNow = clearanceForKnowledge(learned.knowledge)
        if (eligibleNow > eligibleBefore && eligibleNow > agent.clearance) {
          addLog(`✅ ${agent.name} is ready for ${clearanceLabel(eligibleNow)} — promote when you want.`)
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
        setThought(agent.id, '⚠ couldn’t act')
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

    const nextTurn = gameState.turn + 1
    setGameState({ turn: nextTurn })

    if (nextTurn >= gameState.maxTurns) {
      setGameState({ phase: 'ended' })
      addLog('Game Over!')

      // Record each agent's run to the InsForge leaderboard
      for (const agent of agents) {
        const score = agent.level * 1000 + agent.xp
        const result = await saveRun({
          agent_name: agent.name,
          agent_role: agent.role,
          level: agent.level,
          xp: agent.xp,
          turns: nextTurn,
          final_strategy: agent.strategy,
          score,
        })
        addLog(`${agent.name} scored ${score} → saved to ${result.backend}`)
      }
    }

    setIsRunning(false)
  }

  const autoRun = async (turns: number = 10) => {
    for (let i = 0; i < turns; i++) {
      // Fresh read — the closure's gameState never updates between iterations.
      if (useAgentStore.getState().gameState.phase === 'ended') break
      await runTurn()
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  return { runTurn, autoRun, isRunning, logs }
}
