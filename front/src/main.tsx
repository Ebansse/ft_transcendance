import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style/token.css'
import './style/body.css'
import App from './App.tsx'
import { AuthModalProvider } from './auth/AuthModalProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthModalProvider>
      <App />
    </AuthModalProvider>
  </StrictMode>,
)
