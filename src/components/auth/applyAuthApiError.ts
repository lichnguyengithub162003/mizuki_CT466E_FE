import type { ApplicationError } from '@/types/errors'

function isApplicationError(error: unknown): error is ApplicationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'ApplicationError'
  )
}

export function applyAuthApiError<TField extends string>(
  error: unknown,
  fieldAliases: Readonly<Record<string, TField>>,
  setFieldError: (field: TField, message: string | undefined) => void,
): { readonly formError: string; readonly retryAfter?: number } {
  if (!isApplicationError(error)) {
    return { formError: 'Đã xảy ra lỗi. Vui lòng thử lại.' }
  }

  for (const [backendField, messages] of Object.entries(error.validationErrors ?? {})) {
    const formField = fieldAliases[backendField]
    const message = messages.find((item) => item.trim().length > 0)
    if (formField && message) setFieldError(formField, message)
  }

  return {
    formError: error.message,
    retryAfter: error.retryAfter,
  }
}
