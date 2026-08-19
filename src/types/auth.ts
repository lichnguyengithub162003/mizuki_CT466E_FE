export type AppRole = 'customer' | 'branch_manager' | 'super_admin'

export interface AuthenticatedUser {
  readonly id: number
  readonly name: string
  readonly email: string
  readonly phone: string | null
  readonly avatar: string | null
  readonly role: AppRole
  readonly role_label: string
  readonly branch_id: number | null
  readonly email_verified_at: string | null
  readonly created_at: string
}

export type LoginPayload =
  | {
      readonly email: string
      readonly phone?: never
      readonly password: string
    }
  | {
      readonly phone: string
      readonly email?: never
      readonly password: string
    }

export interface RegisterPayload {
  readonly name: string
  readonly email: string
  readonly phone: string
  readonly password: string
  readonly password_confirmation: string
}

export interface ForgotPasswordPayload {
  readonly email: string
}

export interface ForgotPasswordResult {
  readonly resend_after: number
  readonly expires_in: number
}

export interface VerifyResetCodePayload {
  readonly email: string
  readonly code: string
}

export interface VerifyResetCodeResult {
  readonly verification_token: string
  readonly expires_in: number
}

export interface ResetPasswordPayload {
  readonly email: string
  readonly verification_token: string
  readonly password: string
  readonly password_confirmation: string
}

export interface GoogleRedirectResult {
  readonly redirect_url: string
}
