import { useState } from 'react'
import { generateModel, isMeshyConfigured } from '../api/meshy'
import { storeCharacterModel, isInsforgeConfigured } from '../api/insforge'
import { useAgentStore } from '../game/store'

/**
 * MeshyPanel — generate a 3D character model via Meshy.ai and attach it to one
 * of the party's agents so it renders in the arena. Generated .glb models are
 * persisted to InsForge Storage so they outlive the temporary Meshy download
 * URL; if InsForge isn't configured we fall back to the ephemeral Meshy URL.
 */
export default function MeshyPanel() {
  const { agents, updateAgent } = useAgentStore()
  const [prompt, setPrompt] = useState('')
  const [targetId, setTargetId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')

  const generate = async () => {
    if (!prompt) return
    const agentId = targetId || agents[0]?.id
    if (!agentId) {
      setStatus('Summon an agent first')
      return
    }

    setGenerating(true)
    setStatus('Starting generation...')

    try {
      const meshyUrl = await generateModel(prompt, {
        onProgress: (p, _s, stage) =>
          setStatus(`${stage === 'refine' ? 'Texturing' : 'Sculpting'}... ${p}%`),
      })

      setStatus('Saving model to InsForge Storage...')
      const stored = await storeCharacterModel(prompt.slice(0, 24) || agentId, meshyUrl)

      updateAgent(agentId, { modelUrl: stored.url })
      setStatus(
        stored.backend === 'insforge'
          ? `✓ Stored in InsForge & attached: ${stored.key}`
          : '✓ Attached using Meshy URL (re-host skipped — InsForge off or CDN blocked it)',
      )
    } catch (err) {
      console.error('Meshy generation failed:', err)
      setStatus(`✗ ${err instanceof Error ? err.message : 'Generation failed'}`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-gray-700 p-3 rounded">
      <h2 className="font-bold mb-2">Meshy.ai 3D Characters</h2>

      {!isMeshyConfigured && (
        <p className="text-xs text-amber-400 mb-2">
          Set VITE_MESHY_API_KEY to enable generation.
        </p>
      )}

      <input
        type="text"
        placeholder="Describe character (e.g., 'cyberpunk warrior')"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full p-2 bg-gray-600 rounded text-sm mb-2"
      />

      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        className="w-full p-2 bg-gray-600 rounded text-sm mb-2"
        disabled={agents.length === 0}
      >
        {agents.length === 0 && <option value="">No agents — summon one first</option>}
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.role}){a.modelUrl ? ' • has model' : ''}
          </option>
        ))}
      </select>

      <button
        onClick={generate}
        disabled={generating || !prompt || !isMeshyConfigured || agents.length === 0}
        className="w-full p-2 bg-cyan-600 hover:bg-cyan-500 rounded font-bold disabled:opacity-50"
      >
        {generating ? 'Generating...' : 'Generate & Attach'}
      </button>

      {status && <div className="mt-2 text-xs text-cyan-300 break-words">{status}</div>}
      <div className="mt-1 text-xs text-gray-400">
        {isInsforgeConfigured ? 'InsForge Storage on' : 'local mode'}
      </div>
    </div>
  )
}
