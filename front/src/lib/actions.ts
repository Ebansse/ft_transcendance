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
