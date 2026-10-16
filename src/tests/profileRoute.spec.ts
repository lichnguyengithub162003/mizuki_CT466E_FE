import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import type { AppRole, AuthenticatedUser } from '@/types/auth'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
vi.mock('@/api/auth/authApi', () => ({ getCurrentUser: mocks.getCurrentUser }))

function user(role: AppRole): AuthenticatedUser {
  return {
    id: 10, name: 'Mizuki User', email: 'user@mizuki.test', phone: null, avatar: null,
    role, role_label: role, branch_id: null, email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore(pinia).resetForTesting()
})

describe('/profile route guard', () => {
  it('redirects guests to login with the Profile return path', async () => {
    mocks.getCurrentUser.mockRejectedValue({ name: 'ApplicationError', kind: 'unauthorized', message: 'Guest' })
    const router = createAppRouter(createMemoryHistory())
    await router.push('/profile')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/profile')
  })

  it.each(['customer', 'cashier', 'sales_staff', 'technician', 'branch_manager', 'super_admin'] as const)(
    'allows authenticated %s without a redirect loop', async (role) => {
      useAuthStore(pinia).$patch({ user: user(role), isInitialized: true })
      const router = createAppRouter(createMemoryHistory())
      await router.push('/profile')
      expect(router.currentRoute.value.path).toBe('/profile')
      expect(router.currentRoute.value.name).toBe('profile')
      expect(mocks.getCurrentUser).not.toHaveBeenCalled()
    },
  )
})
