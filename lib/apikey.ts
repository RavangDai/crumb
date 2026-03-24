export type AIProvider = 'gemini' | 'openai' | 'anthropic'

const KEY_PREFIX    = 'crumbcraft_key_'
const PROVIDER_KEY  = 'crumbcraft_provider'

export function getUserProvider(): AIProvider {
  if (typeof window === 'undefined') return 'gemini'
  return (localStorage.getItem(PROVIDER_KEY) as AIProvider) || 'gemini'
}

export function setUserProvider(provider: AIProvider): void {
  localStorage.setItem(PROVIDER_KEY, provider)
}

/** Returns the stored key for the currently active provider */
export function getUserApiKey(): string {
  if (typeof window === 'undefined') return ''
  return getApiKeyForProvider(getUserProvider())
}

export function getApiKeyForProvider(provider: AIProvider): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(`${KEY_PREFIX}${provider}`) || ''
}

export function setApiKeyForProvider(key: string, provider: AIProvider): void {
  if (key.trim()) {
    localStorage.setItem(`${KEY_PREFIX}${provider}`, key.trim())
  } else {
    localStorage.removeItem(`${KEY_PREFIX}${provider}`)
  }
}
