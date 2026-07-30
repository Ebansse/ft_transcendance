import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App, { BlackjackButton, PokerButton, UnoButton } from './App.tsx'
import { AuthModalProvider } from './AuthModalContext'
import { AuthStatus } from './AuthStatus'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthModalProvider>
      <App />
      <UnoButton />
      <BlackjackButton />
      <PokerButton />
      <AuthStatus />
    </AuthModalProvider>
  </StrictMode>,
)