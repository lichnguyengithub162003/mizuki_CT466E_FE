export type ApiValidationErrors = Readonly<Record<string, readonly string[]>>

export interface PaginationMeta {
  readonly currentPage?: number
  readonly lastPage?: number
  readonly perPage?: number
  readonly total?: number
  readonly [key: string]: unknown
}

export interface ApiMeta {
  readonly pagination?: PaginationMeta
  readonly [key: string]: unknown
}

/**
 * Foundation response envelope. Endpoint-specific contracts may override this
 * shape when the backend contract is verified.
 */
export interface ApiResponse<T> {
  readonly success?: boolean
  readonly data: T
  readonly message?: string
  readonly meta?: ApiMeta
}

export interface ApiErrorResponse {
  readonly success?: false
  readonly message?: string
  readonly errors?: ApiValidationErrors
  readonly data?: unknown
}

export type Nullable<T> = T | null
