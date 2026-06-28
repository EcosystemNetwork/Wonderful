/**
 * Meshy.ai text-to-3D integration.
 *
 * Wraps the Meshy OpenAPI v2 text-to-3d endpoint: kick off a generation task,
 * poll it to completion, and hand back the resulting model URLs. The browser
 * talks to Meshy directly using a Vite-injected API key — fine for a hackathon
 * demo, but in production this should be proxied through a server so the key
 * isn't exposed.
 */

const MESHY_BASE = 'https://api.meshy.ai/openapi/v2/text-to-3d'

const API_KEY = import.meta.env.VITE_MESHY_API_KEY || ''

export const isMeshyConfigured = Boolean(API_KEY)

export type MeshyStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'

export interface MeshyTask {
  id: string
  status: MeshyStatus
  progress: number
  model_urls?: {
    glb?: string
    fbx?: string
    obj?: string
    usdz?: string
  }
  task_error?: { message: string }
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Start a preview text-to-3d task. Returns the task id used for polling.
 */
export async function createTextTo3dTask(prompt: string): Promise<string> {
  if (!isMeshyConfigured) {
    throw new Error('Meshy API key not configured (set VITE_MESHY_API_KEY)')
  }

  const res = await fetch(MESHY_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      mode: 'preview',
      prompt: `${prompt}, game character, stylized, low poly`,
      art_style: 'realistic',
      negative_prompt: 'nsfw, blurry, low quality, deformed',
      should_remesh: true,
      target_polycount: 10000,
    }),
  })

  if (!res.ok) {
    throw new Error(`Meshy create failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  // v2 returns the task id in `result`.
  const id = data.result ?? data.id
  if (!id) throw new Error('Meshy create returned no task id')
  return id
}

/**
 * Start a refine task that textures a finished preview model. Returns the new
 * task id (refine produces a fresh task, distinct from the preview task).
 */
export async function createRefineTask(previewTaskId: string): Promise<string> {
  if (!isMeshyConfigured) {
    throw new Error('Meshy API key not configured (set VITE_MESHY_API_KEY)')
  }

  const res = await fetch(MESHY_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      mode: 'refine',
      preview_task_id: previewTaskId,
      enable_pbr: true,
    }),
  })

  if (!res.ok) {
    throw new Error(`Meshy refine failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  const id = data.result ?? data.id
  if (!id) throw new Error('Meshy refine returned no task id')
  return id
}

/** Fetch the current state of a task. */
export async function getTask(id: string): Promise<MeshyTask> {
  const res = await fetch(`${MESHY_BASE}/${id}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) {
    throw new Error(`Meshy poll failed: ${res.status}`)
  }
  return res.json()
}

export type MeshyStage = 'preview' | 'refine'

export interface PollOptions {
  /** Called on every poll with 0-100 progress (and stage during a full generate). */
  onProgress?: (progress: number, status: MeshyStatus, stage?: MeshyStage) => void
  /** Milliseconds between polls. */
  intervalMs?: number
  /** Give up after this many milliseconds. */
  timeoutMs?: number
}

/**
 * Poll a task until it succeeds, fails, or times out. Resolves with the GLB
 * model URL on success.
 */
export async function pollUntilDone(id: string, opts: PollOptions = {}): Promise<string> {
  const { onProgress, intervalMs = 5000, timeoutMs = 5 * 60 * 1000 } = opts
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const task = await getTask(id)
    onProgress?.(task.progress ?? 0, task.status)

    if (task.status === 'SUCCEEDED') {
      const url = task.model_urls?.glb
      if (!url) throw new Error('Meshy task succeeded but returned no GLB URL')
      return url
    }
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(task.task_error?.message || `Meshy task ${task.status.toLowerCase()}`)
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error('Meshy task timed out')
}

export interface GenerateOptions extends PollOptions {
  /**
   * Run the refine pass after preview to produce a textured model. Defaults to
   * true; set false for fast, untextured geometry.
   */
  refine?: boolean
}

/**
 * Generate a model from a prompt and return the GLB URL once ready.
 *
 * By default this runs Meshy's two-stage flow: a `preview` pass for geometry,
 * then a `refine` pass that adds PBR textures. Progress is reported per stage.
 */
export async function generateModel(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const { refine = true, onProgress, ...pollOpts } = opts

  const previewId = await createTextTo3dTask(prompt)
  const previewUrl = await pollUntilDone(previewId, {
    ...pollOpts,
    onProgress: (p, s) => onProgress?.(p, s, 'preview'),
  })

  if (!refine) return previewUrl

  const refineId = await createRefineTask(previewId)
  return pollUntilDone(refineId, {
    ...pollOpts,
    onProgress: (p, s) => onProgress?.(p, s, 'refine'),
  })
}
