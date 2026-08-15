import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { pinia } from '@/stores/pinia'
import { useAuthStore } from '@/stores/auth'
import { useBranchPreferenceStore } from '@/stores/branchPreference'

const api = vi.hoisted(() => ({ getCustomerCart: vi.fn(), updateCartItem: vi.fn(), removeCartItem: vi.fn(), selectCartBranch: vi.fn() }))
vi.mock('@/api/cartApi', () => ({ ...api, addCartItem: vi.fn() }))

const cart = {
  id: 1, branch: { id: 6, name: 'Mizuki Vĩnh Long', address: 'Vĩnh Long' }, totalQuantity: 2, totalAmount: 200000, discountAmount: 10000, totalAfterDiscount: 190000,
  items: [{ id: 31, product: { id: 11, name: 'Sản phẩm thật', slug: 'san-pham-that' }, variant: { id: 71, name: '50ml', sku: 'SKU-71', effectivePrice: 100000 }, quantity: 2, subtotal: 200000, availableQuantity: 3, stockWarning: false }],
}
const voucherCart = { ...structuredClone(cart), totalQuantity: 5, totalAmount: 500000, discountAmount: 0, totalAfterDiscount: 500000, items: [{ ...structuredClone(cart.items[0]), quantity: 5, subtotal: 500000, availableQuantity: 6 }] }
const wrappers: VueWrapper[] = []
function login(): void { useAuthStore(pinia).$patch({ user: { id: 7, name: 'Customer', email: 'c@example.com', phone: null, avatar: null, role: 'customer', role_label: 'Khách hàng', branch_id: null, email_verified_at: null, created_at: '2026-08-13' }, isInitialized: true }) }
async function mountCart(): Promise<VueWrapper> { const router = createAppRouter(createMemoryHistory()); await router.push('/cart'); await router.isReady(); const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } }); wrappers.push(wrapper); await flushPromises(); return wrapper }
beforeEach(() => { useAuthStore(pinia).resetForTesting(); useBranchPreferenceStore(pinia).$patch({ branches: [{ id: 5, code: 'MZ-CT', name: 'Mizuki Cần Thơ', address: 'Cần Thơ', phone: null, email: null, is_active: true, opening_hours: [] }, { id: 6, code: 'MZ-VL', name: 'Mizuki Vĩnh Long', address: 'Vĩnh Long', phone: null, email: null, is_active: true, opening_hours: [] }], selectedBranchId: 6, status: 'success', error: null }); api.getCustomerCart.mockReset(); api.updateCartItem.mockReset(); api.removeCartItem.mockReset(); api.selectCartBranch.mockReset(); api.getCustomerCart.mockResolvedValue(structuredClone(cart)); api.updateCartItem.mockResolvedValue(structuredClone(cart)); api.removeCartItem.mockResolvedValue({ ...structuredClone(cart), items: [], totalQuantity: 0, totalAmount: 0, totalAfterDiscount: 0 }); api.selectCartBranch.mockResolvedValue(structuredClone(cart)) })
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks() })

describe('customer cart API integration', () => {
  it('loads the authenticated server cart and backend totals', async () => { login(); const wrapper = await mountCart(); expect(api.getCustomerCart).toHaveBeenCalled(); expect(wrapper.get('[data-summary-count]').text()).toBe('2'); expect(wrapper.get('[data-summary-total]').text()).toContain('190.000') })
  it('renders the server empty cart after reload', async () => { login(); api.getCustomerCart.mockResolvedValueOnce({ ...structuredClone(cart), items: [], totalQuantity: 0, totalAmount: 0, totalAfterDiscount: 0 }); const wrapper = await mountCart(); expect(wrapper.find('[data-cart-empty]').exists()).toBe(true) })
  it('updates quantity and respects server availability controls', async () => { login(); api.updateCartItem.mockResolvedValueOnce({ ...structuredClone(cart), items: [{ ...cart.items[0], quantity: 3 }] }); const wrapper = await mountCart(); await wrapper.get('button[aria-label^="Tăng số lượng"]').trigger('click'); await flushPromises(); expect(api.updateCartItem).toHaveBeenCalledWith(31, 3); expect(wrapper.get('button[aria-label^="Tăng số lượng"]').attributes('disabled')).toBeDefined() })
  it('removes an item through the server and updates the page', async () => { login(); const wrapper = await mountCart(); await wrapper.get('button[aria-label^="Xóa"]').trigger('click'); await flushPromises(); expect(api.removeCartItem).toHaveBeenCalledWith(31); expect(wrapper.find('[data-cart-empty]').exists()).toBe(true) })
  it('shows the server cart branch first in the sidebar without a competing selector', async () => { login(); const wrapper = await mountCart(); expect(wrapper.get('[data-cart-group]').text()).toContain('Mizuki Vĩnh Long'); expect(wrapper.get('[data-cart-group]').element.closest('aside')).not.toBeNull(); expect(wrapper.find('[data-cart-branch]').exists()).toBe(false); expect(api.selectCartBranch).not.toHaveBeenCalled() })
  it('uses a compact mobile title while keeping the desktop breadcrumb', async () => { login(); const wrapper = await mountCart(); expect(wrapper.get('[data-cart-mobile-header] h1').text()).toBe('Giỏ hàng'); expect(wrapper.get('nav[aria-label="Đường dẫn trang"]').text()).toContain('Trang chủ'); expect(wrapper.get('nav[aria-label="Đường dẫn trang"]').text()).toContain('Giỏ hàng'); expect(wrapper.text()).not.toContain('Đơn hàng của bạn') })
  it('renders the Cart-only mobile shell, scroller, branch strip, and fixed action dock', async () => {
    login()
    const wrapper = await mountCart()

    expect(wrapper.get('[data-compact-cart-mobile]').attributes('data-compact-cart-mobile')).toBe('true')
    expect(wrapper.get('header[aria-label="Đầu trang khách hàng"]').classes()).toContain('max-[84.999rem]:!hidden')
    expect(wrapper.get('header[aria-label="Đầu trang khách hàng mobile"]').classes()).toContain('max-[84.999rem]:!hidden')
    expect(wrapper.get('footer').classes()).toContain('max-[84.999rem]:!hidden')
    expect(wrapper.find('nav[aria-label="Điều hướng khách hàng mobile"]').exists()).toBe(false)
    expect(wrapper.get('[data-cart-mobile-selection]').classes()).toContain('sticky')
    expect(wrapper.get('[data-cart-mobile-selection]').classes()).toContain('min-[85rem]:hidden')
    expect(wrapper.get('[data-cart-mobile-branch]').text()).toContain('Mizuki Vĩnh Long')
    expect(wrapper.get('[data-cart-product-scroll]').classes()).toContain('overflow-y-auto')
    expect(wrapper.get('aside[aria-labelledby="cart-summary-heading"]').classes()).toContain('min-[85rem]:block')
    expect(wrapper.get('[data-mobile-checkout-bar]').classes()).toContain('bottom-0')
    expect(wrapper.get('[data-mobile-checkout-bar]').classes()).toContain('min-[85rem]:hidden')
    expect(wrapper.get('[data-mobile-voucher-action]').text()).toContain('Voucher Mizuki')
    expect(wrapper.get('[data-mobile-checkout-bar] [data-checkout-action]').attributes('href')).toBe('/checkout')
  })
  it('returns to router history from the compact Cart header', async () => {
    login()
    const router = createAppRouter(createMemoryHistory())
    await router.push('/products')
    await router.push('/cart')
    await router.isReady()
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
    wrappers.push(wrapper)
    await flushPromises()

    await wrapper.get('[data-cart-mobile-header] button[aria-label="Quay lại"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/products')
  })
  it('recalculates selected count, subtotal, discount, and total without mutating the server cart', async () => {
    login()
    api.getCustomerCart.mockResolvedValueOnce({
      ...structuredClone(cart),
      totalQuantity: 3,
      totalAmount: 300000,
      discountAmount: 30000,
      totalAfterDiscount: 270000,
      items: [
        structuredClone(cart.items[0]),
        { id: 32, product: { id: 12, name: 'Sản phẩm thứ hai', slug: 'san-pham-thu-hai' }, variant: { id: 72, name: '30ml', sku: 'SKU-72', effectivePrice: 100000 }, quantity: 1, subtotal: 100000, availableQuantity: 4, stockWarning: false },
      ],
    })
    const wrapper = await mountCart()

    await wrapper.findAll<HTMLInputElement>('[data-cart-item] input[type="checkbox"]')[0]!.setValue(false)

    expect(wrapper.get('[data-summary-count]').text()).toBe('1')
    expect(wrapper.get('[data-summary-subtotal]').text()).toContain('100.000')
    expect(wrapper.get('[data-summary-discount]').text()).toContain('10.000')
    expect(wrapper.get('[data-summary-total]').text()).toContain('90.000')
    expect(wrapper.get('[data-cart-summary] [data-checkout-action]').attributes('href')).toBe('/checkout')
    expect(api.updateCartItem).not.toHaveBeenCalled()
    expect(api.removeCartItem).not.toHaveBeenCalled()

    await wrapper.get('[data-select-all] [role="checkbox"]').trigger('click')
    expect(wrapper.get('[data-summary-count]').text()).toBe('3')
    expect(wrapper.get('[data-summary-total]').text()).toContain('270.000')
  })
  it('opens the voucher modal with search and separate order and shipping sections', async () => {
    login()
    api.getCustomerCart.mockResolvedValueOnce(structuredClone(voucherCart))
    const wrapper = await mountCart()

    await wrapper.get('[data-open-voucher]').trigger('click')
    await flushPromises()

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog?.textContent).toContain('Chọn voucher Mizuki')
    expect(dialog?.textContent).toContain('Mã giảm giá')
    expect(dialog?.textContent).toContain('Mã vận chuyển')
    expect(dialog?.querySelector('input[placeholder="Nhập mã giảm giá"]')).not.toBeNull()
    expect(dialog?.textContent).not.toContain('Chưa có API áp dụng voucher')
    expect(dialog?.querySelector('[data-voucher-scroll-area]')).not.toBeNull()
    expect(dialog?.querySelectorAll('[data-voucher-section="order"] [data-voucher-id]')).toHaveLength(2)
    expect(dialog?.querySelectorAll('[data-voucher-section="shipping"] [data-voucher-id]')).toHaveLength(2)

    document.querySelector<HTMLButtonElement>('[data-toggle-vouchers="order"]')?.click()
    document.querySelector<HTMLButtonElement>('[data-toggle-vouchers="shipping"]')?.click()
    await flushPromises()
    expect(dialog?.querySelectorAll('[data-voucher-section="order"] [data-voucher-id]')).toHaveLength(3)
    expect(dialog?.querySelectorAll('[data-voucher-section="shipping"] [data-voucher-id]')).toHaveLength(3)
    expect(document.querySelector('[data-toggle-vouchers="order"]')?.textContent).toContain('Thu gọn')
  })
  it('keeps one selection per voucher section and toggles a selected card off', async () => {
    login()
    api.getCustomerCart.mockResolvedValueOnce(structuredClone(voucherCart))
    const wrapper = await mountCart()
    await wrapper.get('[data-open-voucher]').trigger('click')
    await flushPromises()

    const order50 = document.querySelector<HTMLButtonElement>('[data-voucher-id="order-50"]')
    const order10 = document.querySelector<HTMLButtonElement>('[data-voucher-id="order-10"]')
    const shippingFree = document.querySelector<HTMLButtonElement>('[data-voucher-id="shipping-free"]')
    order50?.click()
    order10?.click()
    shippingFree?.click()
    await flushPromises()

    expect(document.querySelector('[data-voucher-id="order-50"]')?.getAttribute('data-voucher-selected')).toBe('false')
    expect(document.querySelector('[data-voucher-id="order-10"]')?.getAttribute('data-voucher-selected')).toBe('true')
    expect(document.querySelector('[data-voucher-id="shipping-free"]')?.getAttribute('data-voucher-selected')).toBe('true')
    expect(document.querySelector('[data-voucher-id="order-10"]')?.classList.contains('border-[#5b9de3]')).toBe(true)
    expect(wrapper.get('[data-selected-order-voucher]').text()).toContain('BEAUTY10')
    expect(wrapper.get('[data-selected-shipping-voucher]').text()).toContain('FREESHIP')
    expect(wrapper.get('[data-selected-order-voucher]').classes()).toContain('border-[#5b9de3]')

    document.querySelector<HTMLButtonElement>('button[aria-label="Chi tiết BEAUTY10"]')?.click()
    await flushPromises()
    expect(document.querySelector('[data-voucher-id="order-10"]')?.getAttribute('data-voucher-selected')).toBe('true')

    document.querySelector<HTMLButtonElement>('[data-voucher-id="order-10"]')?.click()
    document.querySelector<HTMLButtonElement>('[data-voucher-id="shipping-free"]')?.click()
    await flushPromises()

    expect(document.querySelector('[data-voucher-id="order-10"]')?.getAttribute('data-voucher-selected')).toBe('false')
    expect(document.querySelector('[data-voucher-id="shipping-free"]')?.getAttribute('data-voucher-selected')).toBe('false')
    expect(wrapper.find('[data-selected-order-voucher]').exists()).toBe(false)
    expect(wrapper.find('[data-selected-shipping-voucher]').exists()).toBe(false)
  })
  it('updates displayed totals for an order voucher while shipping selection stays UI-only', async () => {
    login()
    api.getCustomerCart.mockResolvedValueOnce(structuredClone(voucherCart))
    const wrapper = await mountCart()
    await wrapper.get('[data-open-voucher]').trigger('click')
    await flushPromises()

    document.querySelector<HTMLButtonElement>('[data-voucher-id="order-50"]')?.click()
    document.querySelector<HTMLButtonElement>('[data-voucher-id="shipping-free"]')?.click()
    await flushPromises()

    expect(wrapper.get('[data-summary-discount]').text()).toContain('50.000')
    expect(wrapper.get('[data-summary-total]').text()).toContain('450.000')
    expect(wrapper.get('[data-selected-shipping-voucher]').text()).toContain('FREESHIP')
    expect(api.updateCartItem).not.toHaveBeenCalled()

    document.querySelector<HTMLButtonElement>('[data-voucher-id="order-50"]')?.click()
    await flushPromises()
    expect(wrapper.get('[data-summary-discount]').text()).toContain('0')
    expect(wrapper.get('[data-summary-total]').text()).toContain('500.000')
  })
  it('uses a compact desktop row for item price, quantity, subtotal, and remove controls', async () => {
    login()
    const wrapper = await mountCart()
    const item = wrapper.get('[data-cart-item]')
    const layout = item.get(':scope > div')

    expect(layout.classes()).toContain('min-[85rem]:grid-cols-[auto_5.5rem_minmax(12rem,1fr)_7.25rem_7.25rem_7.5rem_2.5rem]')
    expect(item.get('[data-unit-price]').text()).toContain('Đơn giá')
    expect(item.get('[data-cart-quantity] output').text()).toBe('2')
    expect(item.get('[data-item-subtotal]').classes()).toContain('text-[#bd443d]')
    expect(item.get('button[aria-label^="Xóa"]').attributes('aria-label')).toContain('Sản phẩm thật')
  })
  it('preserves server data on mutation error', async () => { login(); api.updateCartItem.mockRejectedValueOnce({ message: 'Tồn kho không đủ' }); const wrapper = await mountCart(); await wrapper.get('button[aria-label^="Tăng số lượng"]').trigger('click'); await flushPromises(); expect(wrapper.get('[role="alert"]').text()).toContain('Tồn kho không đủ'); expect(wrapper.get('[data-summary-count]').text()).toBe('2') })
  it('requires authentication before loading a cart', async () => { const wrapper = await mountCart(); expect(wrapper.find('[data-cart-auth-required]').exists()).toBe(true); expect(api.getCustomerCart).not.toHaveBeenCalled() })
})
