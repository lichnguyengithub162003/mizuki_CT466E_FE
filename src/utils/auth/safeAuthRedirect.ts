import { ROUTE_PATHS } from '@/constants/routes'

const AUTH_ROUTE_PATHS = new Set<string>([
  ROUTE_PATHS.onboarding,
  ROUTE_PATHS.login,
  ROUTE_PATHS.register,
  ROUTE_PATHS.forgotPassword,
  ROUTE_PATHS.verifyResetCode,
  ROUTE_PATHS.resetPassword,
  ROUTE_PATHS.googleCallback,
])

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/
const SCHEME_PATTERN = /[a-z][a-z\d+.-]*:\/\//i

function decodeForSafetyCheck(value: string): string | undefined {
  try {
    return decodeURIComponent(value)
  } catch {
    return undefined
  }
}

export function isSafeAuthRedirect(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return false
  }

  const decodedValue = decodeForSafetyCheck(value)
  if (
    !decodedValue ||
    decodedValue.startsWith('//') ||
    decodedValue.includes('\\') ||
    CONTROL_CHARACTER_PATTERN.test(decodedValue) ||
    SCHEME_PATTERN.test(decodedValue)
  ) {
    return false
  }

  const pathname = decodedValue.split(/[?#]/, 1)[0] ?? ''
  return !AUTH_ROUTE_PATHS.has(pathname)
}

export function resolveSafeAuthRedirect(
  value: unknown,
  fallback: string = '/home',
): string {
  return isSafeAuthRedirect(value) ? value : fallback
}
