import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'

describe('foundation router', () => {
  it('renders the foundation, admin shell, forbidden, and not-found pages', async () => {
    const router = createAppRouter(createMemoryHistory())
    const wrapper = mount(App, {
      global: {
        plugins: [router],
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

    await router.push('/forbidden')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Bạn không có quyền truy cập')

    await router.push('/route-khong-ton-tai')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Không tìm thấy trang')
  })
})
