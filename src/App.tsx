import { useAgentStore } from './game/store'
import Landing from './components/Landing'
import Summon from './components/Summon'
import Game from './components/Game'

function App() {
  const screen = useAgentStore((s) => s.screen)

  if (screen === 'landing') return <Landing />
  if (screen === 'summon') return <Summon />
  return <Game />
}

export default App
