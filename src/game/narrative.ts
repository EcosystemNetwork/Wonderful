import { NebiusClient, NEBIUS_CONFIG } from '../api/nebius'
import { Agent } from './types'

/**
 * Emergent narrative engine. Turns raw agent state into story — short narrative
 * beats, and "encounters" where two agents negotiate and ADAPT their strategies.
 * Maps to the colony pillars: Emergent Narrative + Negotiate and Adapt.
 *
 * All generation goes through Nebius (non-Meta models per project policy).
 */

export interface StoryBeat {
  id: string
  kind: 'beat' | 'encounter' | 'system'
  text: string
  /** Agents involved, for highlighting in the feed. */
  cast: string[]
  timestamp: number
}

function parseJSON<T>(content: string | null | undefined): T {
  if (!content) throw new Error('Empty narrative response')
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : content
  try {
    return JSON.parse(candidate) as T
  } catch {
    const span = candidate.match(/\{[\s\S]*\}/)
    if (span) return JSON.parse(span[0]) as T
    throw new Error('No JSON object in narrative response')
  }
}

let beatSeq = 0
function beatId(): string {
  beatSeq += 1
  return `beat-${Date.now()}-${beatSeq}`
}

export function systemBeat(text: string, cast: string[] = []): StoryBeat {
  return { id: beatId(), kind: 'system', text, cast, timestamp: Date.now() }
}

/** One ambient narrative beat capturing the colony's current mood. */
export async function narrateMoment(
  client: NebiusClient,
  agents: Agent[],
  recent: string[],
): Promise<StoryBeat> {
  const roster = agents
    .map((a) => `${a.name} (${a.role}, Lv.${a.level}) — ${a.strategy}`)
    .join('; ')

  const res = await client.getClient().chat.completions.create({
    model: NEBIUS_CONFIG.model,
    temperature: 0.9,
    max_tokens: 160,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are the narrator of an emergent AI-agent colony. Write vivid, concise ' +
          'world-flavored prose. One or two sentences. Return JSON {"beat": "..."}.',
      },
      {
        role: 'user',
        content: `Colony roster: ${roster || 'empty'}.\nRecent events: ${
          recent.slice(-5).join(' | ') || 'none'
        }.\nNarrate this moment in the colony.`,
      },
    ],
  })

  const { beat } = parseJSON<{ beat: string }>(res.choices[0].message.content)
  return { id: beatId(), kind: 'beat', text: beat, cast: agents.map((a) => a.name), timestamp: Date.now() }
}

export interface EncounterResult {
  beat: StoryBeat
  /** Optional adapted strategies keyed by agent id. */
  adapt: Record<string, string>
}

/**
 * Stage an encounter between two agents: they meet, negotiate or clash, and each
 * may ADAPT their strategy as a result. Returns a narrative beat + strategy diffs.
 */
export async function stageEncounter(
  client: NebiusClient,
  a: Agent,
  b: Agent,
): Promise<EncounterResult> {
  const res = await client.getClient().chat.completions.create({
    model: NEBIUS_CONFIG.model,
    temperature: 0.95,
    max_tokens: 320,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You dramatize encounters between two AI agents in an emergent colony game. ' +
          'They negotiate, trade, ally, or clash based on their roles and strategies, ' +
          'and EACH may adapt. Keep the scene to 2-3 sentences. Return JSON: ' +
          '{"scene": "...", "aStrategy": "new strategy for A or empty", "bStrategy": "new strategy for B or empty"}.',
      },
      {
        role: 'user',
        content:
          `Agent A — ${a.name} the ${a.role} (Lv.${a.level}). Strategy: "${a.strategy}". ` +
          `Personality: ${a.personality}.\n` +
          `Agent B — ${b.name} the ${b.role} (Lv.${b.level}). Strategy: "${b.strategy}". ` +
          `Personality: ${b.personality}.\n` +
          'They cross paths in the colony. Play out the encounter and how each adapts.',
      },
    ],
  })

  const out = parseJSON<{ scene: string; aStrategy?: string; bStrategy?: string }>(
    res.choices[0].message.content,
  )

  const adapt: Record<string, string> = {}
  if (out.aStrategy?.trim()) adapt[a.id] = out.aStrategy.trim()
  if (out.bStrategy?.trim()) adapt[b.id] = out.bStrategy.trim()

  return {
    beat: {
      id: beatId(),
      kind: 'encounter',
      text: out.scene,
      cast: [a.name, b.name],
      timestamp: Date.now(),
    },
    adapt,
  }
}
