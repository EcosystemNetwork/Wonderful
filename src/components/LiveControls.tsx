import { useAgentStore } from '../game/store'
import { useRealtimeSim } from '../game/realtime'
import { isAiConfigured } from '../api/aiGateway'

const ROLE_EMOJI: Record<string, string> = {
  warrior: '⚔️',
  mage: '🔮',
  rogue: '🗡️',
  healer: '✨',
}

/**
 * Controls + live activity ticker for the real-time simulation. Hitting GO LIVE
 * spins up an autonomous brain loop per agent (see game/realtime.ts); each acts
 * on its own clock and reacts to the others through the shared event feed.
 */
export default function LiveControls() {
  const { live, start, stop } = useRealtimeSim()
  const agents = useAgentStore((s) => s.agents)
  const situation = useAgentStore((s) => s.situation)
  const events = useAgentStore((s) => s.events)
  const thoughts = useAgentStore((s) => s.thoughts)

  // AI runs server-side through the gateway — no key needed, just a backend.
  const ready = agents.length > 0 && isAiConfigured
  const thinkingCount = agents.filter((a) => thoughts[a.id] === 'thinking').length
  const recent = [...events].slice(-8).reverse()

  return (
    <div className="bg-gray-700 p-3 rounded">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold">⚡ Live Mode</h2>
        {live && (
          <span className="flex items-center gap-1 text-xs text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {agents.length} minds · {thinkingCount} thinking
          </span>
        )}
      </div>

      <button
        onClick={live ? stop : start}
        disabled={!ready && !live}
        className={`w-full p-2 rounded font-bold disabled:opacity-50 transition-colors ${
          live
            ? 'bg-red-600 hover:bg-red-500'
            : 'bg-gradient-to-r from-fuchsia-600 to-emerald-600 hover:from-fuchsia-500 hover:to-emerald-500'
        }`}
      >
        {live ? '■ STOP SIMULATION' : '▶ GO LIVE'}
      </button>

      {!ready && !live && (
        <p className="mt-1 text-[10px] text-amber-400">
          {isAiConfigured
            ? 'Summon at least one agent first.'
            : 'Backend offline — set VITE_INSFORGE_URL / _ANON_KEY to enable the AI.'}
        </p>
      )}

      {live && (
        <>
          <div className="mt-2 text-[11px] text-fuchsia-200 italic border-l-2 border-fuchsia-500/50 pl-2">
            {situation}
          </div>
          <div className="mt-2 h-40 overflow-y-auto text-xs space-y-1 pr-1">
            {recent.length === 0 && (
              <div className="text-gray-400">Agents waking up…</div>
            )}
            {recent.map((e) => (
              <div key={e.id} className="text-gray-200 leading-snug">
                <span className="text-gray-400">{ROLE_EMOJI[e.role] ?? '•'} </span>
                <span className="font-semibold">{e.agentName}</span>{' '}
                <span className="text-gray-300">{e.action}</span>{' '}
                <span className="text-emerald-400">{Math.round(e.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
