import { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Box, Sphere, useGLTF } from '@react-three/drei'
import { useAgentStore } from '../game/store'
import { Agent } from '../game/types'
import { NebiusClient } from '../api/nebius'
import { useGameLoop } from '../game/loop'
import { isInsforgeConfigured } from '../api/insforge'
import MeshyPanel from './MeshyPanel'
import ErrorBoundary from './ErrorBoundary'
import Leaderboard from './Leaderboard'
import ClaudeChat from './ClaudeChat'
import * as THREE from 'three'

const ROLE_COLOR: Record<Agent['role'], string> = {
  warrior: '#ef4444',
  mage: '#3b82f6',
  rogue: '#22c55e',
  healer: '#f59e0b',
}

/** Loads and renders a Meshy-generated .glb model. Suspends while fetching. */
function CharacterModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const model = useMemo(() => scene.clone(), [scene])
  return <primitive object={model} scale={0.8} />
}

/** The visible body of an agent (model or glowing orb). */
function AgentBody({ agent }: { agent: Agent }) {
  const color = ROLE_COLOR[agent.role] || '#888888'
  if (agent.modelUrl) {
    return (
      <Suspense
        fallback={
          <Sphere args={[0.5, 16, 16]}>
            <meshStandardMaterial color={color} wireframe />
          </Sphere>
        }
      >
        <CharacterModel url={agent.modelUrl} />
      </Suspense>
    )
  }
  return (
    <Sphere args={[0.5, 32, 32]}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2 + (agent.level - 1) * 0.1}
      />
    </Sphere>
  )
}

function AgentLabels({ agent }: { agent: Agent }) {
  return (
    <>
      <Text position={[0, 0.8, 0]} fontSize={0.3} color="white" anchorX="center" anchorY="middle">
        {agent.name}
      </Text>
      <Text position={[0, -0.8, 0]} fontSize={0.2} color="#aaa" anchorX="center" anchorY="middle">
        Lv.{agent.level} {agent.role}
      </Text>
      <Box args={[0.8, 0.05, 0.05]} position={[0, -1, 0]}>
        <meshStandardMaterial color="#333" />
      </Box>
      <Box args={[0.8 * (agent.xp / 100), 0.05, 0.06]} position={[0, -1, 0]}>
        <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.5} />
      </Box>
    </>
  )
}

/** Non-controlled agent: idles with a gentle spin + bob. */
function IdleAgent({ agent, position }: { agent: Agent; position: [number, number, number] }) {
  const inner = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (inner.current) {
      inner.current.rotation.y = state.clock.elapsedTime * 0.5
      inner.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.2
    }
  })
  return (
    <group position={position}>
      <group ref={inner}>
        <AgentBody agent={agent} />
      </group>
      <AgentLabels agent={agent} />
    </group>
  )
}

/** The player-driven agent — WASD / arrow keys move it across the arena floor. */
function PlayerAgent({ agent }: { agent: Agent }) {
  const group = useRef<THREE.Group>(null)
  const keys = useRef<Set<string>>(new Set())
  const pos = useRef<[number, number, number]>([0, 0, 0])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keys.current.add(k)
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((_, delta) => {
    const k = keys.current
    let dx = 0
    let dz = 0
    if (k.has('w') || k.has('arrowup')) dz -= 1
    if (k.has('s') || k.has('arrowdown')) dz += 1
    if (k.has('a') || k.has('arrowleft')) dx -= 1
    if (k.has('d') || k.has('arrowright')) dx += 1

    if (dx !== 0 || dz !== 0) {
      const len = Math.hypot(dx, dz)
      const speed = 6 * delta
      pos.current[0] = THREE.MathUtils.clamp(pos.current[0] + (dx / len) * speed, -9, 9)
      pos.current[2] = THREE.MathUtils.clamp(pos.current[2] + (dz / len) * speed, -9, 9)
      if (group.current) group.current.rotation.y = Math.atan2(dx, dz)
    }
    // bob slightly while moving
    pos.current[1] = (dx !== 0 || dz !== 0) ? Math.abs(Math.sin(performance.now() * 0.01)) * 0.15 : 0
    group.current?.position.set(pos.current[0], pos.current[1], pos.current[2])
  })

  return (
    <group ref={group}>
      <AgentBody agent={agent} />
      <AgentLabels agent={agent} />
      {/* highlight ring marks the character you control */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]}>
        <ringGeometry args={[0.7, 0.85, 32]} />
        <meshStandardMaterial color="#e879f9" emissive="#e879f9" emissiveIntensity={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function GameArena() {
  const { agents, controlledAgentId } = useAgentStore()
  const idle = agents.filter((a) => a.id !== controlledAgentId)
  const player = agents.find((a) => a.id === controlledAgentId)

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
      {idle.map((agent, i) => (
        <IdleAgent
          key={agent.id}
          agent={agent}
          position={[
            Math.cos((i / Math.max(idle.length, 1)) * Math.PI * 2) * 4,
            0,
            Math.sin((i / Math.max(idle.length, 1)) * Math.PI * 2) * 4,
          ]}
        />
      ))}
      {player && <PlayerAgent key={player.id} agent={player} />}
      <OrbitControls makeDefault />
    </>
  )
}

export default function Game() {
  const {
    agents,
    gameState,
    setGameState,
    setScreen,
    nebiusApiKey,
    setNebiusApiKey,
    controlledAgentId,
    setControlledAgentId,
  } = useAgentStore()
  const [apiKey, setApiKey] = useState(nebiusApiKey)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const { runTurn, autoRun, isRunning, logs } = useGameLoop()
  const nebiusRef = useRef<NebiusClient | null>(null)

  const controlled = agents.find((a) => a.id === controlledAgentId)

  const connect = async (key: string) => {
    const trimmed = key.trim()
    if (!trimmed) {
      setConnectError('Enter a key to connect.')
      return
    }
    setIsConnecting(true)
    setConnectError(null)
    try {
      const client = new NebiusClient(trimmed)
      const ok = await client.testConnection()
      if (ok) {
        nebiusRef.current = client
        setNebiusApiKey(trimmed)
        setIsConnected(true)
      } else {
        setConnectError("The AI wouldn't connect. Double-check the key.")
      }
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Could not reach the AI.')
    } finally {
      setIsConnecting(false)
    }
  }

  // Auto-connect from the env-provided key so players never see a setup wall.
  useEffect(() => {
    if (nebiusApiKey && !isConnected && !isConnecting) {
      connect(nebiusApiKey)
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex">
      <div className="flex-1 relative">
        <ErrorBoundary
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-900 px-8 text-center">
              <div>
                <p className="text-3xl mb-2">🖥️</p>
                <p className="font-bold mb-1">The 3D arena couldn't start</p>
                <p className="text-sm text-gray-400 max-w-sm">
                  Your browser couldn't open 3D graphics (WebGL). Everything else
                  still works — try a different browser or turn on hardware
                  acceleration to see the characters move.
                </p>
              </div>
            </div>
          }
        >
          <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
            <Suspense fallback={null}>
              <GameArena />
            </Suspense>
          </Canvas>
        </ErrorBoundary>

        <div className="absolute top-4 left-4 bg-black/70 p-4 rounded-lg backdrop-blur">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setScreen('summon')}
              className="text-xs text-gray-400 hover:text-white"
              title="Back to summon"
            >
              ←
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Wonderful
            </h1>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <div>
              <div className="text-2xl font-bold text-emerald-300 leading-none">{gameState.score}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Score</div>
            </div>
            <div className="text-xs text-gray-300 space-y-0.5">
              <p>Round {gameState.turn} of {gameState.maxTurns}</p>
              <p>{agents.length} character{agents.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className={`w-2 h-2 rounded-full ${isInsforgeConfigured ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className="text-gray-400">
              {isInsforgeConfigured ? 'Progress saved to the cloud' : 'Saved on this device'}
            </span>
          </div>
        </div>

        {/* drive hint */}
        {controlled && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-lg backdrop-blur text-xs text-gray-200">
            Driving <span className="font-bold text-fuchsia-300">{controlled.name}</span> —
            use <kbd className="px-1 bg-gray-700 rounded">W</kbd>
            <kbd className="px-1 bg-gray-700 rounded mx-0.5">A</kbd>
            <kbd className="px-1 bg-gray-700 rounded">S</kbd>
            <kbd className="px-1 bg-gray-700 rounded ml-0.5">D</kbd> or arrow keys to move
          </div>
        )}

        <div className="absolute top-4 right-4 bg-black/70 p-4 rounded-lg backdrop-blur max-w-xs">
          <h3 className="font-bold mb-2">Party — click to drive</h3>
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setControlledAgentId(agent.id)}
              className={`w-full text-left text-xs mb-2 p-1.5 rounded transition ${
                agent.id === controlledAgentId ? 'bg-fuchsia-600/30 ring-1 ring-fuchsia-400/50' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex justify-between">
                <span className="font-semibold">
                  {agent.id === controlledAgentId && '🎮 '}
                  {agent.name}
                </span>
                <span className="text-gray-400">Lv.{agent.level}</span>
              </div>
              <div className="text-gray-500">{agent.skills.join(', ')}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-96 bg-gray-800 p-4 flex flex-col gap-4 overflow-y-auto">
        {/* The headline feature: chat with Claude from inside the game */}
        <ClaudeChat />

        {/* AI brain status — auto-connects from the env key, so most players
            never need to touch this. The key box only appears if that fails. */}
        {isConnected ? (
          <div className="bg-emerald-600/15 border border-emerald-500/30 p-2.5 rounded flex items-center gap-2 text-sm">
            <span className="text-lg">🧠</span>
            <span className="text-emerald-300 font-semibold">AI brain ready</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
          </div>
        ) : (
          <div className="bg-gray-700 p-3 rounded">
            <h2 className="font-bold mb-1">Waking up the AI…</h2>
            {isConnecting ? (
              <p className="text-xs text-gray-300">Connecting to the AI brain — one sec.</p>
            ) : (
              <>
                <p className="text-xs text-gray-300 mb-2">
                  The AI didn't connect automatically. Paste an AI key to turn the
                  characters' brains on.
                </p>
                <input
                  type="password"
                  placeholder="AI key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && connect(apiKey)}
                  className="w-full p-2 bg-gray-600 rounded text-sm mb-2"
                />
                <button
                  onClick={() => connect(apiKey)}
                  className="w-full p-2 rounded font-bold bg-blue-600 hover:bg-blue-500"
                >
                  Turn on the AI
                </button>
              </>
            )}
            {connectError && <p className="mt-2 text-xs text-red-400">{connectError}</p>}
          </div>
        )}

        <MeshyPanel />

        <Leaderboard />

        <div className="bg-gray-700 p-3 rounded">
          <h2 className="font-bold mb-2">Play</h2>
          {!isConnected && (
            <p className="text-xs text-amber-300 mb-2">Waiting for the AI to wake up…</p>
          )}
          {isConnected && agents.length === 0 && (
            <p className="text-xs text-amber-300 mb-2">Summon a character first (top-left ←).</p>
          )}
          <button
            onClick={runTurn}
            className="w-full p-2 bg-purple-600 hover:bg-purple-500 rounded font-bold mb-2 disabled:opacity-50"
            disabled={!isConnected || agents.length === 0 || isRunning}
          >
            {isRunning ? 'Thinking…' : '▶ Play a round'}
          </button>
          <button
            onClick={() => autoRun(10)}
            className="w-full p-2 bg-indigo-600 hover:bg-indigo-500 rounded font-bold mb-2 disabled:opacity-50"
            disabled={!isConnected || agents.length === 0 || isRunning}
          >
            ⏩ Auto-play 10 rounds
          </button>
          <button
            onClick={() => setGameState({ phase: 'lobby', turn: 0, score: 0 })}
            className="w-full p-2 bg-gray-600 hover:bg-gray-500 rounded font-bold"
          >
            ↺ Start over
          </button>
        </div>

        <div className="bg-gray-700 p-3 rounded flex-1">
          <h2 className="font-bold mb-2">What's happening</h2>
          <div className="h-48 overflow-y-auto text-xs space-y-1">
            {logs.length === 0 ? (
              <p className="text-gray-500">Hit “Play a round” and your characters will start making moves here.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-gray-300">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
