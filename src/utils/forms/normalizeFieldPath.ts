const BRACKET_SEGMENT_PATTERN = /\[(['"]?)([^'"\]]+)\1\]/g

/**
 * Converts common backend bracket paths to VeeValidate dot notation.
 */
export function normalizeFieldPath(path: string): string {
  return path
    .trim()
    .replace(BRACKET_SEGMENT_PATTERN, '.$2')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.')
}

export function createFormFieldId(path: string): string {
  const safePath = normalizeFieldPath(path).replace(/[^a-zA-Z0-9_-]+/g, '-')
  return `form-field-${safePath}`
}

