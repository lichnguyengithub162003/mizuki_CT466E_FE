import { createFormFieldId, normalizeFieldPath } from './normalizeFieldPath'

/**
 * Focuses the first matching invalid control and stays safe during SSR.
 */
export function focusFirstInvalidField(
  fieldNames: readonly string[],
  root?: Document | HTMLElement,
): HTMLElement | null {
  if (typeof document === 'undefined') return null

  const focusRoot = root ?? document
  const ownerDocument = focusRoot instanceof Document ? focusRoot : focusRoot.ownerDocument

  for (const fieldName of fieldNames) {
    const normalizedName = normalizeFieldPath(fieldName)
    const byId = ownerDocument.getElementById(createFormFieldId(normalizedName))
    const named = ownerDocument.getElementsByName(normalizedName).item(0)
    const candidate = byId ?? named

    if (
      candidate instanceof HTMLElement &&
      (focusRoot instanceof Document || focusRoot.contains(candidate))
    ) {
      candidate.focus()
      return candidate
    }
  }

  return null
}

