/**
 * In-game "Talk to Claude" chat — now served by the InsForge `ai-chat` gateway.
 *
 * Previously this talked to a localhost Claude Code Proxy on :8083 via the Vite
 * dev proxy — which does not exist in a deployed build. It now posts to the same
 * server-side edge function the rest of the game uses, requesting an Anthropic
 * model (Claude Haiku) by default so the in-game assistant really is Claude.
 * Override with VITE_CHAT_MODEL (must be on the gateway's allowlist).
 */
import { insforge } from './insforge'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Default chat model — an allowlisted Anthropic model on the gateway. */
const CHAT_MODEL = (import.meta.env.VITE_CHAT_MODEL as string) || 'anthropic/claude-3-5-haiku'

interface Completion {
  choices?: Array<{ message?: { content?: string | null } }>
}

async function gatewayChat(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): Promise<string> {
  if (!insforge) {
    throw new Error('AI chat unavailable: InsForge is not configured (set VITE_INSFORGE_URL / _ANON_KEY)')
  }
  const { data, error } = await insforge.functions.invoke('ai-chat', {
    body: { model: CHAT_MODEL, messages, max_tokens: maxTokens },
  })
  if (error) throw new Error(error.message || 'AI chat gateway error')
  return (data as Completion)?.choices?.[0]?.message?.content ?? ''
}

/**
 * Cheap round-trip to confirm the gateway + key are live. A non-throwing call
 * means the bridge works (we don't require non-empty text — some models can
 * spend the whole budget "thinking" and still return successfully).
 */
export async function testClaudeConnection(): Promise<boolean> {
  try {
    await gatewayChat([{ role: 'user', content: 'Reply with: OK' }], 16)
    return true
  } catch (e) {
    console.error('AI chat connection failed:', e)
    return false
  }
}

/**
 * Send a conversation (plus a system prompt with live game context) and return
 * the assistant's reply text. The system prompt is sent as a leading
 * `system`-role message, which the gateway forwards to OpenRouter.
 */
export async function chatWithClaude(messages: ChatMessage[], system: string): Promise<string> {
  const full = [{ role: 'system', content: system }, ...messages]
  const text = await gatewayChat(full, 1024)
  return text.trim() || '(no response)'
}
