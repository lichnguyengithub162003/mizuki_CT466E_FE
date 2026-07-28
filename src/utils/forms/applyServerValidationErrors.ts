import type {
  FormFieldErrors,
  ServerValidationResult,
  ServerValidationSource,
} from '@/types/forms'
import { normalizeFieldPath } from './normalizeFieldPath'

function firstMessage(value: string | readonly string[] | undefined): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  return value?.find((message) => message.trim().length > 0)
}

/**
 * Maps only registered backend fields and returns remaining feedback at form level.
 */
export function applyServerValidationErrors<TField extends string>(
  error: ServerValidationSource,
  registeredFields: readonly TField[],
  setFieldError: (field: TField, message: string | undefined) => void,
): ServerValidationResult {
  const knownFields = new Map(
    registeredFields.map((field) => [normalizeFieldPath(field), field] as const),
  )
  const fieldErrors: Record<string, string> = {}
  const formMessages: string[] = []

  for (const [rawPath, rawMessages] of Object.entries(error.validationErrors ?? {})) {
    const path = normalizeFieldPath(rawPath)
    const message = firstMessage(rawMessages)
    if (!message) continue

    const registeredField = knownFields.get(path)
    if (registeredField) {
      setFieldError(registeredField, message)
      fieldErrors[path] = message
    } else {
      formMessages.push(message)
    }
  }

  if (error.message.trim()) formMessages.unshift(error.message.trim())

  return {
    fieldErrors: fieldErrors satisfies FormFieldErrors,
    formError: [...new Set(formMessages)].join(' ') || undefined,
  }
}
