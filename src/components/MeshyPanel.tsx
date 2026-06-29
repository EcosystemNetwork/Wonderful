import { useState } from 'react'
import { generateModel, isMeshyConfigured } from '../api/meshy'
import { storeCharacterModel, saveAgent } from '../api/insforge'
import { useAgentStore } from '../game/store'

/**
 * MeshyPanel — turn a sentence into a real 3D character and drop it onto one of
 * the player's party members. Written for non-technical players: plain language,
 * example prompts, a live preview, and visible (not console-only) errors.
 */
const EXAMPLES = ['a cute round slime', 'a cyberpunk knight', 'a fluffy fox warrior', 'a stone golem']

export default function MeshyPanel() {
  const { agents, updateAgent, controlledAgentId } = useAgentStore()
  const [prompt, setPrompt] = useState('')
  const [targetId, setTargetId] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stageLabel, setStageLabel] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Default to the character the player is driving.
  const effectiveTarget = targetId || controlledAgentId || agents[0]?.id || ''
  const targetAgent = agents.find((a) => a.id === effectiveTarget)

  const create = async () => {
    if (!prompt.trim() || !effectiveTarget) return
    setBusy(true)
    setError(null)
    setDone(false)
    setPreview(null)
    setProgress(0)
    setStageLabel('Getting started…')

    try {
      const meshyUrl = await generateModel(prompt.trim(), {
        onProgress: (p, _s, stage) => {
          setProgress(p)
          setStageLabel(stage === 'refine' ? 'Painting on the colors…' : 'Sculpting the shape…')
        },
        onPreview: (thumb) => setPreview(thumb),
      })

      setStageLabel('Adding it to the arena…')
      const stored = await storeCharacterModel(prompt.trim().slice(0, 24) || effectiveTarget, meshyUrl)
      updateAgent(effectiveTarget, { modelUrl: stored.url })
      // Persist the model→agent link so the same 3D character returns next session.
      const updated = useAgentStore.getState().agents.find((a) => a.id === effectiveTarget)
      if (updated) void saveAgent(updated, stored.url)
      setDone(true)
      setStageLabel('')
    } catch (err) {
      setError(
        err instanceof Error && /timed out/i.test(err.message)
          ? "That took too long and timed out. Try a simpler description."
          : "Couldn't make that one. Try again or tweak the description.",
      )
      console.error('Meshy generation failed:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-gray-700 p-3 rounded">
      <h2 className="font-bold mb-0.5">🎨 Make a 3D character</h2>
      <p className="text-[11px] text-gray-400 mb-2">
        Describe a look and we'll build it{targetAgent ? <> for <span className="text-gray-200">{targetAgent.name}</span></> : null}.
      </p>

      {!isMeshyConfigured ? (
        <p className="text-xs text-amber-400">
          Add a Meshy key (VITE_MESHY_API_KEY) to turn this on.
        </p>
      ) : agents.length === 0 ? (
        <p className="text-xs text-amber-300">Summon a character first, then come back here.</p>
      ) : (
        <>
          <input
            type="text"
            placeholder="e.g. a cyberpunk knight"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !busy && create()}
            disabled={busy}
            className="w-full p-2 bg-gray-600 rounded text-sm mb-2 disabled:opacity-60"
          />

          {/* one-tap example prompts so nobody faces a blank box */}
          <div className="flex flex-wrap gap-1 mb-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                disabled={busy}
                className="text-[10px] px-2 py-0.5 rounded-full bg-gray-600 hover:bg-gray-500 text-gray-200 disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* pick who gets it — only when there's a choice to make */}
          {agents.length > 1 && (
            <select
              value={effectiveTarget}
              onChange={(e) => setTargetId(e.target.value)}
              disabled={busy}
              className="w-full p-2 bg-gray-600 rounded text-sm mb-2 disabled:opacity-60"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  Give it to {a.name}{a.modelUrl ? ' (replace current)' : ''}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={create}
            disabled={busy || !prompt.trim()}
            className="w-full p-2 bg-cyan-600 hover:bg-cyan-500 rounded font-bold disabled:opacity-50"
          >
            {busy ? 'Making it…' : '✨ Create it'}
          </button>

          {/* progress + live preview while it builds (~2–3 min) */}
          {busy && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-gray-300 mb-1">
                <span>{stageLabel}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-600 rounded overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-500"
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>
              {preview ? (
                <img src={preview} alt="preview" className="mt-2 w-full rounded border border-white/10" />
              ) : (
                <p className="mt-2 text-[10px] text-gray-500">
                  This takes a couple of minutes — a preview will pop up here.
                </p>
              )}
            </div>
          )}

          {done && (
            <div className="mt-3 text-sm text-emerald-300">
              <p className="font-semibold">✓ Done — look at the arena!</p>
              <p className="text-[11px] text-emerald-400/80">
                {targetAgent?.name} now wears your new look.
              </p>
              {preview && (
                <img src={preview} alt="your character" className="mt-2 w-full rounded border border-emerald-400/20" />
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  )
}
