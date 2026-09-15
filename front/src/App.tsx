import { Routes, Route, useNavigate } from 'react-router-dom'
import { ChatProvider } from './chat/ChatProvider.tsx'
import { QuickChatDock } from './chat/QuickChatDock.tsx'
import { Toast } from './components/Toast.tsx'
import { AdminPage } from './pages/AdminPage.tsx'
import { ChatPage } from './pages/ChatPage.tsx'
import { ChessPage } from './pages/ChessPage.tsx'
import { FriendsPage } from './pages/FriendsPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { ProfilePage } from './pages/ProfilePage.tsx'
import { handleAction } from './lib/actions.ts'
import { useChessInvitations } from './ws/useChessInvitations.ts'
import { useChessMatchStart } from './ws/useChessMatchStart.ts'

const PAGES = {
  'nav:home': { path: '/', Component: HomePage },
  'nav:friends': { path: '/friends', Component: FriendsPage },
  'nav:profile': { path: '/profile', Component: ProfilePage },
  'nav:admin': { path: '/admin', Component: AdminPage },
  'nav:chat': { path: '/chat', Component: ChatPage },
  'nav:chess': { path: '/chess', Component: ChessPage },
} as const

const CHAT_WITH = 'nav:chat:'

function App() {
  const navigate = useNavigate()
  const { invitations, dismiss } = useChessInvitations()

  useChessMatchStart()

  const onNavigate = (action: string) => {
    if (action.startsWith(CHAT_WITH)) {
      const idUser = action.slice(CHAT_WITH.length)
      navigate(idUser ? `/chat/${idUser}` : '/chat')
      return
    }
    if (action in PAGES) navigate(PAGES[action as keyof typeof PAGES].path)
    else handleAction(action)
  }

  return (
    <ChatProvider>
      <Toast items={invitations} onDismiss={dismiss} />

      <Routes>
        {Object.values(PAGES).map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component onNavigate={onNavigate} />} />
        ))}
        <Route path="/chat/:idUser" element={<ChatPage onNavigate={onNavigate} />} />
      </Routes>

      <QuickChatDock />
    </ChatProvider>
  )
}

export default App