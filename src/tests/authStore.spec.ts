import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AuthenticatedUser } from '@/types/auth'

const authApiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('@/api/auth/authApi', () => authApiMocks)

import { useAuthStore } from '@/stores/auth'

const user: AuthenticatedUser = {
  id: 1,
  name: 'Customer',
  email: 'customer@example.com',
  phone: null,
  avatar: null,
  role: 'customer',
  role_label: 'Khách hàng',
  branch_id: null,
  email_verified_at: null,
  created_at: '2026-07-31T00:00:00Z',
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('restores the session once across concurrent initialization', async () => {
    authApiMocks.getCurrentUser.mockResolvedValue(user)
    const store = useAuthStore()
    await Promise.all([store.restoreSession(), store.restoreSession(), store.restoreSession()])
    expect(authApiMocks.getCurrentUser).toHaveBeenCalledOnce()
    expect(store.user).toEqual(user)
    expect(store.isAuthenticated).toBe(true)
    expect(store.isInitializing).toBe(false)
  })

  it('turns a 401 restore into initialized guest state', async () => {
    authApiMocks.getCurrentUser.mockRejectedValue({
      name: 'ApplicationError',
      kind: 'unauthorized',
      message: 'Bạn cần đăng nhập để tiếp tục',
    })
    const store = useAuthStore()
    await store.restoreSession()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.isInitialized).toBe(true)
  })

  it('force-refreshes an initialized guest after an OAuth browser callback', async () => {
    const store = useAuthStore()
    store.clearSession()
    authApiMocks.getCurrentUser.mockResolvedValue(user)

    await Promise.all([store.restoreSession(true), store.restoreSession(true)])

    expect(authApiMocks.getCurrentUser).toHaveBeenCalledOnce()
    expect(store.user).toEqual(user)
  })

  it('stores login and registration sessions returned by Laravel', async () => {
    authApiMocks.login.mockResolvedValue(user)
    authApiMocks.register.mockResolvedValue(user)
    const store = useAuthStore()
    await store.login({ email: user.email, password: 'password' })
    expect(store.user).toEqual(user)
    store.clearSession()
    await store.register({
      name: user.name,
      email: user.email,
      password: 'Password123!',
      password_confirmation: 'Password123!',
    })
    expect(store.user).toEqual(user)
  })

  it('calls logout and clears local auth state after success', async () => {
    authApiMocks.login.mockResolvedValue(user)
    authApiMocks.logout.mockResolvedValue(undefined)
    const store = useAuthStore()
    await store.login({ email: user.email, password: 'password' })
    await store.logout()
    expect(authApiMocks.logout).toHaveBeenCalledOnce()
    expect(store.user).toBeNull()
  })
})
