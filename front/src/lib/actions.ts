import { api } from './apiClient.ts'
import type { ChessInvitationDto, ChessMatchDto, ChessSide } from './chessClient.ts'

/** Miroir du `UserPublicProfileDto` du back. `online` est une date ISO, `null`
 *  tant que le compte ne s'est jamais connecté. `twoFactorEnabled` et
 *  `oauth42Linked` ne sont renseignés que par `/users/me`. */
export type UserPublicProfileDto = {
  id: string
  userName: string
  email: string
  online: string | null
  avatarUrl: string | null
  role: string | null
  twoFactorEnabled: boolean | null
  oauth42Linked: boolean | null
}

/** QR code (PNG en data URI) et secret en clair, pour qui ne peut pas scanner. */
export type TwoFactorSetupDto = {
  qrCodeDataUri: string
  secret: string
}

/** Génère un nouveau secret TOTP. L'A2F reste inactive tant qu'`enableTwoFactor`
 *  n'a pas reçu un premier code valide. */
export function setupTwoFactor() {
  return api.post<TwoFactorSetupDto>('/auth/2fa/setup')
}

export function enableTwoFactor(code: string) {
  return api.post<void>('/auth/2fa/enable', { code })
}

/** Le back exige un code valide et efface le secret. */
export function disableTwoFactor(code: string) {
  return api.post<void>('/auth/2fa/disable', { code })
}

/** Les trois champs qu'un ADMIN peut réécrire sur un compte. */
export type UpdateUserPayload = {
  userName: string
  email: string
  role: string
}

/** Ce qu'un utilisateur peut changer sur son propre compte (hors avatar). */
export type UpdateProfilePayload = {
  userName: string
  email: string
}

export function getMyProfile() {
  return api.get<UserPublicProfileDto>('/users/me')
}

export function getUserProfile(idUser: string) {
  return api.get<UserPublicProfileDto>(`/users/${idUser}`)
}

/** Route ouverte au propriétaire du compte comme à un ADMIN. */
export function updateMyProfile(idUser: string, payload: UpdateProfilePayload) {
  return api.put<UserPublicProfileDto>(`/users/${idUser}`, payload)
}

export function uploadMyAvatar(file: File) {
  const form = new FormData()
  form.append('file', file)
  return api.postForm<UserPublicProfileDto>('/users/me/avatar', form)
}

/** Réservé aux ADMIN. */
export function getAllUsers() {
  return api.get<UserPublicProfileDto[]>('/users')
}

/** Réservé aux ADMIN : écrase pseudo, e-mail et rôle. */
export function updateUser(idUser: string, payload: UpdateUserPayload) {
  return api.post<UserPublicProfileDto>(`/users/${idUser}`, payload)
}

/** Réservé aux ADMIN. Le back expose cette route en POST, pas en DELETE. */
export function deleteUser(idUser: string) {
  return api.post<void>(`/users/delete/${idUser}`)
}

export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED'

/** Une relation vue depuis le compte connecté : `idUser` et `userName`
 *  désignent toujours *l'autre* personne.
 *
 *  `senderId` vaut soit notre propre id, soit `idUser` : c'est ce qui sépare une
 *  demande reçue (`senderId === idUser`) d'une demande envoyée.
 *
 *  `blockerId` n'est renseigné que sur une ligne BLOCKED : seul le compte qui a
 *  bloqué voit la ligne dans ses bloqués. */
export type FriendListDto = {
  idUser: string
  userName: string
  createAt: string | null
  status: FriendshipStatus
  senderId: string
  blockerId: string | null
}

export function getFriendList() {
  return api.get<FriendListDto[]>('/friend-list/me/list')
}

/** Par pseudo : le back n'expose pas de recherche d'utilisateur. */
export function sendFriendRequest(userName: string) {
  return api.post<void>('/friend-list/send-request', { userName })
}

export function acceptFriendRequest(idUser: string) {
  return api.post<void>(`/friend-list/${idUser}/accept`)
}

/** Refuse une demande reçue, ou annule une demande qu'on a envoyée. */
export function declineFriendRequest(idUser: string) {
  return api.post<void>(`/friend-list/${idUser}/decline`)
}

export function deleteFriend(idUser: string) {
  return api.post<void>(`/friend-list/${idUser}/delete`)
}

export function blockUser(idUser: string) {
  return api.post<void>(`/friend-list/${idUser}/block`)
}

/** Supprime la relation : il faudra renvoyer une demande pour redevenir amis. */
export function unblockUser(idUser: string) {
  return api.post<void>(`/friend-list/${idUser}/unblock`)
}

/** `side` est le camp de l'inviteur, `null` pour un tirage au sort côté back.
 *  Le camp retenu revient dans `fromSide`. */
export function sendChessInvitation(opponentUsername: string, side: ChessSide | null) {
  return api.post<ChessInvitationDto>('/chess/invitations', { opponentUsername, side })
}

export function getPendingChessInvitations() {
  return api.get<ChessInvitationDto[]>('/chess/invitations/pending')
}

/** Le back crée la partie et pousse le même match à l'adversaire. */
export function acceptChessInvitation(opponentUsername: string) {
  return api.post<ChessMatchDto>('/chess/invitations/accept', { opponentUsername })
}

export function declineChessInvitation(opponentUsername: string) {
  return api.post<void>('/chess/invitations/decline', { opponentUsername })
}

/** Si le joueur a pris les noirs, le `fen` renvoyé contient **déjà** le coup
 *  d'ouverture du bot. Refusé en 409 tant qu'une autre partie est en cours. */
export function createBotMatch(side: ChessSide, botLvl: number) {
  return api.post<ChessMatchDto>('/chess/bot/createBotMatch', { side, botLvl })
}

/** Le back répond **404** quand il n'y a pas de partie : c'est un cas normal. */
export function getMyChessMatch() {
  return api.get<ChessMatchDto>('/chess/matches/me')
}

/** Coup en UCI (`e2e4`, `e7e8q` pour une promotion) — le `lan` de chess.js. */
export function playChessMove(matchId: number, move: string) {
  return api.post<ChessMatchDto>(`/chess/matches/${matchId}/moves`, { move })
}

/** Seule sortie d'une partie en cours, et seule façon de libérer les deux
 *  joueurs pour une nouvelle invitation. */
export function resignChessMatch(matchId: number) {
  return api.post<ChessMatchDto>(`/chess/matches/${matchId}/resign`)
}

export type ChessPlayerStatDto = {
  playerName: string
  winCount: number
  lossCount: number
  drawCount: number
}

export type ChessResult = 'WIN' | 'LOSS' | 'DRAW'

/** `player1` tenait les blancs, `player2` les noirs ; le back met « Bot » à la
 *  place du moteur. */
export type ChessHistoryDto = {
  chessMatchId: number
  fen: string
  player1: string
  player2: string
  result: ChessResult
  createdAt: string
  endedAt: string | null
}

export function getMyChessStats() {
  return api.get<ChessPlayerStatDto>('/chess/stats/me')
}

export function getMyChessHistory() {
  return api.get<ChessHistoryDto[]>('/chess/historique/me')
}

/** `GET /auth/42/login` répond une redirection vers l'intra : il faut une vraie
 *  navigation du navigateur, pas un fetch, qui la suivrait en CORS. */
export function loginWith42() {
  window.location.href = '/api/auth/42/login'
}

/** Même contrainte que `loginWith42`, et seul chemin pour réconcilier les deux
 *  comptes : le callback refuse de fusionner sur l'e-mail. Retour sur
 *  `/profile?linked=42` ou `?error=…`. */
export function link42Account() {
  window.location.href = '/api/auth/42/link'
}

/** 409 si le compte est né du flux 42 : son mot de passe est un UUID aléatoire,
 *  le délier le rendrait inaccessible. */
export function unlink42Account() {
  return api.post<void>('/auth/42/unlink')
}
