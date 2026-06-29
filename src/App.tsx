import { useEffect } from 'react'
import { useAgentStore } from './game/store'
import { loadParty } from './api/insforge'
import Landing from './components/Landing'
import CharacterSelect from './components/CharacterSelect'
import Summon from './components/Summon'
import Game from './components/Game'

function App() {
  const screen = useAgentStore((s) => s.screen)
  const hasParty = useAgentStore((s) => s.agents.length > 0)
  const addAgent = useAgentStore((s) => s.addAgent)

  // Restore the persisted party once on app load, so previously-summoned
  // characters (and their attached 3D models) come back across sessions.
  useEffect(() => {
    if (useAgentStore.getState().agents.length > 0) return
    let cancelled = false
    loadParty().then((party) => {
      if (cancelled || useAgentStore.getState().agents.length > 0) return
      party.forEach((a) => addAgent(a))
    })
    return () => {
      cancelled = true
    }
  }, [addAgent])

  if (screen === 'landing') return <Landing />
  if (screen === 'summon') return <Summon />
  if (screen === 'select') return <CharacterSelect />
  // Hard gate: the arena is unreachable without a character — fall back to select.
  if (!hasParty) return <CharacterSelect />
  return <Game />
}

export default App
