import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'

interface MountedCart {
  readonly wrapper: VueWrapper
  readonly router: Router
}

const mountedWrappers: VueWrapper[] = []

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
}

async function mountCart(): Promise<MountedCart> {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/cart')
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
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('customer cart page', () => {
  it('renders the real /cart route and navigation links', async () => {
    const { wrapper, router } = await mountCart()

    expect(router.currentRoute.value.path).toBe('/cart')
    expect(wrapper.get('[data-cart-page] h1').text()).toBe('Giỏ hàng của bạn')
    expect(wrapper.get('[data-cart-page] h1').classes()).toContain('sr-only')
    expect(wrapper.text()).not.toContain('Chuẩn bị đơn hàng')
    expect(wrapper.text()).not.toContain('Kiểm tra sản phẩm, chi nhánh và ưu đãi trước khi thanh toán.')
    expect(wrapper.get('header a[aria-label^="Giỏ hàng"]').attributes('href')).toBe('/cart')
    expect(wrapper.get('[data-navigation-key="cart"]').attributes('href')).toBe('/cart')
    expect(wrapper.get('[data-navigation-key="cart"]').attributes('aria-current')).toBe('page')
  }, 10_000)

  it('selects individual items and all eligible items', async () => {
    const { wrapper } = await mountCart()
    const selectAll = wrapper.get<HTMLInputElement>('[data-select-all]')
    const firstItemCheckbox = wrapper.get<HTMLInputElement>('[data-cart-item] input[type="checkbox"]')

    expect(selectAll.element.checked).toBe(true)
    await selectAll.setValue(false)
    expect(wrapper.get('[data-summary-count]').text()).toBe('0')

    await firstItemCheckbox.setValue(true)
    expect(wrapper.get('[data-summary-count]').text()).toBe('1')

    await selectAll.setValue(true)
    expect(wrapper.get('[data-summary-count]').text()).toBe('3')
  })

  it('increments and decrements quantity without going below one', async () => {
    const { wrapper } = await mountCart()
    const firstItem = wrapper.get('[data-cart-item]')
    const quantity = firstItem.get('[data-cart-quantity] output')
    const increment = firstItem.get('button[aria-label^="Tăng số lượng"]')
    const decrement = firstItem.get('button[aria-label^="Giảm số lượng"]')

    expect(quantity.text()).toBe('1')
    expect(decrement.attributes('disabled')).toBeDefined()

    await increment.trigger('click')
    expect(quantity.text()).toBe('2')
    await decrement.trigger('click')
    expect(quantity.text()).toBe('1')
    await decrement.trigger('click')
    expect(quantity.text()).toBe('1')
  })

  it('updates totals when quantity and voucher change', async () => {
    const { wrapper } = await mountCart()
    const subtotalBefore = wrapper.get('[data-summary-subtotal]').text()

    await wrapper.get('[data-cart-item] button[aria-label^="Tăng số lượng"]').trigger('click')
    expect(wrapper.get('[data-summary-subtotal]').text()).not.toBe(subtotalBefore)

    await wrapper.get<HTMLSelectElement>('[data-voucher-select]').setValue('MIZUKI50')
    expect(wrapper.get('[data-summary-discount]').text()).toContain('50.000')
  })

  it('excludes unavailable items from checkout totals', async () => {
    const { wrapper } = await mountCart()
    const unavailableItems = wrapper.findAll('[data-cart-item]').filter(
      (item) => item.attributes('data-cart-stock') !== 'available',
    )

    expect(unavailableItems).toHaveLength(2)
    expect(unavailableItems.every(
      (item) => item.get('input[type="checkbox"]').attributes('disabled') !== undefined,
    )).toBe(true)
    expect(wrapper.get('[data-summary-count]').text()).toBe('3')
  })

  it('removes an item and moves another item to favorites', async () => {
    const { wrapper } = await mountCart()

    await wrapper.get('[data-cart-item] button[aria-label^="Xóa"]').trigger('click')
    expect(wrapper.findAll('[data-cart-item]')).toHaveLength(3)

    await wrapper.get('[data-cart-item] button[aria-label^="Chuyển"]').trigger('click')
    expect(wrapper.findAll('[data-cart-item]')).toHaveLength(2)
    expect(wrapper.get('[role="status"]').text()).toContain('sang yêu thích')
  })

  it('renders branch conflict and recovery actions', async () => {
    const { wrapper } = await mountCart()

    expect(wrapper.get('[data-branch-conflict]').text()).toContain('chưa có tại chi nhánh')
    expect(wrapper.findAll('[data-unavailable-reason]')).toHaveLength(2)
    expect(wrapper.findAll('button').some((button) => button.text() === 'Đổi biến thể')).toBe(true)
    expect(wrapper.findAll('button').some((button) => button.text() === 'Đổi chi nhánh')).toBe(true)
  })

  it('renders at least six recommended products with local add actions', async () => {
    const { wrapper } = await mountCart()

    expect(wrapper.findAll('[data-cart-recommendation]').length).toBeGreaterThanOrEqual(6)
    await wrapper.get('[data-cart-recommendation] button').trigger('click')
    expect(wrapper.get('[role="status"]').text()).toContain('giỏ hàng demo')
  })

  it('keeps the mobile checkout bar above bottom navigation', async () => {
    const { wrapper } = await mountCart()
    const mobileBar = wrapper.get('[data-mobile-checkout-bar]')

    expect(mobileBar.classes()).toEqual(expect.arrayContaining([
      'fixed',
      'bottom-[5.75rem]',
      'md:hidden',
    ]))
    expect(mobileBar.attributes('aria-label')).toBe('Thanh mua hàng mobile')
    expect(mobileBar.text()).toContain('Mua hàng')
  })

  it('makes no network request during all cart interactions', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const { wrapper } = await mountCart()

    await wrapper.get('[data-cart-item] button[aria-label^="Tăng số lượng"]').trigger('click')
    await wrapper.get<HTMLSelectElement>('[data-voucher-select]').setValue('MIZUKI50')
    await wrapper.get('[data-cart-recommendation] button').trigger('click')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(openSpy).not.toHaveBeenCalled()
  })
})
