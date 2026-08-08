import { useState } from 'react'
import { AdminPage } from './pages/AdminPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { handleAction } from './lib/actions.ts'

/** Actions de la sidebar qui ont une vraie page. Le reste retombe sur handleAction. */
const ROUTES = ['nav:home', 'nav:admin'] as const

type Route = (typeof ROUTES)[number]

function App() {
  const [route, setRoute] = useState<Route>('nav:home')

  const navigate = (action: string) => {
    if ((ROUTES as readonly string[]).includes(action)) {
      setRoute(action as Route)
      return
    }
    // Onglets pas encore implémentés : on garde le log en attendant leur page.
    handleAction(action)
  }

  return route === 'nav:admin' ? (
    <AdminPage onNavigate={navigate} />
  ) : (
    <HomePage onNavigate={navigate} />
  )
}

export default App
