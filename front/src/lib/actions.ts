import { api } from './apiClient.ts'

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

/** Profil de l'utilisateur connecté, identifié par son cookie. */
export function getMyProfile() {
  return api.get<UserPublicProfileDto>('/users/me')
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
 *  connecté : `userName` désigne toujours *l'autre* personne. `createAt` (sic,
 *  la faute vient du back) est un `LocalDateTime` Java, donc une date ISO sans
 *  fuseau.
 *
 *  Le back ne renvoie ni l'`id` du contact ni l'auteur de la demande, alors que
 *  toutes les routes d'action prennent un UUID : la page résout l'id par pseudo
 *  via `getAllUsers()`, et ne peut pas distinguer une demande reçue d'une
 *  demande envoyée. */
export type FriendListDto = {
  userName: string
  createAt: string | null
  status: FriendshipStatus
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

/** Refuse une demande reçue, ou annule une demande qu'on a envoyée :
 *  le back passe la ligne en DECLINED dans les deux cas. */
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
