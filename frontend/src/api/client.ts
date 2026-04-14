export class ApiError extends Error {
  readonly code: string
  readonly details?: Record<string, string>
  readonly status?: number

  constructor(
    code: string,
    message: string,
    details?: Record<string, string>,
    status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (res.status === 204) return undefined as T

  const json = await res.json()

  if (!res.ok) {
    const err = json?.error ?? {}
    throw new ApiError(
      err.code ?? 'unknown',
      err.message ?? `HTTP ${res.status}`,
      err.details,
      res.status,
    )
  }

  return json as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
