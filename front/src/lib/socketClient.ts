import { Client, type IFrame } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

/** Le handshake SockJS passe par `/ws` (voir WebSocketConfig côté back) ; en
 *  dev, vite.config.ts le proxyfie vers le backend comme `/api`, sinon la
 *  connexion part vers le port 5173 et échoue silencieusement. */
const WS_ENDPOINT = '/ws'

/** Délai avant une nouvelle tentative après une coupure, en millisecondes. */
export const RECONNECT_DELAY = 3000

type StompClientHandlers = {
  /** Appelé à chaque (re)connexion : c'est le seul endroit où souscrire, la
   *  socket n'est pas ouverte au retour de `activate()`. */
  onConnect: () => void
  onClose: () => void
  onError: (message: string) => void
}

/** Fabrique le transport, sans rien connaître du métier : aucune souscription
 *  ici, c'est le SocketProvider qui tient le registre et le rejoue à chaque
 *  `onConnect` — stompjs reconnecte tout seul mais ne restaure pas les
 *  souscriptions.
 *
 *  L'authentification passe par le même cookie de session que les requêtes
 *  REST : tant que `/ws` reste same-origin via le proxy vite, il est envoyé
 *  automatiquement, sans configuration côté client. */
export function createStompClient(handlers: StompClientHandlers): Client {
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_ENDPOINT) as unknown as WebSocket,
    reconnectDelay: RECONNECT_DELAY,
    onConnect: handlers.onConnect,
    onWebSocketClose: handlers.onClose,
    onStompError: (frame: IFrame) => {
      handlers.onError(frame.headers.message ?? 'Erreur de connexion au serveur.')
    },
  })

  client.activate()
  return client
}
