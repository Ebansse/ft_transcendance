const BASE_URL = "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type RequestOptions = Omit<RequestInit, "body" | "method">;

let refreshing: Promise<unknown> | null = null;

/** Forme d'un ObjectError Spring sérialisé (body de `bindingResult.getAllErrors()`). */
type SpringError = { field?: string; defaultMessage?: string };

async function parseError(res: Response): Promise<ApiError> {
  // On lit en texte : le back répond parfois en text/plain ("Invalid credentials").
  const raw = await res.text().catch(() => "");

  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    // try/catch obligatoire, JSON.parse raise un SyntaxError si le body n'est pas un json
  }

  // Erreurs de validation @Valid : un tableau d'ObjectError, pas une map.
  if (Array.isArray(body)) {
    const fieldErrors: Record<string, string> = {};
    for (const item of body as SpringError[]) {
      if (item?.field && typeof item.defaultMessage === "string") {
        fieldErrors[item.field] = item.defaultMessage;
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      return new ApiError(res.status, "Données invalides.", fieldErrors);
    }
    const first = (body as SpringError[])[0]?.defaultMessage;
    if (first) return new ApiError(res.status, first);
  }

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;

    // Le back renvoie { "error": "message" } sur IllegalArgumentException
    if (typeof record.error === "string") {
      return new ApiError(res.status, record.error);
    }

    // ou une map { champ: message } sur erreur de validation (400)
    const fieldErrors: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string") fieldErrors[key] = value;
    }
    if (Object.keys(fieldErrors).length > 0) {
      return new ApiError(res.status, "Données invalides.", fieldErrors);
    }
  }

  if (raw.trim()) return new ApiError(res.status, raw.trim());

  return new ApiError(res.status, `Erreur ${res.status} (${res.statusText}).`);
}

async function request<T>(
  path: string,
  method: string,
  body?: unknown,
  options: RequestOptions = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      method,
      headers,
      credentials: "include", // indispensable pour le cookie de session / JWT
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Impossible de joindre le serveur.");
  }

  // si l'access_token est expiré, on tente de le rafraîchir avec le refresh_token (7 jours)
  if ((res.status === 401 || res.status === 403) && !retried && !path.startsWith("/auth/")) {
    refreshing ??= request("/auth/refresh-token", "POST").finally(() => {
      refreshing = null;
    });
    try {
      await refreshing;
    } catch {
      // Refresh token expiré ou révoqué : c'est une vraie déconnexion.
      throw await parseError(res);
    }
    return request<T>(path, method, body, options, true);
  }

  if (!res.ok) throw await parseError(res);

  if (res.status === 204 || res.headers.get("Content-Length") === "0") {
    return undefined as T;
  }

  // Certaines routes répondent en text/plain ("Login successful") : parser en
  // JSON d'office ferait planter une requête pourtant réussie.
  const text = await res.text();
  if (!text) return undefined as T;
  if (!(res.headers.get("Content-Type") ?? "").includes("application/json")) {
    return text as T;
  }
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, "GET", undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, "POST", body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, "PUT", body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, "PATCH", body, options),
  del: <T>(path: string, options?: RequestOptions) => request<T>(path, "DELETE", undefined, options),
};
