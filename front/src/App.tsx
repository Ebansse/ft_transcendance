import { Routes, Route, useNavigate } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage.tsx'
import { ChatPage } from './pages/ChatPage.tsx'
import { FriendsPage } from './pages/FriendsPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { handleAction } from './lib/actions.ts'

/** Routeur : une action de sidebar = une route. Ajouter une page = une ligne. */
const PAGES = {
  'nav:home': { path: '/', Component: HomePage },
  'nav:friends': { path: '/friends', Component: FriendsPage },
  'nav:admin': { path: '/admin', Component: AdminPage },
  'nav:chat': { path: '/chat', Component: ChatPage }, // TODO: page de chat
} as const

function App() {
  const navigate = useNavigate()

  const onNavigate = (action: string) => {
    if (action in PAGES) navigate(PAGES[action as keyof typeof PAGES].path)
    else handleAction(action)
  }

  return (
    <Routes>
      {Object.values(PAGES).map(({ path, Component }) => (
        <Route key={path} path={path} element={<Component onNavigate={onNavigate} />} />
      ))}
    </Routes>
  )
}

export default App