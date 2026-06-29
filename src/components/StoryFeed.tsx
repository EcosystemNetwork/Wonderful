import { useState, useRef, useEffect, useMemo } from 'react'
import { useAgentStore } from '../game/store'
import { NebiusClient } from '../api/nebius'
import {
  StoryBeat,
  systemBeat,
  narrateMoment,
  stageEncounter,
} from '../game/narrative'

const KIND_STYLE: Record<StoryBeat['kind'], string> = {
  beat: 'border-l-2 border-blue-400/50',
  encounter: 'border-l-2 border-fuchsia-400/60',
  system: 'border-l-2 border-gray-500/40 text-gray-400',
}

/**
 * Emergent narrative panel. Generates ambient story beats and stages encounters
 * between agents (who then adapt their strategies). The "Living Colony" toggle
 * keeps weaving the story on a heartbeat so the world feels alive on its own.
 */
export default function StoryFeed() {
  const { agents, nebiusApiKey, updateAgent } = useAgentStore()
  const [beats, setBeats] = useState<StoryBeat[]>([])
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef(false)

  const client = useMemo(
    () => (nebiusApiKey ? new NebiusClient(nebiusApiKey) : null),
    [nebiusApiKey],
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [beats, busy])

  const push = (b: StoryBeat) => setBeats((prev) => [...prev.slice(-40), b])

  const pickTwo = () => {
    const pool = useAgentStore.getState().agents
    if (pool.length < 2) return null
    const i = Math.floor(Math.random() * pool.length)
    let j = Math.floor(Math.random() * pool.length)
    if (j === i) j = (j + 1) % pool.length
    return [pool[i], pool[j]] as const
  }

  const runEncounter = async () => {
    if (!client) return
    const pair = pickTwo()
    if (!pair) {
      push(systemBeat('Need at least two agents for an encounter.'))
      return
    }
    const result = await stageEncounter(client, pair[0], pair[1])
    push(result.beat)
    // Agents ADAPT — apply any new strategies the encounter produced.
    for (const [id, strategy] of Object.entries(result.adapt)) {
      updateAgent(id, { strategy })
      const who = useAgentStore.getState().agents.find((a) => a.id === id)
      if (who) push(systemBeat(`${who.name} adapted: "${strategy}"`, [who.name]))
    }
  }

  const weaveOnce = async () => {
    if (!client) {
      setError('Connect Nebius first to generate story.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      // Alternate ambient beats with encounters for variety.
      if (agents.length >= 2 && Math.random() < 0.6) {
        await runEncounter()
      } else {
        const recent = beats.slice(-5).map((b) => b.text)
        push(await narrateMoment(client, useAgentStore.getState().agents, recent))
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  // Living-colony heartbeat: keep weaving while `live` is on.
  useEffect(() => {
    liveRef.current = live
    if (!live) return
    let cancelled = false
    const tick = async () => {
      while (!cancelled && liveRef.current) {
        await weaveOnce()
        await new Promise((r) => setTimeout(r, 4500))
      }
    }
    tick()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live])

  return (
    <div className="bg-gray-700 p-3 rounded flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold">Colony Story</h2>
        <button
          onClick={() => setLive((v) => !v)}
          disabled={!client}
          className={`text-[11px] px-2 py-0.5 rounded font-semibold disabled:opacity-40 ${
            live ? 'bg-fuchsia-600 animate-pulse' : 'bg-gray-600 hover:bg-gray-500'
          }`}
          title="Keep the story weaving on its own"
        >
          {live ? '● LIVE' : 'Go Live'}
        </button>
      </div>

      <div ref={scrollRef} className="h-44 overflow-y-auto space-y-1.5 pr-1 text-xs">
        {beats.length === 0 && (
          <p className="text-[11px] text-gray-500">
            The colony is quiet. Weave a beat or go live to let the story unfold.
          </p>
        )}
        {beats.map((b) => (
          <div key={b.id} className={`pl-2 ${KIND_STYLE[b.kind]}`}>
            {b.kind === 'encounter' && <span className="text-fuchsia-300 font-semibold">⚔ </span>}
            <span className="text-gray-100">{b.text}</span>
          </div>
        ))}
        {busy && <div className="text-[11px] text-gray-500 italic">the colony stirs…</div>}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={weaveOnce}
          disabled={busy || !client}
          className="flex-1 p-1.5 rounded text-sm font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
        >
          Weave a beat
        </button>
        <button
          onClick={() => { setBusy(true); runEncounter().catch((e) => setError(String(e))).finally(() => setBusy(false)) }}
          disabled={busy || !client || agents.length < 2}
          className="flex-1 p-1.5 rounded text-sm font-bold bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50"
        >
          Stage encounter
        </button>
      </div>
      {!client && <p className="mt-1 text-[10px] text-gray-500">Connect Nebius to generate story.</p>}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  )
}
