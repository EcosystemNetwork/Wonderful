import { useState, useRef, useEffect } from 'react'
import { useAgentStore } from '../game/store'
import {
  testClaudeConnection,
  chatWithClaude,
  CLAUDE_PROXY_CONFIG,
  ChatMessage,
} from '../api/claude'
import { saveChatMessage, listChat } from '../api/insforge'
import { parseAiActions, executeAiActions, stripActionBlocks } from '../game/aiActions'

/** Builds a system prompt that drops Claude into the game with live context. */
function buildSystemPrompt(): string {
  const { agents, gameState, controlledAgentId } = useAgentStore.getState()
  const controlled = agents.find((a) => a.id === controlledAgentId)
  const party = agents
    .map((a) => `- ${a.name} (${a.role}, Lv.${a.level}) strategy: "${a.strategy}"`)
    .join('\n')

  return [
    'You are Claude, embedded INSIDE a browser game called "Wonderful" — a self-improving',
    'AI agent arena (React + Three.js, backed by Nebius for agent reasoning and InsForge',
    'for memory). You are reached through the Claude Code Proxy, so you are running on a',
    'Nebius model right now. The player is talking to you live from within the game.',
    '',
    'Your job: be a sharp, concrete collaborator. Help them understand and IMPROVE the game',
    'from the inside out — mechanics, balance, new features, what would make it more fun or',
    'more impressive as a hackathon entry. Be specific and brief; suggest concrete changes.',
    '',
    'You can ALSO change the game directly. When the player asks you to spawn, drive, or',
    'reconfigure characters, include exactly ONE fenced code block labelled `action`',
    'containing a JSON array of actions, in addition to a short normal reply. Actions:',
    '  {"type":"spawn","role":"warrior|mage|rogue|healer","name":"optional"}',
    '  {"type":"drive","target":"<character name or role>"}',
    '  {"type":"strategy","target":"<name or role>","strategy":"<new strategy text>"}',
    '  {"type":"dismiss","target":"<character name>"}',
    'Example reply: "On it — bringing in a defensive healer."',
    '```action',
    '[{"type":"spawn","role":"healer","name":"Sol"},{"type":"strategy","target":"Sol","strategy":"shield the weakest ally"}]',
    '```',
    'Only include the block when the player actually wants a change. Never fabricate a block',
    'for a question. Keep prose to a sentence or two.',
    '',
    'Live game state:',
    `- Phase: ${gameState.phase}, turn ${gameState.turn}/${gameState.maxTurns}, score ${gameState.score}`,
    `- Party (${agents.length}):`,
    party || '  (none yet)',
    `- Player is driving: ${controlled ? `${controlled.name} the ${controlled.role}` : 'nobody yet'}`,
  ].join('\n')
}

export default function ClaudeChat() {
  const { claudeConnected, setClaudeConnected, chat, addChat, clearChat } = useAgentStore()
  const [connecting, setConnecting] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [chat, sending])

  const connect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const ok = await testClaudeConnection()
      setClaudeConnected(ok)
      if (!ok) setError("Chat is offline right now — the AI chat helper isn't running.")
    } catch {
      setError("Chat is offline right now — the AI chat helper isn't running.")
      setClaudeConnected(false)
    } finally {
      setConnecting(false)
    }
  }

  // Try to connect automatically so players don't face a manual setup step.
  useEffect(() => {
    if (!claudeConnected) connect()
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore the persisted transcript once on mount (only if we don't already
  // have messages this session, so we never duplicate the live conversation).
  useEffect(() => {
    if (chat.length > 0) return
    let cancelled = false
    listChat().then((history) => {
      if (cancelled || chat.length > 0) return
      history.forEach((m) => addChat(m))
    })
    return () => {
      cancelled = true
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setError(null)
    const userMsg: ChatMessage = { role: 'user', content: text }
    const next: ChatMessage[] = [...chat, userMsg]
    addChat(userMsg)
    void saveChatMessage(userMsg)
    setSending(true)
    try {
      const reply = await chatWithClaude(next, buildSystemPrompt())
      // If Claude emitted an action block, apply it to the live game and show
      // a "✦ …" summary of what changed beneath its prose.
      const actions = parseAiActions(reply)
      const notes = actions.length ? executeAiActions(actions) : []
      const prose = stripActionBlocks(reply) || (notes.length ? 'Done.' : reply)
      const summary = notes.length ? `✦ ${notes.join(' · ')}` : ''
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: [prose, summary].filter(Boolean).join('\n\n'),
      }
      addChat(assistantMsg)
      void saveChatMessage(assistantMsg)
    } catch (e) {
      setError(String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-gray-700 p-3 rounded flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold">Talk to Claude</h2>
        <span className="flex items-center gap-1.5 text-xs">
          <span className={`w-2 h-2 rounded-full ${claudeConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
          <span className="text-gray-300">{claudeConnected ? 'connected' : 'offline'}</span>
        </span>
      </div>

      {!claudeConnected ? (
        <>
          <p className="text-[11px] text-gray-400 mb-2">
            {connecting
              ? 'Connecting to the AI chat…'
              : "The AI chat helper isn't running right now."}
          </p>
          <button
            onClick={connect}
            disabled={connecting}
            className="w-full p-2 rounded font-bold bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50"
          >
            {connecting ? 'Connecting…' : 'Try again'}
          </button>
          <p className="mt-1 text-[10px] text-gray-500">
            Developer note: start the proxy with{' '}
            <code className="text-gray-400">start_proxy.py</code> on :8083 ({CLAUDE_PROXY_CONFIG.baseUrl}).
          </p>
        </>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="h-56 overflow-y-auto space-y-2 mb-2 pr-1 text-sm"
          >
            {chat.length === 0 && (
              <p className="text-[11px] text-gray-500">
                Ask me anything about the game — e.g. "what should we add to make this more fun?"
              </p>
            )}
            {chat.map((m, i) => (
              <div
                key={i}
                className={`rounded px-2 py-1.5 ${
                  m.role === 'user'
                    ? 'bg-purple-600/30 ml-6'
                    : 'bg-gray-800 mr-6'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">
                  {m.role === 'user' ? 'You' : 'Claude'}
                </div>
                <div className="whitespace-pre-wrap text-gray-100">{m.content}</div>
              </div>
            ))}
            {sending && <div className="text-[11px] text-gray-500 mr-6">Claude is thinking…</div>}
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Message Claude…"
              className="flex-1 p-2 bg-gray-600 rounded text-sm outline-none"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="px-3 rounded font-bold bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50"
            >
              Send
            </button>
          </div>
          {chat.length > 0 && (
            <button onClick={clearChat} className="mt-1 text-[10px] text-gray-500 hover:text-gray-300 self-end">
              clear chat
            </button>
          )}
        </>
      )}

      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
    </div>
  )
}
