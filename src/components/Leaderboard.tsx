import { useEffect, useState, useCallback } from 'react'
import { topRuns, isInsforgeConfigured, type AgentRun } from '../api/insforge'
import { useAgentStore } from '../game/store'

const ROLE_COLOR: Record<string, string> = {
  warrior: 'text-red-400',
  mage: 'text-blue-400',
  rogue: 'text-green-400',
  healer: 'text-amber-400',
}

/**
 * Leaderboard — top runs pulled from the InsForge `agent_runs` table
 * (falls back to localStorage when InsForge isn't configured). Refreshes on
 * mount and whenever a game ends.
 */
export default function Leaderboard() {
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(false)
  const phase = useAgentStore((s) => s.gameState.phase)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setRuns(await topRuns(10))
    } finally {
      setLoading(false)
    }
  }, [])

  // Refetch on mount and each time a game ends.
  useEffect(() => {
    void refresh()
  }, [refresh, phase === 'ended'])

  return (
    <div className="bg-gray-700 p-3 rounded">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold">🏆 Leaderboard</h2>
        <button
          onClick={refresh}
          className="text-xs px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded"
        >
          {loading ? '…' : '↻'}
        </button>
      </div>

      {runs.length === 0 ? (
        <p className="text-xs text-gray-400">
          No runs yet — finish a game (reach the turn limit) to post a score.
        </p>
      ) : (
        <ol className="space-y-1 text-xs">
          {runs.map((r, i) => (
            <li
              key={r.id ?? `${r.agent_name}-${i}`}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="text-gray-500 w-4 text-right">{i + 1}.</span>
                <span className="truncate font-semibold">{r.agent_name}</span>
                <span className={`${ROLE_COLOR[r.agent_role] ?? 'text-gray-400'} shrink-0`}>
                  {r.agent_role}
                </span>
                <span className="text-gray-500 shrink-0">Lv.{r.level}</span>
              </span>
              <span className="font-mono text-cyan-300 shrink-0">{r.score}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-2 text-[10px] text-gray-500">
        {isInsforgeConfigured ? 'live from InsForge · agent_runs' : 'local mode'}
      </div>
    </div>
  )
}
