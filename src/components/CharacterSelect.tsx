import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useAgentStore } from '../game/store'
import { Agent } from '../game/types'
import { loadParty } from '../api/insforge'
import ErrorBoundary from './ErrorBoundary'

const ROLE: Record<Agent['role'], { emoji: string; color: string; blurb: string }> = {
  warrior: { emoji: '⚔️', color: '#ef4444', blurb: 'High strength. Leads the charge.' },
  mage: { emoji: '🔮', color: '#3b82f6', blurb: 'High intelligence. Bends the rules.' },
  rogue: { emoji: '🗡️', color: '#22c55e', blurb: 'High agility. Strikes from the dark.' },
  healer: { emoji: '✨', color: '#f59e0b', blurb: 'High wisdom. Keeps the party alive.' },
}

/** Rotating Meshy model on the pedestal. Suspends while loading. */
function PreviewModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const model = useMemo(() => scene.clone(), [scene])
  const ref = useRef<THREE.Group>(null)
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.6
  })
  return (
    <group ref={ref} position={[0, -1, 0]}>
      <primitive object={model} scale={1.4} />
    </group>
  )
}

/** Fallback body when a character has no model yet (or it fails to load). */
function PreviewOrb({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((s, d) => {
    if (!ref.current) return
    ref.current.rotation.y += d * 0.6
    ref.current.position.y = Math.sin(s.clock.elapsedTime * 1.5) * 0.1
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.9, 48, 48]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.3} />
    </mesh>
  )
}

function Pedestal({ color }: { color: string }) {
  return (
    <>
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[1.1, 1.35, 0.3, 48]} />
        <meshStandardMaterial color="#15131f" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.03, 0]}>
        <ringGeometry args={[1.15, 1.38, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

function CharacterPreview({ agent }: { agent: Agent }) {
  const color = ROLE[agent.role].color
  return (
    <Canvas camera={{ position: [0, 1, 4.6], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <spotLight position={[3, 6, 4]} intensity={1.4} angle={0.6} penumbra={0.5} />
      <pointLight position={[-4, 2, -2]} intensity={0.6} color={color} />
      <ErrorBoundary fallback={<PreviewOrb color={color} />}>
        <Suspense fallback={<PreviewOrb color={color} />}>
          {agent.modelUrl ? <PreviewModel url={agent.modelUrl} /> : <PreviewOrb color={color} />}
        </Suspense>
      </ErrorBoundary>
      <Pedestal color={color} />
    </Canvas>
  )
}

export default function CharacterSelect() {
  const agents = useAgentStore((s) => s.agents)
  const addAgent = useAgentStore((s) => s.addAgent)
  const removeAgent = useAgentStore((s) => s.removeAgent)
  const controlledAgentId = useAgentStore((s) => s.controlledAgentId)
  const setControlledAgentId = useAgentStore((s) => s.setControlledAgentId)
  const setScreen = useAgentStore((s) => s.setScreen)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const hydrated = useRef(false)

  // Pull the player's saved characters (InsForge → localStorage) into the store.
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    if (useAgentStore.getState().agents.length > 0) return
    loadParty().then((party) => {
      if (useAgentStore.getState().agents.length > 0) return
      party.forEach((a) => addAgent(a))
    })
  }, [addAgent])

  const selected = agents.find((a) => a.id === (selectedId ?? controlledAgentId)) ?? agents[0] ?? null

  const enter = () => {
    if (!selected) return
    setControlledAgentId(selected.id)
    setScreen('game')
  }

  // Empty state — funnel straight into creation; you can't enter without one.
  if (agents.length === 0) {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-gray-950 via-[#0d0b1a] to-black text-white flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-6xl font-black mb-3 bg-gradient-to-r from-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
          Wonderful
        </h1>
        <p className="text-gray-400 mb-8 max-w-md">
          A living world of autonomous AI heroes. Forge your first character to step inside.
        </p>
        <button
          onClick={() => setScreen('summon')}
          className="px-8 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 transition"
        >
          ✨ Create your first character →
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-gradient-to-b from-gray-950 via-[#0d0b1a] to-black text-white flex">
      {/* Stage — rotating preview of the highlighted character */}
      <div className="flex-1 relative">
        <div className="absolute top-6 left-6 z-10">
          <h1 className="text-2xl font-black bg-gradient-to-r from-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
            Wonderful
          </h1>
          <p className="text-xs text-gray-400">Choose your hero</p>
        </div>

        {selected && <CharacterPreview key={selected.id} agent={selected} />}

        {selected && (
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center pointer-events-none">
            <div className="text-3xl font-black drop-shadow-lg">{selected.name}</div>
            <div className="text-sm text-gray-300 capitalize mb-2">
              {ROLE[selected.role].emoji} {selected.role} · Lv.{selected.level}
              {selected.clearance > 0 && <span className="text-fuchsia-300"> · 🔑 clearance {selected.clearance}</span>}
            </div>
            <div className="w-56 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${Math.min(100, (selected.xp / (selected.level * 100)) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-gray-500 mt-1 max-w-xs text-center px-4">
              {ROLE[selected.role].blurb}
            </div>
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="w-96 bg-black/40 backdrop-blur-md border-l border-white/10 p-5 flex flex-col">
        <h2 className="font-bold text-gray-300 mb-3">
          Your characters <span className="text-gray-500">({agents.length})</span>
        </h2>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {agents.map((a) => {
            const meta = ROLE[a.role]
            const active = selected?.id === a.id
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                  active
                    ? 'border-fuchsia-400/80 bg-fuchsia-500/10 ring-1 ring-fuchsia-400/50'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span
                  className="grid place-items-center w-10 h-10 rounded-lg text-xl shrink-0"
                  style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
                >
                  {meta.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold truncate">{a.name}</span>
                  <span className="block text-xs text-gray-400 capitalize">
                    {a.role} · Lv.{a.level}
                    {a.modelUrl && <span className="text-cyan-400"> · 3D</span>}
                  </span>
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    removeAgent(a.id)
                    if (selected?.id === a.id) setSelectedId(null)
                  }}
                  className="text-gray-600 hover:text-red-400 text-sm px-1"
                  title="Delete character"
                >
                  ✕
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setScreen('summon')}
          className="mt-3 w-full py-3 rounded-xl font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
        >
          ✨ Create new character
        </button>
        <button
          onClick={enter}
          disabled={!selected}
          className="mt-2 w-full py-4 rounded-xl text-lg font-black bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Enter World →
        </button>
      </div>
    </div>
  )
}
