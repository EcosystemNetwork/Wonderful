/**
 * Claude proxy client — talks to the Claude Code Proxy (Anthropic API format),
 * which converts requests to OpenAI-compatible and forwards them to Nebius.
 *
 * In the browser we go through the Vite dev-proxy (`/claude-proxy` → :8083) to
 * stay same-origin and avoid CORS. The `model` is a `claude-*` id only as a
 * routing hint — the proxy maps it to its configured BIG_MODEL on Nebius
 * (e.g. moonshotai/Kimi-K2.6). See docs/claude-code-proxy.md.
 */
export const CLAUDE_PROXY_CONFIG = {
  /** Same-origin path; Vite forwards it to http://localhost:8083. */
  baseUrl: import.meta.env.VITE_CLAUDE_PROXY_URL || '/claude-proxy',
  /** Dummy token — proxy runs with IGNORE_CLIENT_API_KEY=true. */
  authToken: 'claude-local',
  /** Routing hint; proxy maps claude-* → its Nebius BIG_MODEL. */
  model: 'claude-3-5-sonnet-20241022',
} as const

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>
  error?: { message?: string }
  detail?: string
}

function endpoint(): string {
  return `${CLAUDE_PROXY_CONFIG.baseUrl.replace(/\/$/, '')}/v1/messages`
}

async function postMessages(body: Record<string, unknown>): Promise<AnthropicResponse> {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': CLAUDE_PROXY_CONFIG.authToken,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: CLAUDE_PROXY_CONFIG.model, ...body }),
  })
  const data = (await res.json().catch(() => ({}))) as AnthropicResponse
  if (!res.ok) {
    const msg = data.error?.message || data.detail || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

function extractText(data: AnthropicResponse): string {
  return (data.content || [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('')
    .trim()
}

/**
 * Cheap round-trip to confirm the proxy + Nebius key are live. A non-throwing
 * HTTP 200 means the bridge works — note reasoning models (Kimi) can spend the
 * whole token budget "thinking" and return EMPTY text on a successful call, so
 * we must NOT require non-empty text here, only that the request didn't error.
 */
export async function testClaudeConnection(): Promise<boolean> {
  try {
    await postMessages({
      max_tokens: 64,
      messages: [{ role: 'user', content: 'Reply with: OK' }],
    })
    return true
  } catch (e) {
    console.error('Claude proxy connection failed:', e)
    return false
  }
}

/**
 * Send a conversation (plus a system prompt with live game context) and return
 * the assistant's reply text. Messages must start with `user` and alternate.
 */
export async function chatWithClaude(
  messages: ChatMessage[],
  system: string,
): Promise<string> {
  const data = await postMessages({
    max_tokens: 1024,
    system,
    messages,
  })
  return extractText(data) || '(no response)'
}
