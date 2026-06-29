import { useState, useMemo } from 'react'
import { useAgentStore } from '../game/store'
import { useCraftStore } from '../game/craftStore'
import { GatewayClient, isAiConfigured } from '../api/aiGateway'
import {
  forgeItem,
  effectSummary,
  displayName,
  CraftedItem,
  Material,
  MATERIALS,
  MATERIAL_BY_ID,
  RARITY_COLOR,
  SLOTS,
  SLOT_ICON,
  Slot,
} from '../game/crafting'

type Tab = 'scavenge' | 'forge' | 'bag' | 'codex'

const RARITY_BORDER: Record<CraftedItem['rarity'], string> = {
  common: 'border-gray-500/40',
  uncommon: 'border-emerald-500/40',
  rare: 'border-blue-500/50',
  epic: 'border-fuchsia-500/50',
  legendary: 'border-amber-500/60',
}

export default function CraftPanel() {
  const { agents, controlledAgentId } = useAgentStore()
  const craft = useCraftStore()
  const [tab, setTab] = useState<Tab>('scavenge')
  const [prompt, setPrompt] = useState('')
  const [slot, setSlot] = useState<Slot>('weapon')
  const [picked, setPicked] = useState<string[]>([])
  const [targetId, setTargetId] = useState('')
  const [fuseSel, setFuseSel] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [lastGain, setLastGain] = useState<Material[] | null>(null)

  const client = useMemo(
    () => (isAiConfigured ? new GatewayClient() : null),
    [],
  )
  const target = targetId || controlledAgentId || agents[0]?.id || ''
  const ownedMats = MATERIALS.filter((m) => (craft.materials[m.id] || 0) > 0)
  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }
  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const doScavenge = () => setLastGain(craft.scavenge())

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
      const isNew = craft.discover(item)
      flash(isNew ? `📜 New recipe discovered: ${item.name}!` : `Forged ${displayName(item)}`)
      setPicked([])
      setPrompt('')
      setTab('bag')
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const toggleFuse = (item: CraftedItem) => {
    setFuseSel((sel) => {
      if (sel.includes(item.id)) return sel.filter((x) => x !== item.id)
      const first = craft.inventory.find((i) => i.id === sel[0])
      if (first && first.slot !== item.slot) return sel // only same slot
      return [...sel, item.id].slice(-2)
    })
  }

  const doFuse = () => {
    if (fuseSel.length !== 2) return
    const fused = craft.fuse(fuseSel[0], fuseSel[1])
    setFuseSel([])
    if (fused) flash(`⚗️ Fused into ${displayName(fused)} (${fused.rarity})`)
  }

  const doAutoEquip = () => {
    const n = craft.autoEquip(target)
    flash(n > 0 ? `Auto-equipped ${n} item${n > 1 ? 's' : ''}` : 'Already optimal')
  }

  const loadout = craft.itemsFor(target)
  const sets = craft.setBonuses(target)

  return (
    <div className="bg-gray-700 p-3 rounded flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold">Crafting</h2>
        <span className="text-[10px] text-amber-300">artificer Lv.{craft.craftLevel()}</span>
      </div>

      <div className="flex gap-1 mb-2 text-[11px]">
        {(['scavenge', 'forge', 'bag', 'codex'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1 rounded capitalize ${
              tab === t ? 'bg-amber-600 font-bold' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            {t === 'bag' ? `bag·${craft.inventory.length}` : t === 'codex' ? `codex·${craft.blueprints.length}` : t}
          </button>
        ))}
      </div>

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
                <span className={RARITY_COLOR[m.rarity]}>{m.icon} {m.name}</span>
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
                className={`flex-1 py-1 rounded text-xs ${
                  slot === s ? 'bg-amber-600 font-bold' : 'bg-gray-600 hover:bg-gray-500'
                }`}
                title={s}
              >
                {SLOT_ICON[s]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mb-1">
            Materials {picked.length > 0 && `(${picked.length})`}:
          </p>
          {ownedMats.length === 0 ? (
            <p className="text-[11px] text-gray-500 mb-2">None yet — scavenge first.</p>
          ) : (
            <div className="grid grid-cols-2 gap-1 mb-2 text-[11px]">
              {ownedMats.map((m) => (
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
                  <span className="text-gray-400">{picked.includes(m.id) ? '✓' : `×${craft.materials[m.id]}`}</span>
                </button>
              ))}
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
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">Equipped</span>
            <button
              onClick={doAutoEquip}
              disabled={!target || craft.inventory.length === 0}
              className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40"
            >
              ⚡ Auto-equip best
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 mb-1">
            {SLOTS.map((s) => (
              <div key={s} className="text-center text-[10px] bg-gray-800/60 rounded py-1" title={loadout[s] ? displayName(loadout[s]!) : s}>
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

          {fuseSel.length === 2 && (
            <button onClick={doFuse} className="w-full p-1.5 rounded text-xs font-bold bg-fuchsia-600 hover:bg-fuchsia-500 mb-1">
              ⚗️ Fuse selected (2)
            </button>
          )}

          <div className="text-[10px] text-gray-400 mb-1">
            Bag {fuseSel.length === 1 && <span className="text-fuchsia-300">· pick a 2nd same-slot item to fuse</span>}
          </div>
          {craft.inventory.length === 0 && <p className="text-[11px] text-gray-500">Empty — forge something.</p>}
          {craft.inventory.map((it) => (
            <div
              key={it.id}
              className={`rounded border bg-gray-800/60 px-2 py-1.5 ${
                fuseSel.includes(it.id) ? 'border-fuchsia-400' : RARITY_BORDER[it.rarity]
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`font-semibold text-xs ${RARITY_COLOR[it.rarity]}`}>
                  {SLOT_ICON[it.slot]} {displayName(it)}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => craft.equip(target, it)} disabled={!target} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">equip</button>
                  <button onClick={() => toggleFuse(it)} className={`text-[10px] px-1.5 py-0.5 rounded ${fuseSel.includes(it.id) ? 'bg-fuchsia-500' : 'bg-gray-600 hover:bg-gray-500'}`}>fuse</button>
                  <button onClick={() => { const got = craft.salvage(it.id); flash(`Salvaged → ${got.map((m) => m.icon).join('')}`) }} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-600 hover:bg-red-600/70" title="Break into materials">♻</button>
                </div>
              </div>
              <div className="text-[10px] text-emerald-300 mt-0.5">{effectSummary(it)}</div>
              {it.passive && <div className="text-[10px] text-blue-300">⚡ {it.passive}</div>}
              {it.setName && <div className="text-[10px] text-amber-300/80">✶ {it.setName} set</div>}
            </div>
          ))}
        </div>
      )}

      {tab === 'codex' && (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {craft.blueprints.length === 0 && (
            <p className="text-[11px] text-gray-500">No recipes yet. Forge items to discover them, then re-craft here.</p>
          )}
          {craft.blueprints.map((bp) => {
            const can = craft.hasMaterials(bp.materialSig)
            return (
              <div key={bp.id} className={`rounded border ${RARITY_BORDER[bp.rarity]} bg-gray-800/60 px-2 py-1.5`}>
                <div className="flex justify-between items-start">
                  <span className={`font-semibold text-xs ${RARITY_COLOR[bp.rarity]}`}>📜 {bp.name}</span>
                  <button
                    onClick={() => { const it = craft.craftFromBlueprint(bp); if (it) { flash(`Crafted ${it.name}`); setTab('bag') } }}
                    disabled={!can}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40"
                    title={can ? 'Craft from recipe' : 'Missing materials'}
                  >
                    craft
                  </button>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {SLOT_ICON[bp.slot]} {bp.slot} · {bp.materialSig.map((id) => MATERIAL_BY_ID[id]?.icon).join('')}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!client && <p className="mt-1 text-[10px] text-gray-500">Connect Nebius to forge items.</p>}
      {toast && <p className="mt-1 text-[11px] text-amber-200">{toast}</p>}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  )
}
