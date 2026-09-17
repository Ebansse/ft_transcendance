import { api } from './apiClient.ts'
import type { UserPublicProfileDto } from './actions.ts'

export type UserExportDto = {
  exportedAt: string
  profile: UserPublicProfileDto
  friends: unknown[]
  messages: unknown[]
  chessMatches: unknown[]
}

export function exportMyData() {
  return api.get<UserExportDto>('/users/me/export')
}

export function deleteMyAccount() {
  return api.post<void>('/users/me/delete')
}

export function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}