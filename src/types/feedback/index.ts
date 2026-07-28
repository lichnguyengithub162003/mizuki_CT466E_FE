export type AsyncStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export type AsyncErrorKind = 'network' | 'permission' | 'validation' | 'server' | 'unknown'

export interface AsyncError {
  kind: AsyncErrorKind
  title: string
  message: string
  retryable: boolean
  statusCode?: number
  details?: Readonly<Record<string, unknown>>
}

export interface AsyncState<T> {
  status: AsyncStatus
  data: T | null
  error: AsyncError | null
  isRefreshing: boolean
  lastUpdatedAt?: Date
}
