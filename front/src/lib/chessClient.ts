/** Miroir du `ChessInvitationDto` du back (voir ChessPlayerChannelStomp). */
export type ChessInvitationDto = {
  invitationId: string
  fromUserId: string
  fromUsername: string
  state: ChessInvitationState
  /** Camp choisi par l'inviteur ; l'invité joue l'autre. */
  fromSide: ChessSide
}

/** `ACCEPTED` n'est jamais poussé ici : une acceptation arrive sous la forme
 *  d'un match démarré. */
export type ChessInvitationState = 'PENDING' | 'DECLINED'

/** Une seule queue pour les deux sens, l'état les sépare : `PENDING` arrive chez
 *  l'invité, `DECLINED` chez l'inviteur. */
export const CHESS_INVITATIONS = '/user/queue/chess.invitations'

/** Démarrage et fin de partie passent tous deux par là, le `status` les sépare. */
export const CHESS_MATCHES = '/user/queue/chess.matches'

/** Le back n'y pousse que le coup d'en face : le sien, on le connaît déjà par la
 *  réponse HTTP. */
export const CHESS_MOVES = '/user/queue/chess.moves'

export type ChessSide = 'WHITE' | 'BLACK'

export type ChessMatchStatus = 'IN_PROGRESS' | 'CHECKMATE' | 'STALEMATE' | 'DRAW' | 'RESIGNED'

/** `fen` est la seule vérité sur la position ; `sideToMove` en est relu.
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

/** Le coup joué en UCI, et la partie telle qu'elle est *après* ce coup. */
export type ChessMovePlayedDto = {
  move: string
  match: ChessMatchDto
}
