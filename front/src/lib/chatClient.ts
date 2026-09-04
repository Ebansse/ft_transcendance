import { Client, type IMessage, type IFrame } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

/** Miroir du `ChatMessageDto` du back. `sentAt` est un `LocalDateTime` Java,
 *  donc une date ISO sans fuseau ; `isRead` est explicitement nommé ainsi par
 *  le `@JsonProperty` du DTO côté back. */
export type ChatMessageDto = {
  id: number
  senderId: string
  receiverId: string
  content: string
  sentAt: string
  isRead: boolean
}

type ChatSocketHandlers = {
  onMessage: (message: ChatMessageDto) => void
  onError: (error: string) => void
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected') => void
}

/** Le handshake SockJS passe par `/ws` (voir WebSocketConfig côté back) ; en
 *  dev, vite.config.ts doit le proxyfier vers le backend comme `/api`, sinon
 *  la connexion part vers le port 5173 et échoue silencieusement. */
const WS_ENDPOINT = '/ws'

/** L'authentification passe par le même cookie de session que les requêtes
 *  REST : tant que `/ws` reste same-origin via le proxy vite, il est envoyé
 *  automatiquement, sans configuration côté client. */
export function createChatClient(handlers: ChatSocketHandlers): Client {
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_ENDPOINT) as unknown as WebSocket,
    reconnectDelay: 3000,
    onConnect: () => {
      handlers.onStatusChange('connected')

      client.subscribe('/user/queue/messages', (frame: IMessage) => {
        handlers.onMessage(JSON.parse(frame.body) as ChatMessageDto)
      })

      client.subscribe('/user/queue/errors', (frame: IMessage) => {
        const payload = JSON.parse(frame.body) as { error?: string }
        handlers.onError(payload.error ?? 'Message refusé par le serveur.')
      })
    },
    onWebSocketClose: () => handlers.onStatusChange('disconnected'),
    onStompError: (frame: IFrame) => {
      handlers.onError(frame.headers.message ?? 'Erreur de connexion au chat.')
    },
  })

  handlers.onStatusChange('connecting')
  client.activate()
  return client
}

/** Envoie un message. Le serveur le repousse à `/user/queue/messages` pour
 *  l'expéditeur ET le destinataire (voir ChatController) : on ne l'ajoute
 *  donc jamais localement ici, on attend l'écho pour rester fidèle à ce qui
 *  est vraiment persisté (id réel, sentAt du serveur). */
export function sendChatMessage(client: Client, receiverId: string, content: string) {
  client.publish({
    destination: '/app/chat.send',
    body: JSON.stringify({ receiverId, content }),
  })
}