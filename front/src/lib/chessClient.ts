/** Miroir du `ChessInvitationDto` du back (voir ChessPlayerChannelStomp). */
export type ChessInvitationDto = {
  invitationId: string
  fromUserId: string
  fromUsername: string
  state: ChessInvitationState
}

/** L'invitation n'existe qu'en mémoire côté back (une `ConcurrentHashMap`), et
 *  seuls ces deux états voyagent jusqu'au client : `ACCEPTED` n'est jamais
 *  poussé ici, une acceptation arrive sous la forme d'un match démarré. */
export type ChessInvitationState = 'PENDING' | 'DECLINED'

/** Destination STOMP des invitations, préfixée `/user` : le broker ne livre
 *  qu'à la session du destinataire.
 *
 *  Une seule queue pour les deux sens de la conversation, l'état les sépare :
 *  `PENDING` arrive chez l'invité (« on t'invite »), `DECLINED` chez l'inviteur
 *  (« ton invitation a été refusée »). */
export const CHESS_INVITATIONS = '/user/queue/chess.invitations'
