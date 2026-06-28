import { useState, useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Box, Sphere, useGLTF } from '@react-three/drei'
import { useAgentStore } from '../game/store'
import { Agent } from '../game/types'
import { NebiusClient, NEBIUS_CONFIG } from '../api/nebius'
import { useGameLoop } from '../game/loop'
import { isInsforgeConfigured } from '../api/insforge'
import MeshyPanel from './MeshyPanel'
import Leaderboard from './Leaderboard'
import * as THREE from 'three'

/** Loads and renders a Meshy-generated .glb model. Suspends while fetching. */
function CharacterModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  // Clone so the same cached model can be reused across multiple agents.
  const model = useMemo(() => scene.clone(), [scene])
  return <primitive object={model} scale={0.8} />
}

function AgentCharacter({ agent, position }: { agent: Agent; position: [number, number, number] }) {
  const innerRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (innerRef.current) {
      innerRef.current.rotation.y = state.clock.elapsedTime * 0.5
      innerRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.2
    }
  })

  const color = {
    warrior: '#ef4444',
    mage: '#3b82f6',
    rogue: '#22c55e',
    healer: '#f59e0b',
  }[agent.role] || '#888888'

  return (
    <group position={position}>
      <group ref={innerRef}>
        {agent.modelUrl ? (
          <Suspense
            fallback={
              <Sphere args={[0.5, 16, 16]}>
                <meshStandardMaterial color={color} wireframe />
              </Sphere>
            }
          >
            <CharacterModel url={agent.modelUrl} />
          </Suspense>
        ) : (
          <Sphere args={[0.5, 32, 32]}>
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.2 + (agent.level - 1) * 0.1}
            />
          </Sphere>
        )}
      </group>
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {agent.name}
      </Text>
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.2}
        color="#aaa"
        anchorX="center"
        anchorY="middle"
      >
        Lv.{agent.level} {agent.role}
      </Text>
      <Box args={[0.8, 0.05, 0.05]} position={[0, -1, 0]}>
        <meshStandardMaterial color="#333" />
      </Box>
      <Box args={[0.8 * (agent.xp / 100), 0.05, 0.06]} position={[0, -1, 0]}>
        <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.5} />
      </Box>
    </group>
  )
}

function GameArena() {
  const { agents } = useAgentStore()
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#3b82f6" />
      <Box args={[20, 0.5, 20]} position={[0, -2, 0]}>
        <meshStandardMaterial color="#1a1a2e" />
      </Box>
      {Array.from({ length: 10 }).map((_, i) => (
        <Box key={`grid-x-${i}`} args={[20, 0.02, 0.02]} position={[0, -1.7, (i - 5) * 2]}>
          <meshStandardMaterial color="#333" transparent opacity={0.3} />
        </Box>
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <Box key={`grid-z-${i}`} args={[0.02, 0.02, 20]} position={[(i - 5) * 2, -1.7, 0]}>
          <meshStandardMaterial color="#333" transparent opacity={0.3} />
        </Box>
      ))}
      {Array.from({ length: 20 }).map((_, i) => (
        <Sphere key={`particle-${i}`} args={[0.05, 8, 8]} position={[
          Math.sin(i * 1.5) * 8,
          Math.cos(i * 0.5) * 3,
          Math.cos(i * 1.5) * 8,
        ]}>
          <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.8} />
        </Sphere>
      ))}
      {agents.map((agent, i) => (
        <AgentCharacter
          key={agent.id}
          agent={agent}
          position={[
            Math.cos((i / Math.max(agents.length, 1)) * Math.PI * 2) * 3,
            0,
            Math.sin((i / Math.max(agents.length, 1)) * Math.PI * 2) * 3,
          ]}
        />
      ))}
      <OrbitControls />
    </>
  )
}

export default function Game() {
  const { agents, addAgent, gameState, setGameState, nebiusApiKey, setNebiusApiKey } = useAgentStore()
  const [apiKey, setApiKey] = useState(nebiusApiKey)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const { runTurn, autoRun, isRunning, logs } = useGameLoop()
  const nebiusRef = useRef<NebiusClient | null>(null)

  const connectNebius = async () => {
    if (!apiKey.trim()) {
      alert('Enter a Nebius API key first')
      return
    }
    setIsConnecting(true)
    try {
      const client = new NebiusClient(apiKey.trim())
      const ok = await client.testConnection()
      if (ok) {
        nebiusRef.current = client
        // Persist the key so the game loop builds its client from the same key.
        setNebiusApiKey(apiKey.trim())
        setIsConnected(true)
      } else {
        alert('Failed to connect to Nebius — check the API key and model.')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const createAgent = async (name: string, role: Agent['role']) => {
    if (!isConnected) {
      alert('Connect to Nebius first!')
      return
    }

    const agent: Agent = {
      id: `agent-${Date.now()}`,
      name,
      role,
      level: 1,
      xp: 0,
      stats: {
        strength: role === 'warrior' ? 8 : 4,
        intelligence: role === 'mage' ? 8 : 4,
        agility: role === 'rogue' ? 8 : 4,
        wisdom: role === 'healer' ? 8 : 4,
      },
      skills: ['basic_attack'],
      memories: [`Born as ${role}`],
      personality: 'curious, strategic',
      strategy: 'Explore and learn from surroundings',
      improvementLog: [],
    }

    addAgent(agent)
  }

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
          <Suspense fallback={null}>
            <GameArena />
          </Suspense>
        </Canvas>
        
        <div className="absolute top-4 left-4 bg-black/70 p-4 rounded-lg backdrop-blur">
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Wonderful
          </h1>
          <p className="text-sm text-gray-300">AI-Native Hackathon Game</p>
          <div className="mt-2 text-xs space-y-1">
            <p>Turn: {gameState.turn}/{gameState.maxTurns}</p>
            <p>Phase: {gameState.phase}</p>
            <p>Agents: {agents.length}</p>
            <p>Score: {gameState.score}</p>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isInsforgeConfigured ? 'bg-green-400' : 'bg-yellow-400'
              }`}
            />
            <span className="text-gray-300">
              {isInsforgeConfigured ? 'InsForge backend live' : 'InsForge: local mode'}
            </span>
          </div>
        </div>
        
        <div className="absolute top-4 right-4 bg-black/70 p-4 rounded-lg backdrop-blur max-w-xs">
          <h3 className="font-bold mb-2">Party Status</h3>
          {agents.map(agent => (
            <div key={agent.id} className="text-xs mb-2">
              <div className="flex justify-between">
                <span className="font-semibold">{agent.name}</span>
                <span className="text-gray-400">Lv.{agent.level}</span>
              </div>
              <div className="text-gray-400">Strategy: {agent.strategy.substring(0, 30)}...</div>
              <div className="text-gray-500">Skills: {agent.skills.join(', ')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-96 bg-gray-800 p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="bg-gray-700 p-3 rounded">
          <h2 className="font-bold mb-2">Nebius AI</h2>
          <input
            type="password"
            placeholder="Nebius API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full p-2 bg-gray-600 rounded text-sm mb-2"
          />
          <button
            onClick={connectNebius}
            disabled={isConnecting}
            className={`w-full p-2 rounded font-bold disabled:opacity-50 ${
              isConnected ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isConnecting ? 'Connecting…' : isConnected ? 'Connected to Nebius' : 'Connect'}
          </button>
          <p className="mt-1 text-[10px] text-gray-400">Model: {NEBIUS_CONFIG.model}</p>
        </div>

        <div className="bg-gray-700 p-3 rounded">
          <h2 className="font-bold mb-2">Summon Agent</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['warrior', 'mage', 'rogue', 'healer'] as const).map((role) => (
              <button
                key={role}
                onClick={() => createAgent(`${role.charAt(0).toUpperCase() + role.slice(1)}-${Date.now().toString(36).slice(-4)}`, role)}
                className="p-2 bg-gray-600 hover:bg-gray-500 rounded text-sm capitalize disabled:opacity-50"
                disabled={!isConnected}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <MeshyPanel />

        <Leaderboard />

        <div className="bg-gray-700 p-3 rounded">
          <h2 className="font-bold mb-2">Game Controls</h2>
          <button
            onClick={runTurn}
            className="w-full p-2 bg-purple-600 hover:bg-purple-500 rounded font-bold mb-2 disabled:opacity-50"
            disabled={!isConnected || agents.length === 0 || isRunning}
          >
            {isRunning ? 'Running...' : 'Run Turn'}
          </button>
          <button
            onClick={() => autoRun(10)}
            className="w-full p-2 bg-indigo-600 hover:bg-indigo-500 rounded font-bold mb-2 disabled:opacity-50"
            disabled={!isConnected || agents.length === 0 || isRunning}
          >
            Auto Run (10 turns)
          </button>
          <button
            onClick={() => setGameState({ phase: 'lobby', turn: 0, score: 0 })}
            className="w-full p-2 bg-red-600 hover:bg-red-500 rounded font-bold"
          >
            Reset Game
          </button>
        </div>

        <div className="bg-gray-700 p-3 rounded flex-1">
          <h2 className="font-bold mb-2">Game Log</h2>
          <div className="h-48 overflow-y-auto text-xs font-mono space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="text-gray-300">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}