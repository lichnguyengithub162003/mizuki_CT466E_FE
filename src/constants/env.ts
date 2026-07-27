export interface EnvironmentSource {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SANCTUM_BASE_URL?: string
}

export interface AppEnvironment {
  readonly apiBaseUrl: string
  readonly sanctumBaseUrl: string
}

function resolveEnvironmentValue(
  value: string | undefined,
  variableName: keyof EnvironmentSource,
): string {
  if (value === undefined) {
    throw new Error(`${variableName} is required.`)
  }

  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    throw new Error(`${variableName} must not be empty.`)
  }

  return trimmedValue
}

function assertHttpProtocol(url: URL, variableName: keyof EnvironmentSource): void {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${variableName} must use the http or https protocol.`)
  }
}

export function normalizeApiBaseUrl(value: string): string {
  if (value.startsWith('/')) {
    if (value.startsWith('//') || value.includes('?') || value.includes('#')) {
      throw new Error('VITE_API_BASE_URL must be a valid relative path or HTTP URL.')
    }

    return value === '/' ? value : value.replace(/\/+$/, '')
  }

  const url = new URL(value)
  assertHttpProtocol(url, 'VITE_API_BASE_URL')

  if (url.search || url.hash) {
    throw new Error('VITE_API_BASE_URL must not contain a query string or hash.')
  }

  const pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '')
  return `${url.origin}${pathname}`
}

export function normalizeSanctumOrigin(value: string): string {
  const url = new URL(value)
  assertHttpProtocol(url, 'VITE_SANCTUM_BASE_URL')

  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_SANCTUM_BASE_URL must be an HTTP origin without path or credentials.')
  }

  return url.origin
}

export function createAppEnvironment(source: EnvironmentSource): AppEnvironment {
  const apiBaseUrl = resolveEnvironmentValue(
    source.VITE_API_BASE_URL,
    'VITE_API_BASE_URL',
  )
  const sanctumBaseUrl = resolveEnvironmentValue(
    source.VITE_SANCTUM_BASE_URL,
    'VITE_SANCTUM_BASE_URL',
  )

  return {
    apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl),
    sanctumBaseUrl: normalizeSanctumOrigin(sanctumBaseUrl),
  }
}

export function readAppEnvironment(): AppEnvironment {
  return createAppEnvironment(import.meta.env)
}
