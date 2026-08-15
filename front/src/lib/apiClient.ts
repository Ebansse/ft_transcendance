const BASE_URL = '/api'

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

type RequestOptions = Omit<RequestInit, 'body' | 'method'>

/** Un ObjectError Spring sérialisé (le body de `bindingResult.getAllErrors()`). */
type SpringError = { field?: string; defaultMessage?: string }

/** Un seul refresh à la fois : les requêtes qui se croisent attendent la même promesse. */
let refreshing: Promise<unknown> | null = null

function toJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    // JSON.parse lève une SyntaxError quand le body n'est pas du JSON.
    return null
  }
}

/** Forme 1 — erreurs `@Valid` : un tableau d'ObjectError, pas une map. */
function fromValidationArray(status: number, body: unknown): ApiError | null {
  if (!Array.isArray(body)) return null
  const errors = body as SpringError[]

  const fieldErrors: Record<string, string> = {}
  for (const item of errors) {
    if (item?.field && typeof item.defaultMessage === 'string') {
      fieldErrors[item.field] = item.defaultMessage
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return new ApiError(status, 'Données invalides.', fieldErrors)
  }

  const first = errors[0]?.defaultMessage
  return first ? new ApiError(status, first) : null
}

/** Formes 2 et 3 — `{ error: "…" }` sur IllegalArgumentException, ou une map champ → message. */
function fromErrorObject(status: number, body: unknown): ApiError | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>

  if (typeof record.error === 'string') return new ApiError(status, record.error)

  const fieldErrors: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') fieldErrors[key] = value
  }
  return Object.keys(fieldErrors).length > 0
    ? new ApiError(status, 'Données invalides.', fieldErrors)
    : null
}

/** Le back refuse de trois façons différentes ; on les essaie dans l'ordre,
 *  et à défaut on affiche le corps brut ou le code HTTP. */
async function parseError(res: Response): Promise<ApiError> {
  // On lit en texte : le back répond parfois en text/plain ("Invalid credentials").
  const raw = await res.text().catch(() => '')
  const body = toJson(raw)

  return (
    fromValidationArray(res.status, body) ??
    fromErrorObject(res.status, body) ??
    new ApiError(res.status, raw.trim() || `Erreur ${res.status} (${res.statusText}).`)
  )
}

/** Certaines routes répondent 204, un corps vide ou du text/plain ("Login successful") :
 *  parser en JSON d'office ferait planter une requête pourtant réussie. */
async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204 || res.headers.get('Content-Length') === '0') return undefined

  const text = await res.text()
  if (!text) return undefined
  if (!(res.headers.get('Content-Type') ?? '').includes('application/json')) return text
  return JSON.parse(text)
}

async function request<T>(
  path: string,
  method: string,
  body?: unknown,
  options: RequestOptions = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (body !== undefined) headers.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include', // indispensable pour le cookie de session / JWT
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Impossible de joindre le serveur.')
  }

  // Si l'access_token est expiré, on le rafraîchit avec le refresh_token (7 jours),
  // puis on rejoue la requête une fois.
  if ((res.status === 401 || res.status === 403) && !retried && !path.startsWith('/auth/')) {
    refreshing ??= request('/auth/refresh-token', 'POST').finally(() => {
      refreshing = null
    })
    try {
      await refreshing
    } catch {
      // Refresh token expiré ou révoqué : c'est une vraie déconnexion.
      throw await parseError(res)
    }
    return request<T>(path, method, body, options, true)
  }

  if (!res.ok) throw await parseError(res)

  return (await readBody(res)) as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, 'GET', undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, 'POST', body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, 'PUT', body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, 'PATCH', body, options),
  del: <T>(path: string, options?: RequestOptions) => request<T>(path, 'DELETE', undefined, options),
}
