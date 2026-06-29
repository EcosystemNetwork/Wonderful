import { useAgentStore } from '../game/store'

const PILLARS = [
  { name: 'Nebius AI', desc: 'LLM brains for every agent', color: 'from-cyan-400 to-blue-500' },
  { name: 'InsForge', desc: 'Persistent memory & leaderboard', color: 'from-emerald-400 to-green-500' },
  { name: 'Meshy.ai', desc: '3D characters, rigged & animated', color: 'from-amber-400 to-orange-500' },
  { name: 'Claude Proxy', desc: 'Talk to the AI from inside the game', color: 'from-fuchsia-400 to-purple-500' },
]

export default function Landing() {
  const setScreen = useAgentStore((s) => s.setScreen)

  return (
    <div className="w-full h-screen bg-gray-950 text-white overflow-hidden relative flex flex-col items-center justify-center">
      {/* ambient gradient orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-purple-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-blue-600/20 blur-3xl" />

      <div className="relative z-10 text-center px-6 max-w-3xl">
        <p className="uppercase tracking-[0.3em] text-xs text-purple-300/80 mb-4">
          Wizard Hackathon 2026
        </p>
        <h1 className="text-7xl font-black mb-4 bg-gradient-to-r from-fuchsia-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
          Wonderful
        </h1>
        <p className="text-lg text-gray-300 mb-2">
          A self-improving AI agent game you can step inside.
        </p>
        <p className="text-sm text-gray-500 mb-10">
          Summon characters powered by real LLMs, drive one around the arena, and
          chat with the AI live — to shape the game from the inside out.
        </p>

        <button
          onClick={() => setScreen('summon')}
          className="px-10 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 transition shadow-lg shadow-purple-900/50"
        >
          Enter the Arena →
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-14">
          {PILLARS.map((p) => (
            <div
              key={p.name}
              className="bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur text-left"
            >
              <div className={`text-sm font-bold bg-gradient-to-r ${p.color} bg-clip-text text-transparent`}>
                {p.name}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 leading-tight">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
