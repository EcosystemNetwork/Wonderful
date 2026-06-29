import { create } from 'zustand'
import { useAgentStore } from './store'
import {
  Blueprint,
  blueprintFromItem,
  blueprintSig,
  CraftedItem,
  fuseItems,
  itemFromBlueprint,
  Material,
  MATERIALS,
  MATERIAL_BY_ID,
  RARITY_RANK,
  salvageYield,
  scoreItemForRole,
  Slot,
  SLOTS,
  StatKey,
  STATS,
} from './crafting'

/**
 * Isolated crafting state: scavenged materials, the item bag, and per-agent
 * equipped loadouts. Equip/unequip recompute the agent's TOTAL crafting bonus
 * (item effects + set bonuses) and apply the diff to the shared store, so stats
 * stay correct no matter what else changes them. Kept separate from the main
 * store on purpose. See [[crafting]].
 */

type Loadout = Partial<Record<Slot, string>> // slot -> item id

interface AppliedBonus {
  stats: Record<StatKey, number>
  skills: string[]
}

interface CraftStore {
  materials: Record<string, number>
  inventory: CraftedItem[]
  /** agentId -> equipped item ids per slot. */
  equipped: Record<string, Loadout>
  /** What we last applied to each agent, so we can diff cleanly. */
  applied: Record<string, AppliedBonus>
  /** Discovered recipes, keyed for dedupe by signature. */
  blueprints: Blueprint[]
  craftXp: number

  craftLevel: () => number
  scavenge: () => Material[]
  addItem: (item: CraftedItem) => void
  consume: (ids: string[]) => boolean
  hasMaterials: (ids: string[]) => boolean
  equip: (agentId: string, item: CraftedItem) => void
  unequip: (agentId: string, slot: Slot) => void
  itemsFor: (agentId: string) => Partial<Record<Slot, CraftedItem>>
  setBonuses: (agentId: string) => { setName: string; pieces: number; bonus: number }[]

  /** Remember a forged item as a recipe; returns true if newly discovered. */
  discover: (item: CraftedItem) => boolean
  /** Re-craft a known recipe (consumes its materials). */
  craftFromBlueprint: (bp: Blueprint) => CraftedItem | null
  /** Fuse two same-slot items into a stronger one. */
  fuse: (idA: string, idB: string) => CraftedItem | null
  /** Auto-equip the best-scoring bag item into each slot for a role. */
  autoEquip: (agentId: string) => number
  /** Break an item back into materials. */
  salvage: (id: string) => Material[]
}

const ZERO: Record<StatKey, number> = { strength: 0, intelligence: 0, agility: 0, wisdom: 0 }

/** Weighted scavenge: commons are plentiful, rarer mats need a higher craft level. */
function rollMaterials(craftLevel: number): Material[] {
  const count = 1 + Math.floor(Math.random() * 2) + (craftLevel >= 3 ? 1 : 0)
  const out: Material[] = []
  for (let i = 0; i < count; i++) {
    const r = Math.random()
    const luck = craftLevel * 0.04
    let maxRank = 0
    if (r < 0.04 + luck) maxRank = 4
    else if (r < 0.12 + luck) maxRank = 3
    else if (r < 0.3 + luck) maxRank = 2
    else if (r < 0.6) maxRank = 1
    const pool = MATERIALS.filter((m) => RARITY_RANK[m.rarity] <= maxRank)
    out.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return out
}

/** Set bonus: +1 to all stats at 2 matching pieces, +2 at 4. */
function setBonusFor(items: CraftedItem[]): {
  perStat: number
  list: { setName: string; pieces: number; bonus: number }[]
} {
  const counts = new Map<string, number>()
  for (const it of items) if (it.setName) counts.set(it.setName, (counts.get(it.setName) || 0) + 1)
  let perStat = 0
  const list: { setName: string; pieces: number; bonus: number }[] = []
  for (const [setName, pieces] of counts) {
    if (pieces < 2) continue
    const bonus = pieces >= 4 ? 2 : 1
    perStat += bonus
    list.push({ setName, pieces, bonus })
  }
  return { perStat, list }
}

export const useCraftStore = create<CraftStore>((set, get) => {
  /** Recompute an agent's full crafting bonus and apply the diff to its stats. */
  const recompute = (agentId: string) => {
    const st = get()
    const loadout = st.equipped[agentId] || {}
    const items = Object.values(loadout)
      .map((id) => st.inventory.find((i) => i.id === id))
      .filter(Boolean) as CraftedItem[]

    const bonus: Record<StatKey, number> = { ...ZERO }
    const skills = new Set<string>()
    for (const it of items) {
      for (const e of it.effects) bonus[e.stat] += e.amount
      skills.add(`🛠️ ${it.name}`)
      if (it.grantsSkill) skills.add(it.grantsSkill)
    }
    const { perStat, list } = setBonusFor(items)
    if (perStat > 0) {
      for (const s of STATS) bonus[s] += perStat
      for (const b of list) skills.add(`✶ ${b.setName} set (${b.pieces})`)
    }

    const agent = useAgentStore.getState().agents.find((a) => a.id === agentId)
    if (!agent) return
    const prev = st.applied[agentId] || { stats: { ...ZERO }, skills: [] }

    // stats: undo previous crafting delta, apply new one
    const newStats = { ...agent.stats }
    for (const s of STATS) newStats[s] = newStats[s] - (prev.stats[s] || 0) + bonus[s]
    // skills: strip previously-applied crafting skills, then add current ones
    const base = agent.skills.filter((sk) => !prev.skills.includes(sk))
    const newSkills = [...base, ...skills]

    useAgentStore.getState().updateAgent(agentId, { stats: newStats, skills: newSkills })
    set((s) => ({
      applied: { ...s.applied, [agentId]: { stats: { ...bonus }, skills: [...skills] } },
    }))
  }

  /** Remove an item id from every loadout and recompute the affected agents. */
  const detachEverywhere = (itemId: string) => {
    const affected: string[] = []
    set((s) => {
      const equipped = { ...s.equipped }
      for (const [agentId, loadout] of Object.entries(equipped)) {
        const next = { ...loadout }
        let changed = false
        for (const slot of SLOTS) {
          if (next[slot] === itemId) {
            delete next[slot]
            changed = true
          }
        }
        if (changed) {
          equipped[agentId] = next
          affected.push(agentId)
        }
      }
      return { equipped }
    })
    affected.forEach(recompute)
  }

  return {
    materials: {},
    inventory: [],
    equipped: {},
    applied: {},
    blueprints: [],
    craftXp: 0,

    craftLevel: () => 1 + Math.floor(get().craftXp / 100),

    scavenge: () => {
      const gained = rollMaterials(get().craftLevel())
      set((s) => {
        const materials = { ...s.materials }
        for (const m of gained) materials[m.id] = (materials[m.id] || 0) + 1
        return { materials, craftXp: s.craftXp + 8 }
      })
      return gained
    },

    addItem: (item) => set((s) => ({ inventory: [item, ...s.inventory], craftXp: s.craftXp + 20 })),

    consume: (ids) => {
      const have = { ...get().materials }
      for (const id of ids) {
        if (!have[id]) return false
        have[id] -= 1
      }
      set({ materials: have })
      return true
    },

    equip: (agentId, item) => {
      set((s) => {
        const loadout = { ...(s.equipped[agentId] || {}) }
        loadout[item.slot] = item.id
        return { equipped: { ...s.equipped, [agentId]: loadout } }
      })
      recompute(agentId)
    },

    unequip: (agentId, slot) => {
      set((s) => {
        const loadout = { ...(s.equipped[agentId] || {}) }
        delete loadout[slot]
        return { equipped: { ...s.equipped, [agentId]: loadout } }
      })
      recompute(agentId)
    },

    itemsFor: (agentId) => {
      const st = get()
      const loadout = st.equipped[agentId] || {}
      const out: Partial<Record<Slot, CraftedItem>> = {}
      for (const [slot, id] of Object.entries(loadout)) {
        const item = st.inventory.find((i) => i.id === id)
        if (item) out[slot as Slot] = item
      }
      return out
    },

    setBonuses: (agentId) => {
      const items = Object.values(get().itemsFor(agentId)).filter(Boolean) as CraftedItem[]
      return setBonusFor(items).list
    },

    hasMaterials: (ids) => {
      const have = get().materials
      const need: Record<string, number> = {}
      for (const id of ids) need[id] = (need[id] || 0) + 1
      return Object.entries(need).every(([id, n]) => (have[id] || 0) >= n)
    },

    discover: (item) => {
      const sig = blueprintSig(item.slot, item.madeFrom)
      const known = get().blueprints.some(
        (b) => blueprintSig(b.slot, b.materialSig) === sig,
      )
      if (known || item.madeFrom.length === 0) return false
      set((s) => ({ blueprints: [blueprintFromItem(item), ...s.blueprints], craftXp: s.craftXp + 15 }))
      return true
    },

    craftFromBlueprint: (bp) => {
      if (!get().hasMaterials(bp.materialSig)) return null
      get().consume(bp.materialSig)
      const item = itemFromBlueprint(bp)
      get().addItem(item)
      return item
    },

    fuse: (idA, idB) => {
      const st = get()
      const a = st.inventory.find((i) => i.id === idA)
      const b = st.inventory.find((i) => i.id === idB)
      if (!a || !b || a.id === b.id || a.slot !== b.slot) return null
      const fused = fuseItems(a, b)
      detachEverywhere(a.id)
      detachEverywhere(b.id)
      set((s) => ({
        inventory: [fused, ...s.inventory.filter((i) => i.id !== a.id && i.id !== b.id)],
        craftXp: s.craftXp + 25,
      }))
      return fused
    },

    autoEquip: (agentId) => {
      const agent = useAgentStore.getState().agents.find((a) => a.id === agentId)
      if (!agent) return 0
      const inv = get().inventory
      let equippedCount = 0
      for (const slot of SLOTS) {
        const best = inv
          .filter((i) => i.slot === slot)
          .sort((x, y) => scoreItemForRole(y, agent.role) - scoreItemForRole(x, agent.role))[0]
        if (best && get().equipped[agentId]?.[slot] !== best.id) {
          get().equip(agentId, best)
          equippedCount += 1
        }
      }
      return equippedCount
    },

    salvage: (id) => {
      const item = get().inventory.find((i) => i.id === id)
      if (!item) return []
      const matIds = salvageYield(item)
      detachEverywhere(id)
      set((s) => {
        const materials = { ...s.materials }
        for (const m of matIds) materials[m] = (materials[m] || 0) + 1
        return { materials, inventory: s.inventory.filter((i) => i.id !== id) }
      })
      return matIds.map((m) => MATERIAL_BY_ID[m])
    },
  }
})

export { MATERIAL_BY_ID }
