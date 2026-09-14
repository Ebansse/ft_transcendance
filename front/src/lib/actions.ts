import { api } from './apiClient.ts'
import type { ChessInvitationDto, ChessMatchDto, ChessSide } from './chessClient.ts'

/** Placeholder : les onglets et boutons pas encore branchés passent par ici. */
export function handleAction(action: string) {
  console.log(`[action] ${action}`)
}

/** Miroir du `UserPublicProfileDto` du back. `online` est un `Instant` Java,
 *  donc une date ISO — `null` tant que le compte ne s'est jamais connecté. */
export type UserPublicProfileDto = {
  id: string
  userName: string
  email: string
  online: string | null
  avatarUrl: string | null
  role: string | null
}

/** Les trois champs qu'un ADMIN peut réécrire sur un compte. */
export type UpdateUserPayload = {
  userName: string
  email: string
  role: string
}

/** Ce qu'un utilisateur peut changer sur son propre compte (hors avatar). Le
 *  back n'expose pas de changement de mot de passe. */
export type UpdateProfilePayload = {
  userName: string
  email: string
}

/** Profil de l'utilisateur connecté, identifié par son cookie. */
export function getMyProfile() {
  return api.get<UserPublicProfileDto>('/users/me')
}

/** Profil public d'un autre compte : le back n'expose que ces champs-là. */
export function getUserProfile(idUser: string) {
  return api.get<UserPublicProfileDto>(`/users/${idUser}`)
}

/** Met à jour son propre pseudo et e-mail. Le back autorise cette route (PUT)
 *  au propriétaire du compte comme à un ADMIN ; renvoie le profil à jour. */
export function updateMyProfile(idUser: string, payload: UpdateProfilePayload) {
  return api.put<UserPublicProfileDto>(`/users/${idUser}`, payload)
}

/** Remplace son avatar : le back stocke le fichier, supprime l'ancien et renvoie
 *  le profil à jour. NB : le service des images (`GET`) n'est pas encore câblé
 *  entre le front et le back — l'upload aboutit mais l'aperçu peut rester cassé. */
export function uploadMyAvatar(file: File) {
  const form = new FormData()
  form.append('file', file)
  return api.postForm<UserPublicProfileDto>('/users/me/avatar', form)
}

/** Tous les comptes : le back réserve la route aux ADMIN. */
export function getAllUsers() {
  return api.get<UserPublicProfileDto[]>('/users')
}

/** Écrase pseudo, e-mail et rôle ; renvoie le profil à jour. Réservé aux ADMIN. */
export function updateUser(idUser: string, payload: UpdateUserPayload) {
  return api.post<UserPublicProfileDto>(`/users/${idUser}`, payload)
}

/** Supprime un compte (et ses rôles, tokens et liens d'amitié). Réservé aux ADMIN.
 *  Le back expose cette route en POST, pas en DELETE. */
export function deleteUser(idUser: string) {
  return api.post<void>(`/users/delete/${idUser}`)
}

/** Statuts d'une ligne de `friend_list`, côté back un enum `FriendshipStatus`. */
export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED'

/** Miroir du `FriendListDto`. Une ligne = la relation vue depuis le compte
 *  connecté : `idUser` et `userName` désignent toujours *l'autre* personne, et
 *  `idUser` est l'UUID que prennent toutes les routes d'action. `createAt` (sic,
 *  la faute vient du back) est un `LocalDateTime` Java, donc une date ISO sans
 *  fuseau.
 *
 *  `senderId` vaut soit notre propre id, soit `idUser` : c'est ce qui sépare une
 *  demande reçue (`senderId === idUser`) d'une demande envoyée. */
export type FriendListDto = {
  idUser: string
  userName: string
  createAt: string | null
  status: FriendshipStatus
  senderId: string
}

/** Toutes les relations du compte connecté, tous statuts confondus. */
export function getFriendList() {
  return api.get<FriendListDto[]>('/friend-list/me/list')
}

/** Demande d'ami par pseudo : le back n'expose pas de recherche d'utilisateur. */
export function sendFriendRequest(userName: string) {
  return api.post<void>('/friend-list/send-request', { userName })
}

/** Accepte une demande reçue. Le back refuse si c'est nous qui l'avons envoyée. */
export function acceptFriendRequest(idUser: string) {
  return api.post<void>(`/friend-list/${idUser}/accept`)
}

/** Refuse une demande reçue, ou annule une demande qu'on a envoyée : le back
 *  passe la ligne PENDING en DECLINED sans regarder qui est l'expéditeur. */
export function declineFriendRequest(idUser: string) {
  return api.post<void>(`/friend-list/${idUser}/decline`)
}

/** Retire un ami. Le back exige une relation ACCEPTED. */
export function deleteFriend(idUser: string) {
  return api.post<void>(`/friend-list/${idUser}/delete`)
}

/** Bloque un compte : la relation passe en BLOCKED (pas de déblocage côté back). */
export function blockUser(idUser: string) {
  return api.post<void>(`/friend-list/${idUser}/block`)
}

/** Invite un adversaire par pseudo : le back retrouve le compte, refuse l'auto-
 *  invitation et renvoie l'invitation créée (`ChessInvitationDto`). `side` est
 *  le camp de l'inviteur, `null` pour un tirage au sort côté back : l'invité
 *  prendra l'autre à l'acceptation. Le camp retenu revient dans `fromSide`. */
export function sendChessInvitation(opponentUsername: string, side: ChessSide | null) {
  return api.post<ChessInvitationDto>('/chess/invitations', { opponentUsername, side })
}

/** Invitations reçues et encore valides, dans le format exact des messages
 *  poussés sur la socket : le client n'a qu'une seule forme à lire. */
export function getPendingChessInvitations() {
  return api.get<ChessInvitationDto[]>('/chess/invitations/pending')
}

/** Accepte l'invitation de `opponentUsername` : le back crée la partie, la
 *  renvoie, et pousse le même match à l'adversaire sur `chess.matches`. */
export function acceptChessInvitation(opponentUsername: string) {
  return api.post<ChessMatchDto>('/chess/invitations/accept', { opponentUsername })
}

/** Refuse l'invitation : le back la retire et pousse un `DECLINED` à l'inviteur. */
export function declineChessInvitation(opponentUsername: string) {
  return api.post<void>('/chess/invitations/decline', { opponentUsername })
}

/** Ouvre une partie contre le bot, dans le camp demandé. Le back renvoie la
 *  partie prête à jouer : si le joueur a pris les noirs, le `fen` contient
 *  **déjà** le coup d'ouverture du bot, il n'y a rien à demander de plus.
 *
 *  Refusé en 409 tant qu'une autre partie est en cours, comme une invitation. */
export function createBotMatch(side: ChessSide, botLvl: number) {
  return api.post<ChessMatchDto>('/chess/bot/createBotMatch', { side, botLvl })
}

/** Partie en cours du compte connecté. Le back répond **404** quand il n'y en a
 *  pas : c'est un cas normal, pas une panne. */
export function getMyChessMatch() {
  return api.get<ChessMatchDto>('/chess/matches/me')
}

/** Joue un coup en UCI (`e2e4`, `e7e8q` pour une promotion) — exactement le
 *  `lan` de chess.js. Renvoie la partie après le coup. */
export function playChessMove(matchId: number, move: string) {
  return api.post<ChessMatchDto>(`/chess/matches/${matchId}/moves`, { move })
}

/** Abandonne : seule sortie d'une partie en cours, et la seule façon de
 *  libérer les deux joueurs pour une nouvelle invitation. */
export function resignChessMatch(matchId: number) {
  return api.post<ChessMatchDto>(`/chess/matches/${matchId}/resign`)
}
