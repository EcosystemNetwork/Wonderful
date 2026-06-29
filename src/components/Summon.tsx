import { useState } from 'react'
import { useAgentStore } from '../game/store'
import { Agent } from '../game/types'

const ROLES: {
  role: Agent['role']
  blurb: string
  color: string
  emoji: string
}[] = [
  { role: 'warrior', blurb: 'High strength. Leads the charge.', color: 'border-red-500/60 bg-red-500/10', emoji: '⚔️' },
  { role: 'mage', blurb: 'High intelligence. Bends the rules.', color: 'border-blue-500/60 bg-blue-500/10', emoji: '🔮' },
  { role: 'rogue', blurb: 'High agility. Strikes from the dark.', color: 'border-green-500/60 bg-green-500/10', emoji: '🗡️' },
  { role: 'healer', blurb: 'High wisdom. Keeps the party alive.', color: 'border-amber-500/60 bg-amber-500/10', emoji: '✨' },
]

/** Builds a fresh level-1 agent. Creation is local — no API needed. */
export function makeAgent(name: string, role: Agent['role']): Agent {
  return {
    id: `agent-${Date.now()}-${Math.floor(performance.now())}`,
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
}

export default function Summon() {
  const { agents, addAgent, removeAgent, setScreen } = useAgentStore()
  const [role, setRole] = useState<Agent['role']>('warrior')
  const [name, setName] = useState('')

  const summon = () => {
    const finalName =
      name.trim() ||
      `${role.charAt(0).toUpperCase() + role.slice(1)}-${Date.now().toString(36).slice(-4)}`
    addAgent(makeAgent(finalName, role))
    setName('')
  }

  return (
    <div className="w-full h-screen bg-gray-950 text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <button
          onClick={() => setScreen('landing')}
          className="text-sm text-gray-400 hover:text-white mb-6"
        >
          ← Back
        </button>

        <h1 className="text-4xl font-black mb-1 bg-gradient-to-r from-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
          Summon your party
        </h1>
        <p className="text-gray-400 mb-8 text-sm">
          Pick a class, name your character, and summon. Add as many as you like —
          you'll drive one and the rest fight alongside it.
        </p>

        {/* class picker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {ROLES.map((r) => (
            <button
              key={r.role}
              onClick={() => setRole(r.role)}
              className={`text-left p-4 rounded-xl border transition ${r.color} ${
                role === r.role ? 'ring-2 ring-white/70' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <div className="text-2xl mb-1">{r.emoji}</div>
              <div className="font-bold capitalize">{r.role}</div>
              <div className="text-[11px] text-gray-300 mt-1 leading-tight">{r.blurb}</div>
            </button>
          ))}
        </div>

        {/* name + summon */}
        <div className="flex gap-2 mb-10">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && summon()}
            placeholder={`Name your ${role} (optional)`}
            className="flex-1 p-3 bg-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={summon}
            className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 transition capitalize"
          >
            Summon {role}
          </button>
        </div>

        {/* party */}
        <h2 className="font-bold mb-3 text-gray-300">
          Your party {agents.length > 0 && <span className="text-gray-500">({agents.length})</span>}
        </h2>
        {agents.length === 0 ? (
          <p className="text-sm text-gray-600 mb-8">No characters yet — summon at least one to enter.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
            {agents.map((a) => (
              <div key={a.id} className="bg-gray-800/70 rounded-lg p-3 flex justify-between items-start">
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs text-gray-400 capitalize">
                    {ROLES.find((r) => r.role === a.role)?.emoji} {a.role} · Lv.{a.level}
                  </div>
                </div>
                <button
                  onClick={() => removeAgent(a.id)}
                  className="text-gray-500 hover:text-red-400 text-sm"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setScreen('game')}
          disabled={agents.length === 0}
          className="w-full py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Enter the Arena →
        </button>
      </div>
    </div>
  )
}
