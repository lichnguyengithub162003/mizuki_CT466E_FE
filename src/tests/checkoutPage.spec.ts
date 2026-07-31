/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import CheckoutPage from '@/pages/customer/CheckoutPage.vue'
import { createAppRouter } from '@/router'
import type {
  LocationDistrict,
  LocationProvince,
  LocationWard,
} from '@/api/locations/locationTypes'
import type { CheckoutScenario } from '@/types/customer'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'

const locationApiMocks = vi.hoisted(() => ({
  listLocationProvinces: vi.fn(),
  listLocationDistricts: vi.fn(),
  listLocationWards: vi.fn(),
}))

vi.mock('@/api/locations/locationApi', () => locationApiMocks)

const provinces: readonly LocationProvince[] = [
  { ghn_province_id: 91, name: 'Cần Thơ' },
  { ghn_province_id: 202, name: 'Hồ Chí Minh' },
]

const districtsByProvince: Readonly<Record<number, readonly LocationDistrict[]>> = {
  91: [
    { ghn_district_id: 1442, name: 'Ninh Kiều' },
    { ghn_district_id: 1443, name: 'Cái Răng' },
  ],
  202: [{ ghn_district_id: 3695, name: 'Quận 1' }],
}

const wardsByDistrict: Readonly<Record<number, readonly LocationWard[]>> = {
  1442: [
    { ghn_ward_code: '21012', name: 'Xuân Khánh' },
    { ghn_ward_code: '21013', name: 'An Khánh' },
  ],
  1443: [{ ghn_ward_code: '21018', name: 'Hưng Phú' }],
  3695: [{ ghn_ward_code: '90742', name: 'Bến Nghé' }],
}

interface MountedCheckout {
  readonly wrapper: VueWrapper
  readonly router: Router
}

const mountedWrappers: VueWrapper[] = []
const queryClients: QueryClient[] = []

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
}

function findDocumentButton(label: string): HTMLButtonElement {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((candidate) => candidate.textContent?.trim() === label)
  if (!button) throw new Error(`Expected button "${label}" to exist.`)
  return button
}

function setInput(selector: string, value: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(selector)
  if (!input) throw new Error(`Expected input "${selector}" to exist.`)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  return input
}

function setSelect(selector: string, value: string): HTMLSelectElement {
  const select = document.querySelector<HTMLSelectElement>(selector)
  if (!select) throw new Error(`Expected select "${selector}" to exist.`)
  select.value = value
  select.dispatchEvent(new Event('change', { bubbles: true }))
  return select
}

function createTestQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  })
  queryClients.push(queryClient)
  return queryClient
}

async function mountCheckout(
  scenario: CheckoutScenario = 'first-time',
  throughRouter = false,
): Promise<MountedCheckout> {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/checkout')
  await router.isReady()
  const queryClient = createTestQueryClient()
  const wrapper = mount(throughRouter ? App : CheckoutPage, {
    attachTo: document.body,
    props: throughRouter ? undefined : { scenario },
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
    },
  })
  mountedWrappers.push(wrapper)
  await flushPromises()
  await nextTick()
  return { wrapper, router }
}

async function completeAddressForm(): Promise<void> {
  setInput('#checkout-full-name', '  Trần Ngọc Mai  ')
  await nextTick()
  setInput('#checkout-phone', '0912 345 678')
  await nextTick()
  setSelect('#checkout-province', '91')
  await flushPromises()
  setSelect('#checkout-district', '1442')
  await flushPromises()
  setSelect('#checkout-ward', '21012')
  await nextTick()
  setInput('#checkout-address-detail', '  25 đường Mậu Thân  ')
  await nextTick()
  findDocumentButton('Tiếp tục').click()
  await nextTick()
  await flushPromises()
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
  locationApiMocks.listLocationProvinces.mockReset().mockResolvedValue(provinces)
  locationApiMocks.listLocationDistricts.mockReset().mockImplementation(
    (provinceId: number) => Promise.resolve(districtsByProvince[provinceId] ?? []),
  )
  locationApiMocks.listLocationWards.mockReset().mockImplementation(
    (districtId: number) => Promise.resolve(wardsByDistrict[districtId] ?? []),
  )
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  queryClients.splice(0).forEach((queryClient) => queryClient.clear())
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('customer checkout foundation', () => {
  it('renders the real /checkout route with a compact semantic heading', async () => {
    const { wrapper, router } = await mountCheckout('first-time', true)

    expect(router.currentRoute.value.path).toBe('/checkout')
    expect(wrapper.get('[data-checkout-page] h1').text()).toBe('Thanh toán')
    expect(wrapper.find('[data-checkout-layout]').exists()).toBe(true)
  }, 10_000)

  it('navigates from Cart to Checkout by SPA and provides a back-to-cart action', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/cart')
    await router.isReady()
    const queryClient = createTestQueryClient()
    const wrapper = mount(App, {
      attachTo: document.body,
      global: {
        plugins: [router, [VueQueryPlugin, { queryClient }]],
      },
    })
    mountedWrappers.push(wrapper)
    await flushPromises()

    await wrapper.get('[data-cart-summary] [data-checkout-action]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/checkout')
    expect(wrapper.get('a[aria-label="Trở lại giỏ hàng"]').attributes('href')).toBe('/cart')
  }, 10_000)

  it('automatically opens the address dialog for a first-time customer', async () => {
    const { wrapper } = await mountCheckout()

    expect(document.querySelector('[data-address-dialog]')).not.toBeNull()
    expect(document.body.textContent).toContain('Thêm địa chỉ mới')
    expect(wrapper.get('[data-place-order-desktop]').attributes('disabled')).toBeDefined()
    expect(locationApiMocks.listLocationProvinces).toHaveBeenCalledTimes(1)
    expect(document.querySelector<HTMLSelectElement>('#checkout-province')?.textContent).toContain('Cần Thơ')
    expect(document.querySelector<HTMLSelectElement>('#checkout-district')?.disabled).toBe(true)
    expect(document.querySelector<HTMLSelectElement>('#checkout-ward')?.disabled).toBe(true)
  })

  it('validates required address fields and focuses the first invalid input', async () => {
    await mountCheckout()

    const addressForm = document.querySelector<HTMLFormElement>('[data-address-form]')
    expect(addressForm?.hasAttribute('novalidate')).toBe(true)
    addressForm?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await nextTick()

    expect(document.querySelectorAll('[data-address-form] [aria-invalid="true"]').length).toBeGreaterThanOrEqual(6)
    expect(document.activeElement?.id).toBe('checkout-full-name')
    expect(document.body.textContent).toContain('Số điện thoại Việt Nam chưa hợp lệ')
  })

  it('resets dependent district and ward values when the province changes', async () => {
    await mountCheckout()

    setSelect('#checkout-province', '91')
    await flushPromises()
    expect(locationApiMocks.listLocationDistricts).toHaveBeenLastCalledWith(91)
    setSelect('#checkout-district', '1442')
    await flushPromises()
    expect(locationApiMocks.listLocationWards).toHaveBeenLastCalledWith(1442)
    setSelect('#checkout-ward', '21012')
    await nextTick()
    setSelect('#checkout-province', '202')
    await flushPromises()

    expect(document.querySelector<HTMLSelectElement>('#checkout-district')?.value).toBe('')
    expect(document.querySelector<HTMLSelectElement>('#checkout-ward')?.value).toBe('')
    expect(document.querySelector<HTMLSelectElement>('#checkout-ward')?.disabled).toBe(true)
    expect(document.querySelector<HTMLInputElement>('#checkout-address-detail')?.disabled).toBe(true)
  })

  it('clears the selected ward when the district changes', async () => {
    await mountCheckout()

    setSelect('#checkout-province', '91')
    await flushPromises()
    setSelect('#checkout-district', '1442')
    await flushPromises()
    setSelect('#checkout-ward', '21012')
    await nextTick()
    setSelect('#checkout-district', '1443')
    await flushPromises()

    expect(document.querySelector<HTMLSelectElement>('#checkout-ward')?.value).toBe('')
    expect(document.querySelector<HTMLInputElement>('#checkout-address-detail')?.disabled).toBe(true)
    expect(locationApiMocks.listLocationWards).toHaveBeenLastCalledWith(1443)
  })

  it('renders lightweight location loading states without stale child options', async () => {
    locationApiMocks.listLocationProvinces.mockReturnValue(new Promise(() => undefined))
    await mountCheckout()

    expect(document.querySelector('[data-location-loading="province"]')).not.toBeNull()
    expect(document.querySelector<HTMLSelectElement>('#checkout-province')?.disabled).toBe(true)

    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    queryClients.splice(0).forEach((queryClient) => queryClient.clear())
    document.body.innerHTML = ''
    locationApiMocks.listLocationProvinces.mockResolvedValue(provinces)
    locationApiMocks.listLocationDistricts.mockReturnValue(new Promise(() => undefined))
    await mountCheckout()
    setSelect('#checkout-province', '91')
    await nextTick()

    expect(document.querySelector('[data-location-loading="district"]')).not.toBeNull()
    expect(document.querySelector<HTMLSelectElement>('#checkout-district')?.disabled).toBe(true)
    expect(document.querySelector<HTMLSelectElement>('#checkout-district')?.options).toHaveLength(1)

    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    queryClients.splice(0).forEach((queryClient) => queryClient.clear())
    document.body.innerHTML = ''
    locationApiMocks.listLocationDistricts.mockResolvedValue(districtsByProvince[91])
    locationApiMocks.listLocationWards.mockReturnValue(new Promise(() => undefined))
    await mountCheckout()
    setSelect('#checkout-province', '91')
    await flushPromises()
    setSelect('#checkout-district', '1442')
    await nextTick()

    expect(document.querySelector('[data-location-loading="ward"]')).not.toBeNull()
    expect(document.querySelector<HTMLSelectElement>('#checkout-ward')?.disabled).toBe(true)
    expect(document.querySelector<HTMLSelectElement>('#checkout-ward')?.options).toHaveLength(1)
  })

  it('retries province failures without using local fallback options', async () => {
    locationApiMocks.listLocationProvinces
      .mockRejectedValueOnce(new Error('Không thể tải tỉnh/thành.'))
      .mockResolvedValueOnce(provinces)
    await mountCheckout()

    expect(document.querySelector('[data-location-error="province"]')?.textContent).toContain('Không thể tải tỉnh/thành.')
    expect(document.querySelector<HTMLSelectElement>('#checkout-province')?.options).toHaveLength(1)
    expect(document.body.textContent).not.toContain('Hồ Chí Minh')

    findDocumentButton('Thử tải lại tỉnh/thành').click()
    await flushPromises()

    expect(document.querySelector('[data-location-error="province"]')).toBeNull()
    expect(document.querySelector<HTMLSelectElement>('#checkout-province')?.textContent).toContain('Hồ Chí Minh')
  })

  it('retries district and ward failures with the selected backend identifiers', async () => {
    locationApiMocks.listLocationDistricts
      .mockRejectedValueOnce(new Error('Không thể tải quận/huyện.'))
      .mockResolvedValueOnce(districtsByProvince[91])
    locationApiMocks.listLocationWards
      .mockRejectedValueOnce(new Error('Không thể tải phường/xã.'))
      .mockResolvedValueOnce(wardsByDistrict[1442])
    await mountCheckout()

    setSelect('#checkout-province', '91')
    await flushPromises()
    expect(document.querySelector('[data-location-error="district"]')).not.toBeNull()
    findDocumentButton('Thử tải lại quận/huyện').click()
    await flushPromises()
    expect(locationApiMocks.listLocationDistricts).toHaveBeenLastCalledWith(91)

    setSelect('#checkout-district', '1442')
    await flushPromises()
    expect(document.querySelector('[data-location-error="ward"]')).not.toBeNull()
    findDocumentButton('Thử tải lại phường/xã').click()
    await flushPromises()
    expect(locationApiMocks.listLocationWards).toHaveBeenLastCalledWith(1442)
    expect(document.querySelector<HTMLSelectElement>('#checkout-ward')?.textContent).toContain('Xuân Khánh')
  })

  it('opens OTP only after a valid address and rejects a wrong code', async () => {
    await mountCheckout()
    await completeAddressForm()

    expect(document.querySelector('[data-address-dialog]')).toBeNull()
    expect(document.querySelector('[data-otp-dialog]')).not.toBeNull()

    setInput('#checkout-otp', '111111')
    await nextTick()
    findDocumentButton('Xác nhận').click()
    await nextTick()

    expect(document.querySelector('[data-otp-dialog] [role="alert"]')?.textContent).toContain('Mã xác thực chưa đúng')
  })

  it('accepts only numeric six-digit OTP and verifies with 123456', async () => {
    const { wrapper } = await mountCheckout()
    await completeAddressForm()

    const otp = setInput('#checkout-otp', '12ab345678')
    await nextTick()
    expect(otp.value).toBe('123456')
    findDocumentButton('Xác nhận').click()
    await nextTick()

    expect(document.querySelector('[data-otp-dialog]')?.closest('[role="dialog"]')?.getAttribute('data-state')).toBe('closed')
    expect(wrapper.get('[data-selected-address]').text()).toContain('Trần Ngọc Mai')
    expect(wrapper.get('[data-selected-address]').text()).toContain('đã xác thực local')
    expect(wrapper.get('[data-selected-address]').attributes('data-ghn-province-id')).toBe('91')
    expect(wrapper.get('[data-selected-address]').attributes('data-ghn-district-id')).toBe('1442')
    expect(wrapper.get('[data-selected-address]').attributes('data-ghn-ward-code')).toBe('21012')
    expect(wrapper.get('[data-place-order-desktop]').attributes('disabled')).toBeUndefined()
  })

  it('returns to the address form, preserves non-phone fields, and focuses phone', async () => {
    await mountCheckout()
    await completeAddressForm()

    findDocumentButton('Đổi số điện thoại').click()
    await nextTick()
    await nextTick()

    expect(document.querySelector<HTMLInputElement>('#checkout-full-name')?.value).toBe('Trần Ngọc Mai')
    expect(document.querySelector<HTMLInputElement>('#checkout-address-detail')?.value).toBe('25 đường Mậu Thân')
    expect(document.activeElement?.id).toBe('checkout-phone')
  })

  it('rate-limits OTP resend locally with a countdown and performs no request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    await mountCheckout()
    await completeAddressForm()

    const resend = findDocumentButton('Gửi lại mã sau 30s')
    expect(resend.disabled).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('does not auto-open an address dialog when saved addresses exist', async () => {
    const { wrapper } = await mountCheckout('existing')

    expect(document.querySelector('[data-address-dialog]')).toBeNull()
    expect(wrapper.get('[data-selected-address]').text()).toContain('Nguyễn Minh Anh')
    expect(wrapper.get('[data-place-order-desktop]').attributes('disabled')).toBeUndefined()
  })

  it('changes the selected saved address and can open the add-another form', async () => {
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    const officeRadio = document.querySelector<HTMLInputElement>('input[value="address-office"]')
    expect(officeRadio).not.toBeNull()
    officeRadio?.click()
    findDocumentButton('Dùng địa chỉ này').click()
    await nextTick()
    expect(wrapper.get('[data-selected-address]').text()).toContain('Văn phòng')

    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    findDocumentButton('Thêm địa chỉ khác').click()
    await nextTick()
    expect(document.querySelector('[data-address-form]')).not.toBeNull()
  })

  it('switches between delivery and pickup and makes pickup shipping free', async () => {
    const { wrapper } = await mountCheckout('existing')

    expect(wrapper.find('[data-delivery-section]').exists()).toBe(true)
    expect(wrapper.get('[data-total-shipping]').text()).toContain('30.000')
    await wrapper.get('[data-fulfillment="pickup"]').trigger('click')

    expect(wrapper.find('[data-delivery-section]').exists()).toBe(false)
    expect(wrapper.find('[data-pickup-section]').exists()).toBe(true)
    expect(wrapper.get('[data-total-shipping]').text()).toBe('Miễn phí')
    expect(wrapper.get('[data-selected-payment]').text()).toBe('Thanh toán tại chi nhánh')
  })

  it('renders at least four pickup branches and disables an invalid branch', async () => {
    const { wrapper } = await mountCheckout('existing')
    await wrapper.get('[data-fulfillment="pickup"]').trigger('click')

    expect(wrapper.findAll('[data-branch-id]')).toHaveLength(4)
    expect(wrapper.get('[data-branch-id="binh-thuy"] input').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-branch-id="binh-thuy"]').text()).toContain('Thiếu 1 sản phẩm')
  })

  it('changes the selected shipping method and updates its fee', async () => {
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get<HTMLInputElement>('[data-shipping-option="express"] input').setValue(true)

    expect(wrapper.get('[data-total-shipping]').text()).toContain('55.000')
  })

  it('renders selected products without quantity editing and links corrections to Cart', async () => {
    const { wrapper } = await mountCheckout('existing')

    expect(wrapper.findAll('[data-checkout-products] article')).toHaveLength(2)
    expect(wrapper.get('[data-checkout-products]').text()).toContain('SL 2')
    expect(wrapper.find('[data-checkout-products] [data-cart-quantity]').exists()).toBe(false)
    expect(wrapper.get('[data-checkout-products] a').attributes('href')).toBe('/cart')
  })

  it('blocks ordering for unavailable products and shows a correction warning', async () => {
    const { wrapper } = await mountCheckout('unavailable')

    expect(wrapper.get('[data-unavailable-warning]').text()).toContain('chưa thể đặt hàng')
    expect(wrapper.get('[data-unavailable-warning] a').attributes('href')).toBe('/cart')
    expect(wrapper.get('[data-place-order-desktop]').attributes('disabled')).toBeDefined()
  })

  it('opens and closes the accessible voucher dialog with all local examples', async () => {
    const { wrapper } = await mountCheckout('existing')

    await wrapper.findAll('button').find((button) => button.text() === 'Chọn voucher')?.trigger('click')
    await nextTick()
    expect(document.querySelectorAll('[data-voucher-id]')).toHaveLength(5)
    expect(document.querySelector('[data-voucher-dialog]')).not.toBeNull()

    document.querySelector<HTMLButtonElement>('button[aria-label="Đóng chọn voucher"]')?.click()
    await nextTick()
    expect(document.querySelector('[data-voucher-dialog]')?.closest('[role="dialog"]')?.getAttribute('data-state')).toBe('closed')
  })

  it('applies eligible order and shipping vouchers and updates totals', async () => {
    const { wrapper } = await mountCheckout('existing')

    await wrapper.findAll('button').find((button) => button.text() === 'Chọn voucher')?.trigger('click')
    await nextTick()
    document.querySelector<HTMLInputElement>('[data-voucher-id="order-50"] input')?.click()
    document.querySelector<HTMLInputElement>('[data-voucher-id="shipping-free"] input')?.click()
    await nextTick()
    findDocumentButton('Xác nhận voucher').click()
    await nextTick()

    expect(wrapper.get('[data-total-order-voucher]').text()).toContain('50.000')
    expect(wrapper.get('[data-total-shipping-discount]').text()).toContain('30.000')
    expect(wrapper.get('[data-selected-voucher]').text()).toContain('Giảm 50.000')
  })

  it('keeps ineligible vouchers disabled and removes applied vouchers cleanly', async () => {
    const { wrapper } = await mountCheckout('existing')
    const totalBefore = wrapper.get('[data-total]').text()

    await wrapper.get('[data-checkout-voucher-card] button').trigger('click')
    await nextTick()
    expect(document.querySelector<HTMLInputElement>('[data-voucher-id="order-premium"] input')?.disabled).toBe(true)
    document.querySelector<HTMLInputElement>('[data-voucher-id="order-50"] input')?.click()
    await nextTick()
    findDocumentButton('Xác nhận voucher').click()
    await nextTick()

    await wrapper.get('[data-checkout-voucher-card] button').trigger('click')
    await nextTick()
    findDocumentButton('Bỏ voucher đơn hàng').click()
    await nextTick()
    findDocumentButton('Xác nhận voucher').click()
    await nextTick()
    expect(wrapper.get('[data-total]').text()).toBe(totalBefore)
  })

  it('renders all required payments, communicates wallet insufficiency, and selects VNPay', async () => {
    const { wrapper } = await mountCheckout('existing')
    await wrapper.get('[data-checkout-payment-card] button').trigger('click')
    await nextTick()

    expect(document.querySelectorAll('[data-payment-id]')).toHaveLength(5)
    expect(document.querySelector('[data-payment-id="wallet"]')?.textContent).toContain('Số dư không đủ')
    expect(document.querySelector<HTMLInputElement>('[data-payment-id="wallet"] input')?.disabled).toBe(true)
    document.querySelector<HTMLInputElement>('[data-payment-id="vnpay"] input')?.click()
    await nextTick()
    findDocumentButton('Xác nhận thanh toán').click()
    await nextTick()
    expect(wrapper.get('[data-selected-payment]').text()).toBe('VNPay')
  })

  it('stores an optional order note locally with a character limit', async () => {
    const { wrapper } = await mountCheckout('existing')
    const note = wrapper.get<HTMLTextAreaElement>('#checkout-note')

    await note.setValue('Vui lòng gọi trước khi giao.')

    expect(note.element.value).toBe('Vui lòng gọi trước khi giao.')
    expect(note.attributes('maxlength')).toBe('300')
    expect(wrapper.text()).toContain('28/300')
  })

  it('calculates non-negative typed totals and saved amount', async () => {
    const { wrapper } = await mountCheckout('existing')

    expect(wrapper.get('[data-total-count]').text()).toBe('3')
    expect(wrapper.get('[data-total-subtotal]').text()).toContain('513.000')
    expect(wrapper.get('[data-total]').text()).toContain('543.000')
    expect(wrapper.get('[data-saved-amount]').text()).toContain('Tiết kiệm')
  })

  it('prevents double submission and renders the local success result', async () => {
    vi.useFakeTimers()
    const { wrapper } = await mountCheckout('existing')
    const placeOrder = wrapper.get('[data-place-order-desktop]')

    await placeOrder.trigger('click')
    await placeOrder.trigger('click')
    expect(wrapper.get('[data-checkout-page]').attributes('data-submit-count')).toBe('1')
    expect(placeOrder.text()).toContain('Đang đặt hàng')

    await vi.advanceTimersByTimeAsync(250)
    await nextTick()
    expect(document.querySelector('[data-order-result]')?.getAttribute('data-result-kind')).toBe('success')
    expect(document.body.textContent).toContain('MZK-DEMO-260731')
    expect(document.body.textContent).toContain('Tiếp tục mua sắm')
  })

  it('renders a recoverable failure and retries without losing checkout state', async () => {
    vi.useFakeTimers()
    const { wrapper } = await mountCheckout('failure')
    await wrapper.get<HTMLTextAreaElement>('#checkout-note').setValue('Giữ nguyên ghi chú')
    await wrapper.get('[data-place-order-desktop]').trigger('click')
    await vi.advanceTimersByTimeAsync(250)
    await nextTick()

    expect(document.querySelector('[data-order-result]')?.getAttribute('data-result-kind')).toBe('failure')
    findDocumentButton('Thử đặt hàng lại').click()
    await nextTick()
    expect(document.querySelector('[data-order-result]')).toBeNull()
    expect(wrapper.get<HTMLTextAreaElement>('#checkout-note').element.value).toBe('Giữ nguyên ghi chú')
  })

  it('selects a local result scenario without relying on a URL or network request', async () => {
    const { wrapper } = await mountCheckout('existing')
    const resultScenario = wrapper.get<HTMLSelectElement>('[data-checkout-result-scenario]')

    await resultScenario.setValue('failure')

    expect(resultScenario.element.value).toBe('failure')
  })

  it.each([
    ['loading', '[data-checkout-loading]'],
    ['empty', '[data-checkout-empty]'],
    ['error', '[data-checkout-error]'],
  ] as const)('renders the local %s checkout state', async (scenario, selector) => {
    const { wrapper } = await mountCheckout(scenario)

    expect(wrapper.find(selector).exists()).toBe(true)
    if (scenario === 'empty') expect(wrapper.find('[data-checkout-summary]').exists()).toBe(false)
  })

  it('keeps desktop and mobile checkout layout contracts without utility overlap', async () => {
    const { wrapper } = await mountCheckout('existing')
    const layout = wrapper.get('[data-checkout-layout]')
    const summary = wrapper.get('[data-checkout-summary]')
    const mobileBar = wrapper.get('[data-mobile-order-bar]')

    expect(layout.classes()).toContain('lg:grid-cols-[minmax(0,1fr)_22rem]')
    expect(summary.classes()).toEqual(expect.arrayContaining(['lg:sticky', 'lg:top-36']))
    expect(mobileBar.classes()).toEqual(expect.arrayContaining(['fixed', 'bottom-[5.75rem]', 'md:hidden']))
    expect(mobileBar.attributes('aria-label')).toBe('Thanh đặt hàng mobile')
    expect(wrapper.find('[data-customer-voucher-float]').exists()).toBe(false)
    expect(wrapper.find('[data-customer-back-to-top]').exists()).toBe(false)
  })

  it('uses no external images, network request, or any type in checkout implementation', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get('[data-fulfillment="pickup"]').trigger('click')
    await wrapper.get('[data-fulfillment="delivery"]').trigger('click')

    const source = [
      readFileSync('src/pages/customer/CheckoutPage.vue', 'utf8'),
      readFileSync('src/components/checkout/CheckoutAddressDialog.vue', 'utf8'),
      readFileSync('src/components/checkout/CheckoutOtpDialog.vue', 'utf8'),
      readFileSync('src/components/checkout/CheckoutVoucherDialog.vue', 'utf8'),
      readFileSync('src/components/checkout/CheckoutPaymentDialog.vue', 'utf8'),
      readFileSync('src/data/customer/checkoutDemoData.ts', 'utf8'),
    ].join('\n')
    const addressDialogSource = readFileSync(
      'src/components/checkout/CheckoutAddressDialog.vue',
      'utf8',
    )

    expect(wrapper.findAll('img[src^="http"]')).toHaveLength(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(openSpy).not.toHaveBeenCalled()
    expect(source).not.toMatch(/\bany\b/)
    expect(addressDialogSource).not.toMatch(/apiClient|axios|ENDPOINTS|\/api\/v1\/locations/)
  })
})
