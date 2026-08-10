import { api } from "./apiClient"

export function handleAction(action: string) {
  console.log(`[action] ${action}`)
}

export type UserPublicProfileDto = {
  id: string,
  userName: string,
  email: string,
  online: string,
  avatarUrl: string,
  role: string | null,
  //private UserStatsDto    stats;
}

export function GetUserPublicProfile() {
  return api.get<UserPublicProfileDto>("/users/me")
}

/** Liste tous les comptes : le back réserve la route aux ADMIN. */
export function GetAllUserPublicProfiles() {
  return api.get<UserPublicProfileDto[]>("/users")
}

export type UpdateUserPayload = {
  userName: string,
  email: string,
  role: string,
}

/** Écrase pseudo, e-mail et rôle d'un compte ; renvoie le profil à jour. Réservé aux ADMIN. */
export function UpdateUser(idUser: string, payload: UpdateUserPayload) {
  return api.post<UserPublicProfileDto>(`/users/${idUser}`, payload)
}

/** Supprime un compte (et ses rôles, tokens et liens d'amitié). Réservé aux ADMIN. */
export function DeleteUser(idUser: string) {
  return api.post<void>(`/users/delete/${idUser}`)
}
