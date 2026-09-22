import { Client, type IFrame } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

/** Handshake SockJS (voir WebSocketConfig côté back) ; en dev vite.config.ts le
 *  proxyfie vers le backend, sinon la connexion part vers 5173 et échoue. */
const WS_ENDPOINT = '/ws'

const RECONNECT_DELAY = 3000

type StompClientHandlers = {
  /** Seul endroit où souscrire : la socket n'est pas ouverte au retour d'`activate()`. */
  onConnect: () => void
  onClose: () => void
  onError: (message: string) => void
}

/** Fabrique le transport, sans aucune souscription : c'est le SocketProvider qui
 *  tient le registre et le rejoue à chaque `onConnect` — stompjs reconnecte tout
 *  seul mais ne restaure pas les souscriptions.
 *
 *  L'authentification passe par le cookie de session, envoyé automatiquement
 *  tant que `/ws` reste same-origin. */
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
