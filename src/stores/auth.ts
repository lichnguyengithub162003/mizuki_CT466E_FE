import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getCurrentUser,
  login as loginRequest,
  staffLogin as staffLoginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '@/api/auth/authApi'
import type { AuthenticatedUser, LoginPayload, RegisterPayload } from '@/types/auth'
import type { ApplicationError } from '@/types/errors'

let sessionRestorePromise: Promise<void> | undefined

function isUnauthorized(error: unknown): error is ApplicationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'ApplicationError' &&
    'kind' in error &&
    error.kind === 'unauthorized'
  )
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthenticatedUser | null>(null)
  const isInitializing = ref(false)
  const isInitialized = ref(false)
  const isAuthenticated = computed(() => user.value !== null)
  const role = computed(() => user.value?.role ?? null)
  const isAdmin = computed(() => role.value === 'super_admin' || role.value === 'branch_manager')

  async function login(payload: LoginPayload): Promise<AuthenticatedUser> {
    const authenticatedUser = await loginRequest(payload)
    user.value = authenticatedUser
    isInitialized.value = true
    return authenticatedUser
  }

  async function register(payload: RegisterPayload): Promise<AuthenticatedUser> {
    const authenticatedUser = await registerRequest(payload)
    user.value = authenticatedUser
    isInitialized.value = true
    return authenticatedUser
  }

  async function staffLogin(payload: LoginPayload): Promise<AuthenticatedUser> {
    const authenticatedUser = await staffLoginRequest(payload)
    user.value = authenticatedUser
    isInitialized.value = true
    return authenticatedUser
  }

  async function restoreSession(force = false): Promise<void> {
    if (isInitialized.value && !force) return
    if (sessionRestorePromise) return sessionRestorePromise

    sessionRestorePromise = (async () => {
      isInitializing.value = true
      try {
        user.value = await getCurrentUser()
      } catch (error: unknown) {
        user.value = null
        if (!isUnauthorized(error)) {
          // Public routes remain usable when the backend is temporarily unavailable.
        }
      } finally {
        isInitializing.value = false
        isInitialized.value = true
        sessionRestorePromise = undefined
      }
    })()

    return sessionRestorePromise
  }

  async function logout(): Promise<void> {
    try {
      await logoutRequest()
    } finally {
      user.value = null
      isInitialized.value = true
    }
  }

  function clearSession(): void {
    user.value = null
    isInitialized.value = true
  }

  function resetForTesting(): void {
    user.value = null
    isInitializing.value = false
    isInitialized.value = false
    sessionRestorePromise = undefined
  }

  return {
    user,
    isAuthenticated,
    isInitializing,
    isInitialized,
    role,
    isAdmin,
    login,
    staffLogin,
    register,
    restoreSession,
    logout,
    clearSession,
    resetForTesting,
  }
})
