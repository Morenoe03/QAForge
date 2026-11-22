import { apiFetch } from './request'

export interface UserProfile {
  username: string
  display_name: string
  email: string
}

export interface RegistrationInput extends UserProfile {
  password: string
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .replace(/\/$/, '')

async function responseError(response: Response): Promise<Error> {
  const body = (await response.json()) as {
    detail?: string | Array<{ msg?: string }>
  }
  const detail = Array.isArray(body.detail)
    ? body.detail.map((issue) => issue.msg).filter(Boolean).join(' ')
    : body.detail
  return new Error(detail || `Request failed with status ${response.status}`)
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const response = await apiFetch(`${apiBaseUrl}/api/auth/me`)
  if (response.status === 401) return null
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<UserProfile>
}

export async function login(
  username: string,
  password: string,
): Promise<UserProfile> {
  const response = await apiFetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<UserProfile>
}

export async function register(
  input: RegistrationInput,
): Promise<UserProfile> {
  const response = await apiFetch(`${apiBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<UserProfile>
}

export async function updateProfile(
  profile: Pick<UserProfile, 'display_name' | 'email'>,
): Promise<UserProfile> {
  const response = await apiFetch(`${apiBaseUrl}/api/auth/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<UserProfile>
}

export async function logout(): Promise<void> {
  const response = await apiFetch(`${apiBaseUrl}/api/auth/logout`, {
    method: 'POST',
  })
  if (!response.ok) throw await responseError(response)
}
