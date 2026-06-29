/**
 * ai-chat — server-side LLM proxy (InsForge edge function, Deno Subhosting).
 *
 * The browser NEVER sees a model-provider key. The game calls this function via
 * `insforge.functions.invoke('ai-chat', { body })`; the function calls OpenRouter
 * (the InsForge Model Gateway) with the server-held OPENROUTER_API_KEY and returns
 * the raw OpenAI-shaped completion so existing client code reads
 * `choices[0].message.content` unchanged.
 *
 * Cost guardrails (this endpoint spends real credits, so it self-limits):
 *   - model allowlist  → a caller can't request an expensive model to drain credits
 *   - max_tokens clamp → bounded output cost per call
 *   - payload caps     → bounded input cost per call
 * Per-project policy: NO Meta/Llama models — the allowlist is non-Meta only.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Cheap, non-Meta instruct models suitable for the agent game loop. The default
// is overridable via the OPENROUTER_CHAT_MODEL secret; extra ids can be added via
// the AI_ALLOWED_MODELS secret (comma-separated) without redeploying.
const BASE_ALLOWLIST = [
  'google/gemini-2.0-flash-lite-001',
  'google/gemini-flash-1.5-8b',
  'google/gemini-2.0-flash-001',
  'qwen/qwen-2.5-7b-instruct',
  'qwen/qwen3-30b-a3b',
  'mistralai/mistral-small',
  'mistralai/mistral-7b-instruct',
  'deepseek/deepseek-chat',
  'anthropic/claude-3-5-haiku',
]

const MAX_OUTPUT_TOKENS = 1024 // ceiling; game decisions ask for ~500
const MAX_MESSAGES = 24
const MAX_CHARS = 24_000 // total chars across all messages

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const key = Deno.env.get('OPENROUTER_API_KEY')
  if (!key) return json({ error: 'AI gateway not configured (missing OPENROUTER_API_KEY)' }, 503)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const messages = Array.isArray(body.messages) ? body.messages : null
  if (!messages || messages.length === 0) return json({ error: 'messages[] required' }, 400)
  if (messages.length > MAX_MESSAGES) return json({ error: 'too many messages' }, 413)

  const totalChars = messages.reduce(
    (n: number, m: { content?: unknown }) => n + (typeof m?.content === 'string' ? m.content.length : 0),
    0,
  )
  if (totalChars > MAX_CHARS) return json({ error: 'payload too large' }, 413)

  // Resolve model against the allowlist; anything else falls back to the default.
  const defaultModel = Deno.env.get('OPENROUTER_CHAT_MODEL') ?? 'google/gemini-2.0-flash-lite-001'
  const extra = (Deno.env.get('AI_ALLOWED_MODELS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const allowed = new Set([...BASE_ALLOWLIST, ...extra, defaultModel])
  const requested = typeof body.model === 'string' ? body.model : ''
  const model = allowed.has(requested) ? requested : defaultModel

  const maxTokens = Math.min(
    typeof body.max_tokens === 'number' ? body.max_tokens : 500,
    MAX_OUTPUT_TOKENS,
  )

  const payload: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
  }
  // response_format is opt-in (not every model honors it; the client parses tolerantly).
  if (body.response_format) payload.response_format = body.response_format

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // OpenRouter attribution headers (optional but recommended).
        'HTTP-Referer': Deno.env.get('OPENROUTER_REFERER') ?? 'https://wonderful.insforge.app',
        'X-Title': 'Wonderful',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = (data as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
      return json({ error: msg }, res.status)
    }
    return json(data, 200)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'gateway fetch failed' }, 502)
  }
}
