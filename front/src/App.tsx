import { useState } from 'react'
import { AdminPage } from './pages/AdminPage.tsx'
import { FriendsPage } from './pages/FriendsPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { handleAction } from './lib/actions.ts'

/** Routeur maison : une action de sidebar par page. Ajouter une page = une ligne. */
const PAGES = {
  'nav:home': HomePage,
  'nav:friends': FriendsPage,
  'nav:admin': AdminPage,
}

type Route = keyof typeof PAGES

function App() {
  const [route, setRoute] = useState<Route>('nav:home')

  const navigate = (action: string) => {
    // Les onglets qui n'ont pas encore de page se contentent du log.
    if (action in PAGES) setRoute(action as Route)
    else handleAction(action)
  }

  const Page = PAGES[route]
  return <Page onNavigate={navigate} />
}

export default App
