import type { ApiValidationErrors } from '@/types/api'

export type ApplicationErrorKind =
  | 'network'
  | 'timeout'
  | 'http'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'server'
  | 'unknown'

export interface ApplicationError {
  readonly name: 'ApplicationError'
  readonly kind: ApplicationErrorKind
  readonly message: string
  readonly status?: number
  readonly retryAfter?: number
  readonly validationErrors?: ApiValidationErrors
  readonly cause: unknown
}
