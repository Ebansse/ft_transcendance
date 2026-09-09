import { createContext, useContext } from 'react'

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected'

export type SocketValue = {
  status: SocketStatus
  /** Dernière erreur remontée par le serveur STOMP, `null` si tout va bien. */
  error: string | null
  /** Souscrit à une destination. La souscription est enregistrée puis rejouée à
   *  chaque reconnexion : on peut donc l'appeler avant même que la socket soit
   *  ouverte. Renvoie la fonction de désinscription. */
  subscribe: (destination: string, handler: (body: string) => void) => () => void
  /** Renvoie `false` si la socket n'est pas prête : l'appelant décide quoi en
   *  faire (message d'erreur, bouton désactivé…). */
  publish: (destination: string, body: unknown) => boolean
}

/** Fichier sans composant : le hook et le contexte peuvent être exportés ensemble. */
export const SocketContext = createContext<SocketValue | null>(null)

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket doit être utilisé dans SocketProvider')
  return ctx
}
