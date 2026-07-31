import { readonly, reactive } from 'vue'

interface PasswordRecoveryState {
  email: string
  requestCompleted: boolean
  verificationToken: string
  resendAvailableAt: number
  requestExpiresAt: number
  verificationExpiresAt: number
}

const state = reactive<PasswordRecoveryState>({
  email: '',
  requestCompleted: false,
  verificationToken: '',
  resendAvailableAt: 0,
  requestExpiresAt: 0,
  verificationExpiresAt: 0,
})

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function maskRecoveryEmail(email: string): string {
  const [localPart = '', domain = ''] = normalizeAuthEmail(email).split('@')
  if (!localPart || !domain) return email
  const visible = localPart.slice(0, Math.min(2, localPart.length))
  return `${visible}${'*'.repeat(Math.max(3, localPart.length - visible.length))}@${domain}`
}

export function canAccessResetCode(): boolean {
  return state.requestCompleted && Boolean(state.email)
}

export function canAccessResetPassword(): boolean {
  return canAccessResetCode() && Boolean(state.verificationToken)
}

export function usePasswordRecovery() {
  function startRequest(email: string, resendAfter: number, expiresIn: number): void {
    state.email = normalizeAuthEmail(email)
    state.requestCompleted = true
    state.verificationToken = ''
    state.resendAvailableAt = Date.now() + resendAfter * 1000
    state.requestExpiresAt = Date.now() + expiresIn * 1000
    state.verificationExpiresAt = 0
  }

  function completeVerification(verificationToken: string, expiresIn: number): void {
    state.verificationToken = verificationToken
    state.verificationExpiresAt = Date.now() + expiresIn * 1000
  }

  function restartResendCountdown(resendAfter: number, expiresIn: number): void {
    state.resendAvailableAt = Date.now() + resendAfter * 1000
    state.requestExpiresAt = Date.now() + expiresIn * 1000
  }

  function prepareEmailChange(): void {
    state.requestCompleted = false
    state.verificationToken = ''
    state.resendAvailableAt = 0
    state.requestExpiresAt = 0
    state.verificationExpiresAt = 0
  }

  function clear(): void {
    state.email = ''
    state.requestCompleted = false
    state.verificationToken = ''
    state.resendAvailableAt = 0
    state.requestExpiresAt = 0
    state.verificationExpiresAt = 0
  }

  return {
    state: readonly(state),
    startRequest,
    completeVerification,
    restartResendCountdown,
    prepareEmailChange,
    clear,
  }
}
