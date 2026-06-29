import { insforge, isInsforgeConfigured } from './insforge'

/**
 * Whether LLM inference is available. The gateway lives behind the InsForge
 * `ai-chat` function, so "AI available" == "InsForge configured". UI gates that
 * used to check for a pasted Nebius key should check this instead.
 */
export const isAiConfigured = isInsforgeConfigured

/**
 * AI gateway client — the browser's single door to LLM inference.
 *
 * Instead of shipping a model-provider key to the browser (the old NebiusClient
 * did `dangerouslyAllowBrowser` + a VITE_ key), every call goes through the
 * `ai-chat` InsForge edge function, which holds OPENROUTER_API_KEY server-side.
 *
 * The shape mirrors NebiusClient (`getClient().chat.completions.create(...)`,
 * `model`, `testConnection()`) so it's a drop-in: existing agent/narrative code
 * doesn't care that the call now lands on a function instead of Nebius.
 *
 * The model is chosen by the server (its allowlist + default); the frontend can
 * suggest one via VITE_AI_MODEL, but the server has the final say on cost.
 */

interface ChatMessageParam {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface CreateParams {
  model?: string
  messages: ChatMessageParam[]
  temperature?: number
  max_tokens?: number
  response_format?: { type: string }
}

export interface ChatCompletion {
  choices: Array<{ message: { content: string | null } }>
  model?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/** Frontend hint for which gateway model to use; server validates against its allowlist. */
const SUGGESTED_MODEL = (import.meta.env.VITE_AI_MODEL as string | undefined) || undefined

async function gatewayCreate(params: CreateParams): Promise<ChatCompletion> {
  if (!insforge) {
    throw new Error('AI gateway unavailable: InsForge is not configured (set VITE_INSFORGE_URL / _ANON_KEY)')
  }
  // Override whatever provider-specific model id the caller passed with our
  // gateway suggestion (or undefined → let the server pick its default). This is
  // why callers can keep passing NEBIUS_CONFIG.model harmlessly.
  const body: CreateParams = { ...params, model: SUGGESTED_MODEL }

  const { data, error } = await insforge.functions.invoke('ai-chat', { body })
  if (error) throw new Error(error.message || 'AI gateway error')
  const completion = data as ChatCompletion
  if (!completion?.choices?.length) throw new Error('AI gateway returned no choices')
  return completion
}

/** A minimal OpenAI-compatible surface backed by the edge function. */
const shim = {
  chat: { completions: { create: gatewayCreate } },
}

export class GatewayClient {
  /** The model the frontend suggests (server may override). Empty = server default. */
  get model(): string {
    return SUGGESTED_MODEL ?? ''
  }

  /** Drop-in for NebiusClient.getClient(): returns the OpenAI-shaped shim. */
  getClient() {
    return shim
  }

  /** Cheap liveness probe: a non-throwing call means the gateway + key are live. */
  async testConnection(): Promise<boolean> {
    try {
      await gatewayCreate({
        messages: [{ role: 'user', content: 'Reply with: OK' }],
        max_tokens: 8,
      })
      return true
    } catch (e) {
      console.error('AI gateway connection failed:', e)
      return false
    }
  }
}

/** Convenience factory mirroring how NebiusClient was constructed at call sites. */
export function createGatewayClient(): GatewayClient {
  return new GatewayClient()
}
