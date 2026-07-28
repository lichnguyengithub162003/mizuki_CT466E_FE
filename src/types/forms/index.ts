import type { ApplicationError } from '@/types/errors'

export interface FormOption<TValue extends string = string> {
  readonly label: string
  readonly value: TValue
  readonly description?: string
  readonly disabled?: boolean
}

export type FormFieldErrors = Readonly<Record<string, string | undefined>>

export interface ServerValidationSource
  extends Pick<ApplicationError, 'message'> {
  readonly validationErrors?: Readonly<
    Record<string, string | readonly string[] | undefined>
  >
}

export interface ServerValidationResult {
  readonly fieldErrors: FormFieldErrors
  readonly formError?: string
}

