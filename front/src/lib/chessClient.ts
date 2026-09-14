/** Miroir du `ChessInvitationDto` du back (voir ChessPlayerChannelStomp). */
export type ChessInvitationDto = {
  invitationId: string
  fromUserId: string
  fromUsername: string
  state: ChessInvitationState
  /** Camp choisi par l'inviteur ; l'invité joue l'autre. */
  fromSide: ChessSide
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

/** Destination des parties : démarrage (`matchStarted`) et fin (`matchEnded`)
 *  passent tous les deux par là, le `status` les sépare. */
export const CHESS_MATCHES = '/user/queue/chess.matches'

/** Destination des coups adverses. Le back n'y pousse que le camp d'en face :
 *  son propre coup, on le connaît déjà par la réponse HTTP. */
export const CHESS_MOVES = '/user/queue/chess.moves'

export type ChessSide = 'WHITE' | 'BLACK'

export type ChessMatchStatus = 'IN_PROGRESS' | 'CHECKMATE' | 'STALEMATE' | 'DRAW' | 'RESIGNED'

/** Miroir du `ChessMatchDto` du back. `fen` est la seule vérité sur la
 *  position : `sideToMove` en est relu, il n'est pas stocké.
 *
 *  Un camp tenu par un bot a son `*PlayerId` à `null` et son `*BotLevel`
 *  renseigné — les deux vont toujours ensemble. */
export type ChessMatchDto = {
  matchId: number
  fen: string
  sideToMove: ChessSide
  status: ChessMatchStatus
  winnerSide: ChessSide | null
  whitePlayerId: string
  whiteBotLevel: number | null
  blackPlayerId: string | null
  blackBotLevel: number | null
}

/** Miroir du `ChessMovePlayedDto` : le coup joué en UCI, et la partie telle
 *  qu'elle est *après* ce coup. */
export type ChessMovePlayedDto = {
  move: string
  match: ChessMatchDto
}
