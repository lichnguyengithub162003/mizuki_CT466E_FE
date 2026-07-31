import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'

vi.mock('@/api/locations/locationApi', () => ({
  listLocationProvinces: vi.fn().mockResolvedValue([]),
  listLocationDistricts: vi.fn().mockResolvedValue([]),
  listLocationWards: vi.fn().mockResolvedValue([]),
}))

describe('foundation router', () => {
  it('renders foundation and all public customer routes', async () => {
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

    await router.push('/favorites')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Sản phẩm yêu thích')

    await router.push('/cart')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Giỏ hàng của bạn')

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
})
