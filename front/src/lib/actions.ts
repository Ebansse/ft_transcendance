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
