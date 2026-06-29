import { GatewayClient } from '../api/aiGateway'
import { Agent } from './types'

/**
 * Player crafting system — the colony's "Player Crafted Items" pillar.
 *
 * Loop: scavenge raw MATERIALS → forge them into an ITEM whose rarity is earned
 * from what you put in → equip items into slots on a colonist → matching items
 * grant SET bonuses. Nebius supplies the flavor (name, lore, passive); the
 * numbers are computed locally so balance stays sane regardless of the model.
 *
 * Lives entirely in its own module + store ([[craftStore]]) so it never touches
 * the shared game store/types.
 */

export type StatKey = keyof Agent['stats']
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical'
export type Slot = 'weapon' | 'armor' | 'trinket' | 'relic'

export const STATS: StatKey[] = ['strength', 'intelligence', 'agility', 'wisdom']
export const SLOTS: Slot[] = ['weapon', 'armor', 'trinket', 'relic']
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical']

export const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythical: 5,
}

export const MAX_RANK = 5

export const RARITY_COLOR: Record<Rarity, string> = {
  common: 'text-gray-300',
  uncommon: 'text-emerald-300',
  rare: 'text-blue-300',
  epic: 'text-fuchsia-300',
  legendary: 'text-amber-300',
  mythical: 'text-rose-400',
}

/**
 * Gear progression gate: a colonist starts able to forge only COMMON gear and
 * unlocks higher tiers as it levels (and as the artificer's craft level rises),
 * climbing all the way to MYTHICAL. This is what makes players "work their way up".
 */
export function maxRarityRank(agentLevel: number, craftLevel: number): number {
  const fromLevel = Math.floor((Math.max(1, agentLevel) - 1) / 3) // L1→0,L4→1,L7→2,L10→3,L13→4,L16→5
  const fromCraft = Math.floor((Math.max(1, craftLevel) - 1) / 4)
  return Math.max(0, Math.min(MAX_RANK, fromLevel + fromCraft))
}

export function maxRarityFor(agentLevel: number, craftLevel: number): Rarity {
  return RARITIES[maxRarityRank(agentLevel, craftLevel)]
}

export const SLOT_ICON: Record<Slot, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  trinket: '💍',
  relic: '🔮',
}

export interface Material {
  id: string
  name: string
  icon: string
  rarity: Rarity
}

/** The raw materials you scavenge and forge with. */
export const MATERIALS: Material[] = [
  { id: 'scrap', name: 'Scrap Metal', icon: '⛓️', rarity: 'common' },
  { id: 'fiber', name: 'Synth Fiber', icon: '🧵', rarity: 'common' },
  { id: 'circuit', name: 'Salvaged Circuit', icon: '🔌', rarity: 'uncommon' },
  { id: 'ember', name: 'Ember Core', icon: '🔥', rarity: 'uncommon' },
  { id: 'alloy', name: 'Star Alloy', icon: '🪙', rarity: 'rare' },
  { id: 'rune', name: 'Glyph Rune', icon: '🔣', rarity: 'rare' },
  { id: 'voidshard', name: 'Void Shard', icon: '🟣', rarity: 'epic' },
  { id: 'aether', name: 'Aether Mote', icon: '✨', rarity: 'legendary' },
]

export const MATERIAL_BY_ID: Record<string, Material> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, m]),
)

export interface ItemEffect {
  stat: StatKey
  amount: number
}

export interface CraftedItem {
  id: string
  name: string
  slot: Slot
  rarity: Rarity
  description: string
  passive?: string
  setName?: string
  grantsSkill?: string
  effects: ItemEffect[]
  /** material ids consumed to make it (for display/lore). */
  madeFrom: string[]
  /** times this item has been fused/upgraded. */
  upgradeLevel?: number
}

/** Which stat each role cares about most — used for auto-equip scoring. */
export const ROLE_PRIMARY: Record<Agent['role'], StatKey> = {
  warrior: 'strength',
  mage: 'intelligence',
  rogue: 'agility',
  healer: 'wisdom',
}

/** A discovered blueprint: a remembered recipe you can re-craft on demand. */
export interface Blueprint {
  id: string
  name: string
  slot: Slot
  rarity: Rarity
  /** sorted material ids the recipe consumes. */
  materialSig: string[]
  /** frozen template the item is stamped from. */
  template: Omit<CraftedItem, 'id'>
}

/** Stable signature for a (slot, materials) combo, so recipes dedupe. */
export function blueprintSig(slot: Slot, materialIds: string[]): string {
  return `${slot}:${[...materialIds].sort().join('+')}`
}

let stampSeq = 0
function stampId(prefix: string): string {
  stampSeq += 1
  return `${prefix}-${Date.now()}-${stampSeq}`
}

/** Freeze a forged item into a reusable blueprint. */
export function blueprintFromItem(item: CraftedItem): Blueprint {
  const { id: _id, ...template } = item
  return {
    id: stampId('bp'),
    name: item.name,
    slot: item.slot,
    rarity: item.rarity,
    materialSig: [...item.madeFrom].sort(),
    template: structuredCloneItem(template),
  }
}

/** Mint a fresh item instance from a blueprint. */
export function itemFromBlueprint(bp: Blueprint): CraftedItem {
  return { ...structuredCloneItem(bp.template), id: stampId('item') }
}

function structuredCloneItem(t: Omit<CraftedItem, 'id'>): Omit<CraftedItem, 'id'> {
  return { ...t, effects: t.effects.map((e) => ({ ...e })), madeFrom: [...t.madeFrom] }
}

/** How well an item suits a role — primary stat counts double. */
export function scoreItemForRole(item: CraftedItem, role: Agent['role']): number {
  const primary = ROLE_PRIMARY[role]
  return item.effects.reduce((sum, e) => sum + e.amount * (e.stat === primary ? 2 : 1), 0)
}

const FUSION_CAP: Record<number, number> = { 0: 3, 1: 4, 2: 6, 3: 8, 4: 12, 5: 18 }

/**
 * Fuse two same-slot items into one stronger item: rarity climbs (and bumps an
 * extra tier when both inputs share rarity), effects merge, and the richer item's
 * passive/set/skill carry over. Returns the new item; callers consume the inputs.
 */
export function fuseItems(a: CraftedItem, b: CraftedItem): CraftedItem {
  const rankA = RARITY_RANK[a.rarity]
  const rankB = RARITY_RANK[b.rarity]
  let rank = Math.max(rankA, rankB)
  if (rankA === rankB) rank += 1
  rank = Math.min(MAX_RANK, rank)
  const rarity = RARITIES[rank]

  // merge effects by stat, clamp to the fusion cap for the new rarity
  const merged = new Map<StatKey, number>()
  for (const e of [...a.effects, ...b.effects]) {
    merged.set(e.stat, Math.min(FUSION_CAP[rank], (merged.get(e.stat) || 0) + e.amount))
  }
  // keep the strongest N effects for the new rarity
  const count = EFFECT_COUNT[rank]
  const effects = [...merged]
    .map(([stat, amount]) => ({ stat, amount }))
    .sort((x, y) => y.amount - x.amount)
    .slice(0, count)

  const richer = rankA >= rankB ? a : b
  const other = richer === a ? b : a
  const upgradeLevel = (a.upgradeLevel || 0) + (b.upgradeLevel || 0) + 1

  return {
    id: stampId('item'),
    name: stripUpgradeSuffix(richer.name),
    slot: a.slot,
    rarity,
    description: richer.description || other.description,
    passive: richer.passive || other.passive,
    setName: richer.setName || other.setName,
    grantsSkill: richer.grantsSkill || other.grantsSkill,
    effects,
    madeFrom: [...new Set([...a.madeFrom, ...b.madeFrom])],
    upgradeLevel,
  }
}

function stripUpgradeSuffix(name: string): string {
  return name.replace(/\s*\+\d+$/, '')
}

/** Display name including any upgrade tier, e.g. "Aegis Cloak +2". */
export function displayName(item: CraftedItem): string {
  return item.upgradeLevel ? `${item.name} +${item.upgradeLevel}` : item.name
}

/** Salvaging an item returns a fraction of comparable materials. */
export function salvageYield(item: CraftedItem): string[] {
  const rank = RARITY_RANK[item.rarity]
  const pool = MATERIALS.filter((m) => RARITY_RANK[m.rarity] <= rank)
  const n = 1 + Math.floor(rank / 2)
  return Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)].id)
}

const EFFECT_COUNT: Record<number, number> = { 0: 1, 1: 1, 2: 2, 3: 2, 4: 3, 5: 4 }
const BASE_AMOUNT: Record<number, number> = { 0: 1, 1: 2, 2: 2, 3: 3, 4: 4, 5: 6 }

function parseJSON<T>(content: string | null | undefined): T {
  if (!content) throw new Error('Empty crafting response')
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : content
  try {
    return JSON.parse(candidate) as T
  } catch {
    const span = candidate.match(/\{[\s\S]*\}/)
    if (span) return JSON.parse(span[0]) as T
    throw new Error('No JSON object in crafting response')
  }
}

/** Rarity is earned: driven by the best material, the amount, and craft level. */
export function deriveRarity(materials: Material[], craftLevel: number): Rarity {
  if (materials.length === 0) return 'common'
  let rank = Math.max(...materials.map((m) => RARITY_RANK[m.rarity]))
  if (materials.length >= 3) rank += 1
  if (materials.length >= 5) rank += 1
  // a "lucky forge" upgrade, more likely as the artificer levels up
  if (Math.random() < 0.08 + craftLevel * 0.03) rank += 1
  rank = Math.max(0, Math.min(4, rank))
  return RARITIES[rank]
}

function pickStat(exclude: StatKey[]): StatKey {
  const pool = STATS.filter((s) => !exclude.includes(s))
  return pool[Math.floor(Math.random() * pool.length)] || 'strength'
}

function computeEffects(
  rarity: Rarity,
  primary: StatKey,
  secondary: StatKey | undefined,
  craftLevel: number,
): ItemEffect[] {
  const rank = RARITY_RANK[rarity]
  const count = EFFECT_COUNT[rank]
  const base = BASE_AMOUNT[rank] + Math.floor(craftLevel / 4)
  const effects: ItemEffect[] = [{ stat: primary, amount: base + 1 }]
  if (count >= 2) effects.push({ stat: secondary ?? pickStat([primary]), amount: base })
  if (count >= 3) {
    const used = effects.map((e) => e.stat)
    effects.push({ stat: pickStat(used), amount: base })
  }
  // merge duplicate stats
  const merged = new Map<StatKey, number>()
  for (const e of effects) merged.set(e.stat, (merged.get(e.stat) || 0) + e.amount)
  return [...merged].map(([stat, amount]) => ({ stat, amount }))
}

let itemSeq = 0

export interface ForgeOpts {
  prompt: string
  materials: Material[]
  slot: Slot
  forRole: Agent['role']
  craftLevel: number
}

/** Forge an item from chosen materials. LLM = flavor, local = balance. */
export async function forgeItem(client: GatewayClient, opts: ForgeOpts): Promise<CraftedItem> {
  const rarity = deriveRarity(opts.materials, opts.craftLevel)
  const matList = opts.materials.map((m) => m.name).join(', ') || 'common scraps'

  const res = await client.getClient().chat.completions.create({
    temperature: 0.95,
    max_tokens: 260,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are the colony artificer. Invent a piece of equipment. Return JSON ONLY: ' +
          '{"name":"evocative item name","description":"one vivid sentence",' +
          '"passive":"short flavorful passive effect or empty",' +
          '"setName":"armor/theme set name or empty",' +
          '"primaryStat":"strength|intelligence|agility|wisdom",' +
          '"secondaryStat":"strength|intelligence|agility|wisdom or empty",' +
          '"grantsSkill":"short skill name or empty"}.',
      },
      {
        role: 'user',
        content:
          `Forge a ${rarity} ${opts.slot} for a ${opts.forRole}. ` +
          `Materials used: ${matList}. ` +
          `Player intent: "${opts.prompt || 'whatever suits this colonist'}".`,
      },
    ],
  })

  const raw = parseJSON<{
    name?: string
    description?: string
    passive?: string
    setName?: string
    primaryStat?: string
    secondaryStat?: string
    grantsSkill?: string
  }>(res.choices[0].message.content)

  const primary = (STATS.includes(raw.primaryStat as StatKey) ? raw.primaryStat : pickStat([])) as StatKey
  const secondary = STATS.includes(raw.secondaryStat as StatKey)
    ? (raw.secondaryStat as StatKey)
    : undefined
  const effects = computeEffects(rarity, primary, secondary, opts.craftLevel)
  itemSeq += 1

  return {
    id: `item-${Date.now()}-${itemSeq}`,
    name: (raw.name || 'Unnamed Relic').trim().slice(0, 48),
    slot: opts.slot,
    rarity,
    description: (raw.description || '').trim().slice(0, 160),
    passive: raw.passive?.trim() ? raw.passive.trim().slice(0, 120) : undefined,
    setName: raw.setName?.trim() ? raw.setName.trim().slice(0, 40) : undefined,
    grantsSkill:
      RARITY_RANK[rarity] >= 2 && raw.grantsSkill?.trim()
        ? raw.grantsSkill.trim().slice(0, 32)
        : undefined,
    effects,
    madeFrom: opts.materials.map((m) => m.id),
  }
}

/** One-line summary of an item's stat effects, e.g. "+3 str · +2 int". */
export function effectSummary(item: CraftedItem): string {
  return item.effects.map((e) => `+${e.amount} ${e.stat.slice(0, 3)}`).join(' · ')
}
