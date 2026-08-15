import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { usePasswordRecovery } from '@/composables/auth/usePasswordRecovery'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'

const authApiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('@/api/auth/authApi', () => authApiMocks)

vi.mock('@/api/locations/locationApi', () => ({
  listLocationProvinces: vi.fn().mockResolvedValue([]),
  listLocationDistricts: vi.fn().mockResolvedValue([]),
  listLocationWards: vi.fn().mockResolvedValue([]),
}))

describe('foundation router', () => {
  it('renders foundation and all public customer routes', async () => {
    useAuthStore(pinia).resetForTesting()
    authApiMocks.getCurrentUser.mockRejectedValue({
      name: 'ApplicationError',
      kind: 'unauthorized',
      message: 'Bạn cần đăng nhập để tiếp tục',
    })
    const router = createAppRouter(createMemoryHistory())
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
      },
    })
    const wrapper = mount(App, {
      global: {
        plugins: [router, [VueQueryPlugin, { queryClient }]],
      },
    })

    await router.push('/')
    await router.isReady()
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Mizuki foundation')
    expect(wrapper.findAll('[data-token-section]')).toHaveLength(7)

    await router.push('/login')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Đăng nhập Mizuki')

    await router.push('/register')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Tạo tài khoản')

    await router.push('/forgot-password')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Quên mật khẩu?')

    const recovery = usePasswordRecovery()
    recovery.startRequest('an@example.com', 60, 300)
    await router.push('/verify-reset-code')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Nhập mã xác thực')

    recovery.completeVerification('verification-token', 600)
    await router.push('/reset-password')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Tạo mật khẩu mới')
    recovery.clear()

    await router.push('/admin-shell')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Một nhịp vận hành thật nhẹ nhàng.')

    await router.push('/customer-shell')
    await flushPromises()
    expect(wrapper.get('h1').text()).toContain('Chăm da dịu nhẹ')

    await router.push('/home')
    await flushPromises()
    expect(wrapper.get('h1').text()).toContain('Khởi động chu trình')

    await router.push('/products')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Sản phẩm chăm sóc da')

    authApiMocks.login.mockResolvedValue({
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
    })
    await useAuthStore(pinia).login({ email: 'customer@example.com', password: 'password' })

    await router.push('/favorites')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Sản phẩm yêu thích')

    await router.push('/cart')
    await flushPromises()
    expect(wrapper.get('nav[aria-label="Đường dẫn trang"]').text()).toContain('Giỏ hàng')

    await router.push('/checkout')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Thanh toán')

    await router.push('/forbidden')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Bạn không có quyền truy cập')

    await router.push('/route-khong-ton-tai')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Không tìm thấy trang')
  }, 10_000)

  it('waits for session initialization and preserves the protected redirect', async () => {
    useAuthStore(pinia).resetForTesting()
    let rejectRestore: ((reason?: unknown) => void) | undefined
    authApiMocks.getCurrentUser.mockReturnValue(new Promise((_, reject) => { rejectRestore = reject }))
    const router = createAppRouter(createMemoryHistory())
    const navigation = router.push('/checkout')
    expect(router.currentRoute.value.path).not.toBe('/checkout')
    rejectRestore?.({ name: 'ApplicationError', kind: 'unauthorized', message: 'Guest' })
    await navigation
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/checkout')
    expect(authApiMocks.getCurrentUser).toHaveBeenCalledOnce()
  })
})
