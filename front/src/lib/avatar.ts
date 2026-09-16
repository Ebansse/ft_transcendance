export function avatarSrc(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return null

  const trimmed = avatarUrl.trim()
  if (trimmed.length === 0) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}