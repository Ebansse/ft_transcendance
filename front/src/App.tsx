import { Routes, Route, useNavigate } from 'react-router-dom'
import { Toast } from './components/Toast.tsx'
import { AdminPage } from './pages/AdminPage.tsx'
import { ChatPage } from './pages/ChatPage.tsx'
import { ChessPage } from './pages/ChessPage.tsx'
import { FriendsPage } from './pages/FriendsPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { ProfilePage } from './pages/ProfilePage.tsx'
import { handleAction } from './lib/actions.ts'
import { useChessInvitations } from './ws/useChessInvitations.ts'

/** Routeur : une action de sidebar = une route. Ajouter une page = une ligne. */
const PAGES = {
  'nav:home': { path: '/', Component: HomePage },
  'nav:friends': { path: '/friends', Component: FriendsPage },
  'nav:profile': { path: '/profile', Component: ProfilePage },
  'nav:admin': { path: '/admin', Component: AdminPage },
  'nav:chat': { path: '/chat', Component: ChatPage }, // TODO: page de chat
  'nav:chess': { path: '/chess', Component: ChessPage },
} as const

function App() {
  const navigate = useNavigate()
  const { invitations, dismiss } = useChessInvitations()

  const onNavigate = (action: string) => {
    if (action in PAGES) navigate(PAGES[action as keyof typeof PAGES].path)
    else handleAction(action)
  }

  return (
    <>
      {/* Hors des routes : une notification doit arriver quelle que soit la page. */}
      <Toast items={invitations} onDismiss={dismiss} />

      <Routes>
        {Object.values(PAGES).map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component onNavigate={onNavigate} />} />
        ))}
      </Routes>
    </>
  )
}

export default App