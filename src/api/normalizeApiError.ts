import axios from 'axios'
import type { ApiValidationErrors } from '@/types/api'
import type { ApplicationError, ApplicationErrorKind } from '@/types/errors'

const FALLBACK_MESSAGES: Readonly<Record<ApplicationErrorKind, string>> = {
  network: 'Không thể kết nối đến máy chủ.',
  timeout: 'Yêu cầu đã hết thời gian chờ.',
  http: 'Yêu cầu không thể được xử lý.',
  validation: 'Dữ liệu gửi lên chưa hợp lệ.',
  unauthorized: 'Bạn cần đăng nhập để tiếp tục.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  'not-found': 'Không tìm thấy dữ liệu yêu cầu.',
  server: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
  unknown: 'Đã xảy ra lỗi không xác định.',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readMessage(data: unknown): string | undefined {
  if (!isRecord(data) || typeof data.message !== 'string') {
    return undefined
  }

  const message = data.message.trim()
  return message.length > 0 ? message : undefined
}

function readValidationErrors(data: unknown): ApiValidationErrors | undefined {
  if (!isRecord(data) || !isRecord(data.errors)) {
    return undefined
  }

  const validationErrors: Record<string, readonly string[]> = {}

  for (const [field, messages] of Object.entries(data.errors)) {
    if (typeof messages === 'string') {
      validationErrors[field] = [messages]
      continue
    }

    if (Array.isArray(messages) && messages.every((message) => typeof message === 'string')) {
      validationErrors[field] = messages
    }
  }

  return Object.keys(validationErrors).length > 0 ? validationErrors : undefined
}

function kindFromStatus(status: number): ApplicationErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not-found'
  if (status === 422) return 'validation'
  if (status >= 500) return 'server'
  return 'http'
}

function createApplicationError(
  kind: ApplicationErrorKind,
  cause: unknown,
  options: {
    readonly message?: string
    readonly status?: number
    readonly validationErrors?: ApiValidationErrors
  } = {},
): ApplicationError {
  return {
    name: 'ApplicationError',
    kind,
    message: options.message ?? FALLBACK_MESSAGES[kind],
    status: options.status,
    validationErrors: options.validationErrors,
    cause,
  }
}

export function normalizeApiError(error: unknown): ApplicationError {
  if (!axios.isAxiosError(error)) {
    return createApplicationError('unknown', error)
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return createApplicationError('timeout', error)
  }

  if (!error.response) {
    return createApplicationError('network', error)
  }

  const { status, data } = error.response
  const kind = kindFromStatus(status)

  return createApplicationError(kind, error, {
    status,
    message: readMessage(data),
    validationErrors: kind === 'validation' ? readValidationErrors(data) : undefined,
  })
}
