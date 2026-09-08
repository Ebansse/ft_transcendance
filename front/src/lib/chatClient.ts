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

/** Destinations STOMP du chat (voir ChatController côté back). Les queues sont
 *  préfixées `/user` : le broker ne livre qu'à la session de l'utilisateur. */
export const CHAT_MESSAGES = '/user/queue/messages'
export const CHAT_ERRORS = '/user/queue/errors'
export const CHAT_SEND = '/app/chat.send'

/** Envoie un message via le tuyau partagé (`publish` vient de `useSocket`). Le
 *  serveur le repousse à `/user/queue/messages` pour l'expéditeur ET le
 *  destinataire (voir ChatController) : on ne l'ajoute donc jamais localement
 *  ici, on attend l'écho pour rester fidèle à ce qui est vraiment persisté
 *  (id réel, sentAt du serveur). Renvoie `false` si la socket n'est pas prête. */
export function sendChatMessage(
  publish: (destination: string, body: unknown) => boolean,
  receiverId: string,
  content: string,
) {
  return publish(CHAT_SEND, { receiverId, content })
}
