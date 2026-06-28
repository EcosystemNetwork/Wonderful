import { useState } from 'react'

/**
 * MeshyCharacterGenerator - UI for generating 3D characters via Meshy.ai
 */
export default function MeshyPanel() {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [models, setModels] = useState<string[]>([])

  const generateCharacter = async () => {
    if (!prompt) return
    setGenerating(true)

    try {
      const response = await fetch('https://api.meshy.ai/openapi/v1/text-to-3d', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_MESHY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'preview',
          prompt: `${prompt}, game character, stylized, low poly`,
          art_style: 'low-poly',
          negative_prompt: 'nsfw, blurry, low quality',
        }),
      })

      const data = await response.json()
      if (data.result) {
        setModels(prev => [...prev, data.result])
        pollForModel(data.result)
      }
    } catch (err) {
      console.error('Meshy generation failed:', err)
    } finally {
      setGenerating(false)
    }
  }

  const pollForModel = async (taskId: string) => {
    const check = async () => {
      const res = await fetch(`https://api.meshy.ai/openapi/v1/text-to-3d/${taskId}`, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_MESHY_API_KEY}` },
      })
      const data = await res.json()
      if (data.status === 'SUCCEEDED') {
        console.log('Model ready:', data.model_url)
      } else if (data.status === 'IN_PROGRESS') {
        setTimeout(check, 5000)
      }
    }
    check()
  }

  return (
    <div className="bg-gray-700 p-3 rounded">
      <h2 className="font-bold mb-2">Meshy.ai 3D Characters</h2>
      <input
        type="text"
        placeholder="Describe character (e.g., 'cyberpunk warrior')"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full p-2 bg-gray-600 rounded text-sm mb-2"
      />
      <button
        onClick={generateCharacter}
        disabled={generating || !prompt}
        className="w-full p-2 bg-cyan-600 hover:bg-cyan-500 rounded font-bold disabled:opacity-50"
      >
        {generating ? 'Generating...' : 'Generate 3D Character'}
      </button>
      {models.length > 0 && (
        <div className="mt-2 text-xs text-gray-300">
          {models.length} model(s) generated
        </div>
      )}
    </div>
  )
}
