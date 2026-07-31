import { focusFirstInvalidField } from '@/utils/forms'

export function focusFirstAuthFormError(): HTMLElement | null {
  if (typeof document === 'undefined') return null

  const fieldNames = Array.from(
    document.querySelectorAll<HTMLElement>('[aria-invalid="true"][name]'),
  )
    .map((field) => field.getAttribute('name'))
    .filter((name): name is string => Boolean(name))

  const invalidField = focusFirstInvalidField(fieldNames)
  if (invalidField) return invalidField

  const errorSummary = document.querySelector<HTMLElement>('[role="alert"][tabindex="-1"]')
  errorSummary?.focus()
  return errorSummary
}
