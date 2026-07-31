import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'

interface MountedFavorites {
  readonly wrapper: VueWrapper
  readonly router: Router
}

const mountedWrappers: VueWrapper[] = []

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
}

async function mountFavorites(): Promise<MountedFavorites> {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/favorites')
  await router.isReady()
  const wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  mountedWrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  useAuthStore(pinia).$patch({
    user: {
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
    },
    isInitialized: true,
  })
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('customer favorites page', () => {
  it('renders the real /favorites route', async () => {
    const { wrapper, router } = await mountFavorites()

    expect(router.currentRoute.value.path).toBe('/favorites')
    expect(wrapper.get('[data-favorites-page] h1').text()).toBe('Sản phẩm yêu thích')
    expect(wrapper.get('[data-favorites-page] h1').classes()).toContain('sr-only')
    expect(wrapper.text()).not.toContain('Bộ sưu tập của bạn')
    expect(wrapper.text()).not.toContain('sản phẩm đang hiển thị')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(8)
  }, 10_000)

  it('keeps the desktop filters in one compact practical row', async () => {
    const { wrapper } = await mountFavorites()
    const toolbar = wrapper.get('[data-favorite-toolbar]')

    expect(toolbar.classes()).toEqual(expect.arrayContaining([
      'lg:flex-row',
      'lg:items-center',
      'gap-3',
      'p-3',
    ]))
    expect(toolbar.get('[data-favorite-result-count]').text()).toBe('Lọc và sắp xếp · 8 sản phẩm')
    expect(toolbar.get('[data-favorite-compact-controls]').classes()).toContain('lg:flex')
  })

  it('links desktop and mobile favorite navigation to /favorites', async () => {
    const { wrapper } = await mountFavorites()

    expect(wrapper.get('header a[aria-label="Yêu thích"]').attributes('href')).toBe('/favorites')
    expect(wrapper.get('[data-navigation-key="favorites"]').attributes('href')).toBe('/favorites')
    expect(wrapper.get('[data-navigation-key="favorites"]').attributes('aria-current')).toBe('page')
  })

  it('filters the local list by availability and discount', async () => {
    const { wrapper } = await mountFavorites()

    await wrapper.get('[data-favorite-filter="available"]').trigger('click')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(6)
    expect(wrapper.findAll('[data-favorite-item]').every(
      (item) => ['available', 'low-stock'].includes(item.attributes('data-stock-state') ?? ''),
    )).toBe(true)

    await wrapper.get('[data-favorite-filter="discounted"]').trigger('click')
    expect(wrapper.findAll('[data-favorite-item]').length).toBeGreaterThan(0)
    expect(wrapper.get('[data-favorite-filter="discounted"]').attributes('aria-pressed')).toBe('true')
  })

  it('removes an individual favorite locally', async () => {
    const { wrapper } = await mountFavorites()
    const firstItem = wrapper.findAll('[data-favorite-item]')[0]!

    await firstItem.get('button[aria-label^="Bỏ"]').trigger('click')

    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(7)
    expect(wrapper.get('[role="status"]').text()).toContain('Đã bỏ')
  })

  it('adds an available favorite to the demo cart', async () => {
    const { wrapper } = await mountFavorites()
    const availableItem = wrapper.get('[data-favorite-item][data-stock-state="available"]')

    await availableItem.get('button[aria-label^="Thêm"]').trigger('click')

    expect(wrapper.get('[role="status"]').text()).toContain('Đã thêm')
    expect(wrapper.get('[role="status"]').text()).toContain('giỏ hàng demo')
  })

  it('disables sold-out cart action and offers a similar-product route', async () => {
    const { wrapper } = await mountFavorites()
    const soldOutItem = wrapper.get('[data-favorite-item][data-stock-state="sold-out"]')

    expect(soldOutItem.get('button[aria-label^="Thêm"]').attributes('disabled')).toBeDefined()
    expect(soldOutItem.get('a').text()).toContain('Xem chi tiết')
    expect(soldOutItem.findAll('a').some((link) => link.text().includes('Tìm sản phẩm tương tự'))).toBe(true)
  })

  it('renders the empty state after clearing favorites', async () => {
    const { wrapper } = await mountFavorites()

    const clearButton = wrapper.findAll('button').find((button) => button.text().includes('Xóa tất cả'))
    expect(clearButton).toBeDefined()
    await clearButton?.trigger('click')

    expect(wrapper.find('[data-favorites-empty]').exists()).toBe(true)
    expect(wrapper.get('[data-favorites-empty]').text()).toContain('Khám phá sản phẩm')
  })

  it('makes no network request during local interactions', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const { wrapper } = await mountFavorites()

    await wrapper.get('[data-favorite-filter="available"]').trigger('click')
    await wrapper.get('[data-favorite-item] button[aria-label^="Thêm"]').trigger('click')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(openSpy).not.toHaveBeenCalled()
  })
})
