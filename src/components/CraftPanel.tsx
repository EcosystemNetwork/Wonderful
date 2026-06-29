import { useState, useMemo } from 'react'
import { useAgentStore } from '../game/store'
import { useCraftStore } from '../game/craftStore'
import { NebiusClient } from '../api/nebius'
import {
  forgeItem,
  effectSummary,
  CraftedItem,
  Material,
  MATERIALS,
  MATERIAL_BY_ID,
  RARITY_COLOR,
  SLOTS,
  SLOT_ICON,
  Slot,
} from '../game/crafting'

type Tab = 'scavenge' | 'forge' | 'bag'

const RARITY_BORDER: Record<CraftedItem['rarity'], string> = {
  common: 'border-gray-500/40',
  uncommon: 'border-emerald-500/40',
  rare: 'border-blue-500/50',
  epic: 'border-fuchsia-500/50',
  legendary: 'border-amber-500/60',
}

export default function CraftPanel() {
  const { agents, controlledAgentId, nebiusApiKey } = useAgentStore()
  const craft = useCraftStore()
  const [tab, setTab] = useState<Tab>('scavenge')
  const [prompt, setPrompt] = useState('')
  const [slot, setSlot] = useState<Slot>('weapon')
  const [picked, setPicked] = useState<string[]>([])
  const [targetId, setTargetId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastGain, setLastGain] = useState<Material[] | null>(null)

  const client = useMemo(
    () => (nebiusApiKey ? new NebiusClient(nebiusApiKey) : null),
    [nebiusApiKey],
  )
  const target = targetId || controlledAgentId || agents[0]?.id || ''
  const ownedMats = MATERIALS.filter((m) => (craft.materials[m.id] || 0) > 0)
  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const doScavenge = () => {
    const gained = craft.scavenge()
    setLastGain(gained)
  }

  const doForge = async () => {
    if (!client) return setError('Connect Nebius to forge.')
    if (picked.length === 0) return setError('Pick at least one material.')
    const agent = useAgentStore.getState().agents.find((a) => a.id === target)
    if (!agent) return setError('Pick a colonist.')
    setError(null)
    setBusy(true)
    try {
      if (!craft.consume(picked)) {
        setError('Not enough materials.')
        return
      }
      const mats = picked.map((id) => MATERIAL_BY_ID[id])
      const item = await forgeItem(client, {
        prompt: prompt.trim(),
        materials: mats,
        slot,
        forRole: agent.role,
        craftLevel: craft.craftLevel(),
      })
      craft.addItem(item)
      setPicked([])
      setPrompt('')
      setTab('bag')
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const loadout = craft.itemsFor(target)
  const sets = craft.setBonuses(target)

  return (
    <div className="bg-gray-700 p-3 rounded flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold">Crafting</h2>
        <span className="text-[10px] text-amber-300">artificer Lv.{craft.craftLevel()}</span>
      </div>

      {/* tabs */}
      <div className="flex gap-1 mb-2 text-xs">
        {(['scavenge', 'forge', 'bag'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1 rounded capitalize ${
              tab === t ? 'bg-amber-600 font-bold' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            {t === 'bag' ? `bag (${craft.inventory.length})` : t}
          </button>
        ))}
      </div>

      {/* agent selector (shared across tabs) */}
      <select
        value={target}
        onChange={(e) => setTargetId(e.target.value)}
        className="w-full p-1.5 bg-gray-600 rounded text-xs mb-2 outline-none"
        disabled={agents.length === 0}
      >
        {agents.length === 0 && <option value="">no colonists yet</option>}
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.role})
          </option>
        ))}
      </select>

      {tab === 'scavenge' && (
        <div>
          <button
            onClick={doScavenge}
            className="w-full p-2 rounded font-bold bg-emerald-600 hover:bg-emerald-500 mb-2"
          >
            Scavenge materials
          </button>
          {lastGain && (
            <p className="text-[11px] text-emerald-300 mb-2">
              + {lastGain.map((m) => `${m.icon} ${m.name}`).join(', ')}
            </p>
          )}
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {MATERIALS.map((m) => (
              <div
                key={m.id}
                className={`flex justify-between px-1.5 py-1 rounded bg-gray-800/60 ${
                  (craft.materials[m.id] || 0) > 0 ? '' : 'opacity-40'
                }`}
              >
                <span className={RARITY_COLOR[m.rarity]}>
                  {m.icon} {m.name}
                </span>
                <span className="text-gray-300">×{craft.materials[m.id] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'forge' && (
        <div>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Intent — e.g. a cloak woven from shadow"
            className="w-full p-2 bg-gray-600 rounded text-xs mb-2 outline-none"
          />
          <div className="flex gap-1 mb-2">
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={`flex-1 py-1 rounded text-xs capitalize ${
                  slot === s ? 'bg-amber-600 font-bold' : 'bg-gray-600 hover:bg-gray-500'
                }`}
                title={s}
              >
                {SLOT_ICON[s]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mb-1">
            Materials to forge {picked.length > 0 && `(${picked.length})`}:
          </p>
          {ownedMats.length === 0 ? (
            <p className="text-[11px] text-gray-500 mb-2">None yet — scavenge first.</p>
          ) : (
            <div className="grid grid-cols-2 gap-1 mb-2 text-[11px]">
              {ownedMats.map((m) => {
                const picks = picked.filter((p) => p === m.id).length
                return (
                  <button
                    key={m.id}
                    onClick={() => togglePick(m.id)}
                    className={`flex justify-between px-1.5 py-1 rounded border ${
                      picked.includes(m.id)
                        ? 'border-amber-400 bg-amber-500/10'
                        : 'border-transparent bg-gray-800/60'
                    }`}
                  >
                    <span className={RARITY_COLOR[m.rarity]}>{m.icon} {m.name}</span>
                    <span className="text-gray-400">
                      {picks > 0 ? `✓` : `×${craft.materials[m.id]}`}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          <button
            onClick={doForge}
            disabled={busy || !client || picked.length === 0}
            className="w-full p-2 rounded font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
          >
            {busy ? 'Forging…' : 'Forge item'}
          </button>
        </div>
      )}

      {tab === 'bag' && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {/* current loadout */}
          <div className="text-[10px] text-gray-400 mb-1">Equipped</div>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {SLOTS.map((s) => (
              <div
                key={s}
                className="text-center text-[10px] bg-gray-800/60 rounded py-1"
                title={loadout[s]?.name || s}
              >
                <div>{SLOT_ICON[s]}</div>
                {loadout[s] ? (
                  <button
                    onClick={() => craft.unequip(target, s)}
                    className={`${RARITY_COLOR[loadout[s]!.rarity]} hover:text-red-300 leading-tight`}
                  >
                    {loadout[s]!.name.split(' ')[0]}
                  </button>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </div>
            ))}
          </div>
          {sets.length > 0 && (
            <div className="text-[10px] text-amber-300 mb-1">
              {sets.map((s) => `✶ ${s.setName} (${s.pieces}) +${s.bonus} all`).join(' · ')}
            </div>
          )}

          {/* inventory */}
          <div className="text-[10px] text-gray-400 mb-1">Bag</div>
          {craft.inventory.length === 0 && (
            <p className="text-[11px] text-gray-500">Empty — forge something.</p>
          )}
          {craft.inventory.map((it) => (
            <div key={it.id} className={`rounded border ${RARITY_BORDER[it.rarity]} bg-gray-800/60 px-2 py-1.5`}>
              <div className="flex justify-between items-start">
                <span className={`font-semibold text-xs ${RARITY_COLOR[it.rarity]}`}>
                  {SLOT_ICON[it.slot]} {it.name}
                </span>
                <button
                  onClick={() => craft.equip(target, it)}
                  disabled={!target}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                >
                  equip
                </button>
              </div>
              <div className="text-[10px] text-emerald-300 mt-0.5">{effectSummary(it)}</div>
              {it.description && <div className="text-[10px] text-gray-400 leading-tight">{it.description}</div>}
              {it.passive && <div className="text-[10px] text-blue-300">⚡ {it.passive}</div>}
              {it.setName && <div className="text-[10px] text-amber-300/80">✶ {it.setName} set</div>}
            </div>
          ))}
        </div>
      )}

      {!client && <p className="mt-1 text-[10px] text-gray-500">Connect Nebius to forge items.</p>}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  )
}
