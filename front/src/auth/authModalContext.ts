import { createContext, useContext } from 'react'

export type AuthMode = 'login' | 'signup'

export type AuthModalValue = {
  isOpen: boolean
  mode: AuthMode
  isLoggedIn: boolean
  /** Ouvre la modale sur l'onglet demandé (connexion par défaut). */
  openModal: (mode?: AuthMode) => void
  closeModal: () => void
  setMode: (mode: AuthMode) => void
}

/** Fichier sans composant : le hook et le contexte peuvent être exportés ensemble. */
export const AuthModalContext = createContext<AuthModalValue | null>(null)

export function useAuthModal() {
  const ctx = useContext(AuthModalContext)
  if (!ctx) throw new Error('useAuthModal doit être utilisé dans AuthModalProvider')
  return ctx
}
