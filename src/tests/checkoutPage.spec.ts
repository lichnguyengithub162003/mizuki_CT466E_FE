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
import type { CheckoutAddress, CheckoutScenario } from '@/types/customer'
import { useAuthStore } from '@/stores/auth'
import { useBranchPreferenceStore } from '@/stores/branchPreference'
import { BRANCH_PREFERENCE_KEY } from '@/stores/branchPreference'
import { pinia } from '@/stores/pinia'
import { customerShippingQuoteKeys } from '@/queries/shipping'

const locationApiMocks = vi.hoisted(() => ({
  listLocationProvinces: vi.fn(),
  listLocationDistricts: vi.fn(),
  listLocationWards: vi.fn(),
}))

const cartApiMocks = vi.hoisted(() => ({
  getCustomerCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  selectCartBranch: vi.fn(),
}))

const addressApiMocks = vi.hoisted(() => ({
  getCustomerAddresses: vi.fn(),
  createCustomerAddress: vi.fn(),
  updateCustomerAddress: vi.fn(),
  setDefaultCustomerAddress: vi.fn(),
  deleteCustomerAddress: vi.fn(),
}))

const shippingApiMocks = vi.hoisted(() => ({
  getCustomerShippingQuote: vi.fn(),
}))

const orderApiMocks = vi.hoisted(() => ({
  createCustomerOrder: vi.fn(),
}))

const vnpayApiMocks = vi.hoisted(() => ({
  initiateCustomerVnPayPayment: vi.fn(),
  verifyVnPayReturn: vi.fn(),
  getCustomerOrderPayment: vi.fn(),
  redirectToVnPay: vi.fn(),
}))

vi.mock('@/api/locations/locationApi', () => locationApiMocks)
vi.mock('@/api/cartApi', () => cartApiMocks)
vi.mock('@/api/addressApi', () => addressApiMocks)
vi.mock('@/api/shippingApi', () => shippingApiMocks)
vi.mock('@/api/orderApi', () => orderApiMocks)
vi.mock('@/api/vnpayApi', () => vnpayApiMocks)

const serverCart = {
  id: 1,
  branch: { id: 6, name: 'Mizuki Vĩnh Long', address: 'Vĩnh Long' },
  totalQuantity: 3,
  totalAmount: 500_000,
  discountAmount: 25_000,
  totalAfterDiscount: 475_000,
  items: [
    {
      id: 31,
      product: {
        id: 11,
        name: 'Sữa rửa mặt thật',
        slug: 'sua-rua-mat-that',
        brandName: 'La Roche-Posay',
        imageUrl: 'https://cdn.mizuki.test/products/cleanser.webp',
      },
      variant: { id: 71, name: '50ml', sku: 'SKU-71', effectivePrice: 100_000 },
      quantity: 2,
      subtotal: 200_000,
      availableQuantity: 4,
      stockWarning: false,
    },
    {
      id: 32,
      product: { id: 12, name: 'Serum thật', slug: 'serum-that', brandName: null },
      variant: { id: 72, name: '30ml', sku: 'SKU-72', effectivePrice: 300_000 },
      quantity: 1,
      subtotal: 300_000,
      availableQuantity: 2,
      stockWarning: false,
    },
  ],
}

const activeBranch = {
  id: 6,
  code: 'MZ-VL',
  name: 'Mizuki Vĩnh Long',
  address: 'Vĩnh Long',
  phone: null,
  email: null,
  is_active: true,
  opening_hours: [],
}

const quoteToken17 = 'a'.repeat(64)
const quoteToken18 = 'b'.repeat(64)
const firstIdempotencyKey = '11111111-1111-4111-8111-111111111111'
const secondIdempotencyKey = '22222222-2222-4222-8222-222222222222'
const orderAttemptStorageKey = 'mizuki:checkout:create-order-attempt:1'

const shippingQuote = {
  shippingFee: 42_000,
  expectedDeliveryTime: '2026-08-27T15:00:00+07:00',
  expiresAt: '2099-08-25T12:00:00Z',
  quoteToken: quoteToken17,
}

const createdOrder = {
  id: 901,
  orderNumber: 'MZ-20260825-0901',
  status: 'pending',
  statusLabel: 'Chờ xác nhận',
  deliveryMethod: 'delivery' as const,
  paymentMethod: 'cash' as const,
  totalAmount: 519_000,
}

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

const savedAddresses: readonly CheckoutAddress[] = [
  {
    id: '17', fullName: 'Nguyễn Minh Anh', phone: '0912345678',
    provinceName: 'Cần Thơ', districtName: 'Ninh Kiều', wardName: 'Xuân Khánh',
    detail: '48 đường 30/4', isDefault: true,
    ghn_province_id: 91, ghn_district_id: 1442, ghn_ward_code: '21012',
  },
  {
    id: '18', fullName: 'Nguyễn Minh Anh', phone: '0987654321',
    provinceName: 'Cần Thơ', districtName: 'Cái Răng', wardName: 'Hưng Phú',
    detail: '12 Nguyễn Văn Linh', isDefault: false,
    ghn_province_id: 91, ghn_district_id: 1443, ghn_ward_code: '21018',
  },
]

interface MountedCheckout {
  readonly wrapper: VueWrapper
  readonly router: Router
  readonly queryClient: QueryClient
}

const mountedWrappers: VueWrapper[] = []
const queryClients: QueryClient[] = []
let serverAddresses: CheckoutAddress[] = []

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
  addressFixture: readonly CheckoutAddress[] = scenario === 'first-time' && !throughRouter
    ? []
    : savedAddresses,
): Promise<MountedCheckout> {
  serverAddresses = [...addressFixture]
  const scenarioUserIds: Partial<Record<CheckoutScenario, number>> = {
    loading: 101,
    empty: 102,
    error: 103,
  }
  const scenarioUserId = scenarioUserIds[scenario]
  if (scenarioUserId !== undefined) {
    const authStore = useAuthStore(pinia)
    if (authStore.user) authStore.$patch({ user: { ...authStore.user, id: scenarioUserId } })
  }
  if (scenario === 'loading') {
    cartApiMocks.getCustomerCart.mockReturnValue(new Promise(() => undefined))
  } else if (scenario === 'empty') {
    cartApiMocks.getCustomerCart.mockResolvedValue({
      ...structuredClone(serverCart),
      items: [],
      totalQuantity: 0,
      totalAmount: 0,
      discountAmount: 0,
      totalAfterDiscount: 0,
    })
  } else if (scenario === 'error') {
    cartApiMocks.getCustomerCart.mockRejectedValue(new Error('Không thể tải giỏ hàng thật.'))
  } else if (scenario === 'unavailable') {
    cartApiMocks.getCustomerCart.mockResolvedValue({
      ...structuredClone(serverCart),
      items: [{ ...structuredClone(serverCart.items[0]), stockWarning: true }],
      totalQuantity: 2,
      totalAmount: 200_000,
      discountAmount: 0,
      totalAfterDiscount: 200_000,
    })
  }
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
  return { wrapper, router, queryClient }
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
  findDocumentButton('Lưu địa chỉ').click()
  await nextTick()
  await flushPromises()
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce(firstIdempotencyKey)
    .mockReturnValueOnce(secondIdempotencyKey)
  window.sessionStorage.clear()
  window.localStorage.setItem(BRANCH_PREFERENCE_KEY, '6')
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
  useBranchPreferenceStore(pinia).$patch({
    branches: [activeBranch],
    selectedBranchId: 6,
    status: 'success',
    error: null,
  })
  locationApiMocks.listLocationProvinces.mockReset().mockResolvedValue(provinces)
  locationApiMocks.listLocationDistricts.mockReset().mockImplementation(
    (provinceId: number) => Promise.resolve(districtsByProvince[provinceId] ?? []),
  )
  locationApiMocks.listLocationWards.mockReset().mockImplementation(
    (districtId: number) => Promise.resolve(wardsByDistrict[districtId] ?? []),
  )
  cartApiMocks.getCustomerCart.mockReset().mockResolvedValue(structuredClone(serverCart))
  cartApiMocks.addCartItem.mockReset()
  cartApiMocks.updateCartItem.mockReset()
  cartApiMocks.removeCartItem.mockReset()
  cartApiMocks.selectCartBranch.mockReset().mockResolvedValue(structuredClone(serverCart))
  shippingApiMocks.getCustomerShippingQuote.mockReset().mockImplementation(
    async (addressId: number) => ({
      ...shippingQuote,
      quoteToken: addressId === 18 ? quoteToken18 : quoteToken17,
    }),
  )
  orderApiMocks.createCustomerOrder.mockReset().mockResolvedValue({ ...createdOrder })
  vnpayApiMocks.initiateCustomerVnPayPayment.mockReset().mockResolvedValue({
    paymentUrl: 'https://pay.example.test/vnpay/backend-signed-url',
    expiresAt: '2026-08-26T12:15:00+07:00',
    paymentNumber: 'PAY-20260826-ABC12345',
  })
  vnpayApiMocks.verifyVnPayReturn.mockReset()
  vnpayApiMocks.getCustomerOrderPayment.mockReset()
  vnpayApiMocks.redirectToVnPay.mockReset()
  serverAddresses = [...savedAddresses]
  addressApiMocks.getCustomerAddresses.mockReset().mockImplementation(
    async () => [...serverAddresses],
  )
  addressApiMocks.createCustomerAddress.mockReset().mockImplementation(async (draft) => {
    const savedAddress = { ...draft, id: '19' }
    serverAddresses = [
      ...serverAddresses.map((address) => savedAddress.isDefault
        ? { ...address, isDefault: false }
        : address),
      savedAddress,
    ]
    return savedAddress
  })
  addressApiMocks.updateCustomerAddress.mockReset().mockImplementation(async (id, draft) => {
    const savedAddress = { ...draft, id }
    serverAddresses = serverAddresses.map((address) => address.id === id
      ? savedAddress
      : savedAddress.isDefault ? { ...address, isDefault: false } : address)
    return savedAddress
  })
  addressApiMocks.setDefaultCustomerAddress.mockReset().mockImplementation(async (id) => {
    const savedAddress = { ...serverAddresses.find((address) => address.id === id)!, isDefault: true }
    serverAddresses = serverAddresses.map((address) => ({
      ...(address.id === id ? savedAddress : address),
      isDefault: address.id === id,
    }))
    return savedAddress
  })
  addressApiMocks.deleteCustomerAddress.mockReset().mockImplementation(async (id) => {
    serverAddresses = serverAddresses.filter((address) => address.id !== id)
  })
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  queryClients.splice(0).forEach((queryClient) => queryClient.clear())
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.sessionStorage.clear()
  window.localStorage.removeItem(BRANCH_PREFERENCE_KEY)
})

describe('customer checkout foundation', () => {
  it('renders the real /checkout route with a compact semantic heading', async () => {
    const { wrapper, router } = await mountCheckout('first-time', true)

    expect(router.currentRoute.value.path).toBe('/checkout')
    expect(wrapper.get('[data-checkout-page] h1').text()).toBe('Thanh toán')
    expect(wrapper.get('[data-checkout-page] h1').classes()).toEqual(
      expect.arrayContaining(['text-body-md', 'font-semibold']),
    )
    expect(wrapper.get('a[aria-label="Trở lại giỏ hàng"]').classes()).toEqual(
      expect.arrayContaining(['size-8', 'rounded-lg']),
    )
    expect(wrapper.get('[data-checkout-header]').classes()).toContain('gap-1.5')
    expect(wrapper.get('[data-checkout-header]').element.parentElement?.className)
      .toContain('pt-2')
    expect(wrapper.find('[data-checkout-layout]').exists()).toBe(true)
  }, 10_000)

  it('loads, updates, selects, and defaults persisted addresses on the real route', async () => {
    const { wrapper } = await mountCheckout('first-time', true)

    expect(addressApiMocks.getCustomerAddresses).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-selected-address]').text()).toContain('48 đường 30/4')
    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()

    document.querySelector<HTMLButtonElement>('button[aria-label="Sửa địa chỉ của Nguyễn Minh Anh"]')?.click()
    await nextTick()
    setInput('#checkout-address-detail', '50 đường 30/4')
    await nextTick()
    findDocumentButton('Lưu thay đổi').click()
    await flushPromises()
    expect(addressApiMocks.updateCustomerAddress).toHaveBeenCalledWith(
      '17',
      expect.objectContaining({ detail: '50 đường 30/4', ghn_ward_code: '21012' }),
    )
    expect(addressApiMocks.getCustomerAddresses).toHaveBeenCalledTimes(2)

    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    document.querySelector<HTMLButtonElement>('button[aria-label="Đặt địa chỉ của Nguyễn Minh Anh làm mặc định"]')?.click()
    await flushPromises()
    expect(addressApiMocks.setDefaultCustomerAddress.mock.calls[0]?.[0]).toBe('18')
    expect(addressApiMocks.getCustomerAddresses).toHaveBeenCalledTimes(3)
  })

  it('creates a persisted address with exact location identifiers and skips demo OTP', async () => {
    const { wrapper } = await mountCheckout('first-time', true, [])

    await wrapper.get('[data-delivery-section] button').trigger('click')
    await flushPromises()
    setInput('#checkout-full-name', 'Trần Ngọc Mai')
    await nextTick()
    setInput('#checkout-phone', '0912345678')
    await nextTick()
    setSelect('#checkout-province', '91')
    await flushPromises()
    setSelect('#checkout-district', '1442')
    await flushPromises()
    setSelect('#checkout-ward', '21012')
    await nextTick()
    setInput('#checkout-address-detail', '25 đường Mậu Thân')
    await nextTick()
    findDocumentButton('Lưu địa chỉ').click()
    await flushPromises()

    expect(addressApiMocks.createCustomerAddress.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      ghn_province_id: 91,
      ghn_district_id: 1442,
      ghn_ward_code: '21012',
    }))
    expect(addressApiMocks.getCustomerAddresses).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-selected-address]').text()).toContain('25 đường Mậu Thân')
  })

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
    expect(document.body.textContent).toContain('Địa chỉ nhận hàng')
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

  it('persists a valid address and selects it without a local verification step', async () => {
    const { wrapper } = await mountCheckout()
    await completeAddressForm()

    expect(addressApiMocks.createCustomerAddress).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-address-dialog]')).toBeNull()
    expect(wrapper.get('[data-selected-address]').text()).toContain('Trần Ngọc Mai')
    expect(wrapper.get('[data-selected-address]').text()).toContain('đã lưu trong tài khoản')
    expect(wrapper.get('[data-selected-address]').attributes('data-ghn-province-id')).toBe('91')
    expect(wrapper.get('[data-selected-address]').attributes('data-ghn-district-id')).toBe('1442')
    expect(wrapper.get('[data-selected-address]').attributes('data-ghn-ward-code')).toBe('21012')
    expect(wrapper.get('[data-place-order-desktop]').attributes('disabled')).toBeUndefined()
  })

  it('maps backend address validation errors to the matching form inputs', async () => {
    addressApiMocks.createCustomerAddress.mockRejectedValueOnce({
      name: 'ApplicationError',
      kind: 'validation',
      message: 'Dữ liệu địa chỉ chưa hợp lệ.',
      validationErrors: {
        recipient_name: ['Tên người nhận đã được backend từ chối.'],
        recipient_phone: ['Số điện thoại đã được backend từ chối.'],
        province: ['Tỉnh/Thành phố đã được backend từ chối.'],
        district: ['Quận/Huyện đã được backend từ chối.'],
        ward: ['Phường/Xã đã được backend từ chối.'],
        address_line: ['Địa chỉ chi tiết đã được backend từ chối.'],
      },
      cause: null,
    })
    await mountCheckout()
    await completeAddressForm()

    expect(document.querySelector('#checkout-full-name-error')?.textContent)
      .toContain('Tên người nhận đã được backend từ chối.')
    expect(document.querySelector('#checkout-phone-error')?.textContent)
      .toContain('Số điện thoại đã được backend từ chối.')
    expect(document.querySelector('#checkout-province-error')?.textContent)
      .toContain('Tỉnh/Thành phố đã được backend từ chối.')
    expect(document.querySelector('#checkout-district-error')?.textContent)
      .toContain('Quận/Huyện đã được backend từ chối.')
    expect(document.querySelector('#checkout-ward-error')?.textContent)
      .toContain('Phường/Xã đã được backend từ chối.')
    expect(document.querySelector('#checkout-detail-error')?.textContent)
      .toContain('Địa chỉ chi tiết đã được backend từ chối.')
    expect(document.activeElement?.id).toBe('checkout-full-name')
  })

  it('does not auto-open an address dialog when saved addresses exist', async () => {
    const { wrapper } = await mountCheckout('existing')

    expect(document.querySelector('[data-address-dialog]')).toBeNull()
    expect(wrapper.get('[data-selected-address]').text()).toContain('Nguyễn Minh Anh')
    expect(wrapper.get('[data-place-order-desktop]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-saved-address-account]').classes()).toContain('text-blue-600')
    expect(wrapper.get('[data-saved-address-account] svg').classes()).toContain('text-blue-600')
  })

  it('changes the selected saved address and can open the add-another form', async () => {
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    const officeRadio = document.querySelector<HTMLInputElement>('input[value="18"]')
    expect(officeRadio).not.toBeNull()
    officeRadio?.click()
    findDocumentButton('Dùng địa chỉ này').click()
    await nextTick()
    expect(wrapper.get('[data-selected-address]').text()).toContain('12 Nguyễn Văn Linh')

    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    findDocumentButton('Thêm địa chỉ khác').click()
    await nextTick()
    expect(document.querySelector('[data-address-form]')).not.toBeNull()
  })

  it('preserves the checkout selection when the address selector is reopened', async () => {
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    document.querySelector<HTMLInputElement>('input[value="18"]')?.click()
    findDocumentButton('Dùng địa chỉ này').click()
    await nextTick()

    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()

    expect(document.querySelector<HTMLInputElement>('input[value="18"]')?.checked).toBe(true)
    expect(document.querySelector<HTMLInputElement>('input[value="17"]')?.checked).toBe(false)
  })

  it('clears a previous address mutation error before starting another action', async () => {
    addressApiMocks.deleteCustomerAddress.mockRejectedValueOnce(
      new Error('Không thể xóa địa chỉ.'),
    )
    const { wrapper } = await mountCheckout('existing')
    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    document.querySelector<HTMLButtonElement>('button[aria-label^="Xóa địa chỉ"]')?.click()
    await flushPromises()
    expect(document.querySelector('[data-address-error]')).not.toBeNull()

    findDocumentButton('Thêm địa chỉ khác').click()
    await nextTick()

    expect(document.querySelector('[data-address-mutation-error]')).toBeNull()
    expect(document.querySelector('[data-address-form]')).not.toBeNull()
  })

  it('deletes a selected address and falls back to the default remaining address', async () => {
    const addressesWithSecondSelected = [
      savedAddresses[0]!,
      savedAddresses[1]!,
    ]
    const { wrapper } = await mountCheckout('existing', false, addressesWithSecondSelected)
    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    document.querySelector<HTMLInputElement>('input[value="18"]')?.click()
    findDocumentButton('Dùng địa chỉ này').click()
    await nextTick()
    expect(wrapper.get('[data-selected-address]').text()).toContain('12 Nguyễn Văn Linh')

    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    const deleteButtons = [...document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Xóa địa chỉ"]')]
    deleteButtons[1]?.click()
    await flushPromises()

    expect(addressApiMocks.deleteCustomerAddress.mock.calls[0]?.[0]).toBe('18')
    expect(addressApiMocks.getCustomerAddresses).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-selected-address]').text()).toContain('48 đường 30/4')
    expect(document.querySelector<HTMLInputElement>('input[value="18"]')).toBeNull()
  })

  it('shows delete pending and error states without removing the address', async () => {
    let rejectDelete: ((error: Error) => void) | undefined
    addressApiMocks.deleteCustomerAddress.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
      rejectDelete = reject
    }))
    const { wrapper } = await mountCheckout('existing')
    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    const deleteButton = document.querySelector<HTMLButtonElement>('button[aria-label^="Xóa địa chỉ"]')!
    deleteButton.click()
    await nextTick()
    expect(deleteButton.textContent).toContain('Đang xóa')
    expect(deleteButton.disabled).toBe(true)

    rejectDelete?.(new Error('Không thể xóa địa chỉ.'))
    await flushPromises()
    expect(document.querySelector('[data-address-error]')?.textContent).toContain('Không thể xóa địa chỉ')
    expect(document.querySelector<HTMLInputElement>('input[value="17"]')).not.toBeNull()
  })

  it('starts in delivery mode and keeps the real GHN flow unchanged', async () => {
    const { wrapper } = await mountCheckout('existing')

    const selector = wrapper.get('[role="radiogroup"][aria-label="Cách nhận hàng"]')
    expect(selector.classes()).toContain('h-[3.75rem]')
    expect(wrapper.get('[data-fulfillment="delivery"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[data-fulfillment="delivery"]').classes()).toEqual(
      expect.arrayContaining(['h-11', 'leading-none', 'border-primary-600', 'bg-primary-50']),
    )
    expect(wrapper.get('[data-fulfillment="pickup"]').classes())
      .toEqual(expect.arrayContaining(['h-11', 'leading-none']))
    expect(wrapper.find('[data-delivery-section]').exists()).toBe(true)
    expect(wrapper.find('[data-delivery-only]').exists()).toBe(false)
    expect(wrapper.get('[data-total-shipping]').text()).toContain('42.000')
    expect(wrapper.find('[data-pickup-section]').exists()).toBe(false)
    expect(wrapper.find('[data-fulfillment="pickup"]').exists()).toBe(true)
    expect(shippingApiMocks.getCustomerShippingQuote).toHaveBeenCalledWith(17)
    expect(serverCart.branch.name).toBe('Mizuki Vĩnh Long')
  })

  it('uses the real cart branch and zero fee for pickup without requesting GHN', async () => {
    orderApiMocks.createCustomerOrder.mockResolvedValueOnce({
      ...createdOrder,
      deliveryMethod: 'pickup',
      totalAmount: 475_000,
    })
    const { wrapper } = await mountCheckout('first-time')
    expect(shippingApiMocks.getCustomerShippingQuote).not.toHaveBeenCalled()

    const selectorClasses = wrapper.get('[data-fulfillment-selector]').classes()
    await wrapper.get('[data-fulfillment="pickup"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-fulfillment="pickup"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[data-fulfillment="pickup"]').classes()).toEqual(
      expect.arrayContaining(['h-11', 'leading-none', 'border-primary-600', 'bg-primary-50']),
    )
    expect(wrapper.get('[data-fulfillment-selector]').classes()).toEqual(selectorClasses)
    expect(wrapper.find('[data-delivery-section]').exists()).toBe(false)
    expect(wrapper.find('[data-shipping-quote]').exists()).toBe(false)
    expect(wrapper.find('[data-delivery-policies]').exists()).toBe(false)
    expect(document.querySelector('[data-address-dialog]')).toBeNull()
    expect(wrapper.get('[data-pickup-branch-name]').text()).toBe(serverCart.branch.name)
    expect(wrapper.get('[data-pickup-branch-address]').text()).toBe(serverCart.branch.address)
    expect(wrapper.get('[data-pickup-fee]').text()).toBe('Phí nhận tại chi nhánh: 0 đ')
    expect(wrapper.get('[data-pickup-section]').classes()).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^min-h-/)]),
    )
    expect(wrapper.get('[data-pickup-section]').classes()).toContain('p-3')
    expect(wrapper.get('[data-total-shipping]').text()).toMatch(/0\s*₫/)
    expect(wrapper.get('[data-total]').text()).toContain('475.000')
    expect(wrapper.get('[data-selected-payment]').text()).toBe('Thanh toán khi nhận hàng')
    expect(shippingApiMocks.getCustomerShippingQuote).not.toHaveBeenCalled()

    await wrapper.get('[data-change-payment]').trigger('click')
    await nextTick()
    expect(document.querySelector('[data-payment-id="cod"]')?.textContent)
      .toContain('Thanh toán khi nhận hàng')
    expect(document.querySelector('[data-payment-id="cod"]')?.textContent)
      .toContain('Thanh toán trực tiếp khi nhận hàng tại chi nhánh.')
    findDocumentButton('Xác nhận thanh toán').click()
    await nextTick()

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    expect(document.querySelector('[data-order-confirmation]')?.textContent)
      .toContain('Nhận tại chi nhánh')
    expect(document.querySelector('[data-order-confirmation]')?.textContent)
      .toContain('Thanh toán khi nhận hàng')
    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()

    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[0]).toEqual({
      delivery_method: 'pickup',
      payment_method: 'cash',
    })
    expect(Object.keys(orderApiMocks.createCustomerOrder.mock.calls[0]![0]))
      .toEqual(['delivery_method', 'payment_method'])
    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[1]).toBe(firstIdempotencyKey)
  })

  it('restores the selected address and real quote when switching back to delivery', async () => {
    const { wrapper } = await mountCheckout('existing')
    const initialQuoteCalls = shippingApiMocks.getCustomerShippingQuote.mock.calls.length

    await wrapper.get('[data-fulfillment="pickup"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-selected-address]').exists()).toBe(false)

    await wrapper.get('[data-fulfillment="delivery"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-selected-address]').text()).toContain('48 đường 30/4')
    expect(wrapper.get('[data-shipping-quote-success]').text()).toContain('42.000')
    expect(wrapper.get('[data-total-shipping]').text()).toContain('42.000')
    expect(wrapper.get('[data-selected-payment]').text()).toBe('Thanh toán khi nhận hàng')
    expect(shippingApiMocks.getCustomerShippingQuote.mock.calls.length)
      .toBeGreaterThanOrEqual(initialQuoteCalls)
  })

  it('requests one GHN quote and preserves its backend fields', async () => {
    const { wrapper } = await mountCheckout('existing')

    expect(shippingApiMocks.getCustomerShippingQuote).toHaveBeenCalledWith(17)
    expect(wrapper.find('[data-shipping-option]').exists()).toBe(false)
    expect(wrapper.get('[data-shipping-quote-success]').text()).toContain('Dự kiến nhận hàng: 27/08/2026')
    expect(wrapper.get('[data-shipping-quote-success]').text()).toContain('42.000')
    expect(wrapper.get('[data-shipping-quote-success]').attributes('data-quote-token'))
      .toBe(quoteToken17)
    expect(wrapper.get('[data-shipping-quote-success]').attributes('data-quote-expires-at'))
      .toBe('2099-08-25T12:00:00Z')
    expect(wrapper.get('[data-delivery-truck-icon]').classes().some((className) =>
      /animate|pulse|bounce|blink/.test(className),
    )).toBe(false)
    expect(wrapper.get('[data-delivery-truck-icon]').element.parentElement?.classList.contains('text-primary-700')).toBe(true)
    expect(wrapper.get('[data-delivery-policies]').text())
      .toContain('Nhận tối đa 15.000đ nếu đơn hàng giao trễ')
    expect(wrapper.get('[data-inspection-policy]').text()).toContain('Được đồng kiểm')
    await wrapper.get('[data-inspection-policy] summary').trigger('click')
    expect(wrapper.get('[data-inspection-policy]').text()).toContain('đối chiếu sản phẩm')
  })

  it('shows a complete fallback when GHN returns a null expected delivery time', async () => {
    shippingApiMocks.getCustomerShippingQuote.mockResolvedValueOnce({
      ...shippingQuote,
      expectedDeliveryTime: null,
    })
    const { wrapper } = await mountCheckout('existing')

    expect(wrapper.get('[data-expected-delivery-fallback]').text())
      .toBe('Ngày nhận hàng dự kiến đang được cập nhật')
    expect(wrapper.get('[data-shipping-quote-success]').text())
      .not.toContain('Dự kiến nhận hàng:')
  })

  it('refetches the shipping quote when the selected address changes', async () => {
    const { wrapper } = await mountCheckout('existing')
    shippingApiMocks.getCustomerShippingQuote.mockClear()
    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    document.querySelector<HTMLInputElement>('input[value="18"]')?.click()
    findDocumentButton('Dùng địa chỉ này').click()
    await flushPromises()

    expect(shippingApiMocks.getCustomerShippingQuote).toHaveBeenCalledWith(18)
  })

  it('shows shipping quote errors and retries successfully', async () => {
    shippingApiMocks.getCustomerShippingQuote
      .mockRejectedValueOnce(new Error('GHN tạm thời không phản hồi.'))
      .mockResolvedValueOnce({ ...shippingQuote })
    await mountCheckout('existing')

    expect(document.querySelector('[data-shipping-quote-error]')?.textContent)
      .toContain('GHN tạm thời không phản hồi.')
    findDocumentButton('Thử lấy lại báo giá').click()
    await flushPromises()

    expect(shippingApiMocks.getCustomerShippingQuote).toHaveBeenCalledTimes(2)
    expect(document.querySelector('[data-shipping-quote-success]')).not.toBeNull()
  })

  it('shows a shipping quote loading state', async () => {
    shippingApiMocks.getCustomerShippingQuote.mockReturnValueOnce(
      new Promise(() => undefined),
    )
    await mountCheckout('existing')

    expect(document.querySelector('[data-shipping-quote-loading]')).not.toBeNull()
    expect(document.querySelector<HTMLButtonElement>('[data-place-order-desktop]')?.disabled)
      .toBe(true)
  })

  it('shows an expired quote and replaces it on refetch', async () => {
    shippingApiMocks.getCustomerShippingQuote
      .mockResolvedValueOnce({ ...shippingQuote, expiresAt: '2020-01-01T00:00:00Z' })
      .mockResolvedValueOnce({ ...shippingQuote, quoteToken: quoteToken18 })
    await mountCheckout('existing')

    expect(document.querySelector('[data-shipping-quote-expired]')).not.toBeNull()
    findDocumentButton('Cập nhật báo giá').click()
    await flushPromises()

    expect(document.querySelector('[data-shipping-quote-success]')?.getAttribute('data-quote-token'))
      .toBe(quoteToken18)
  })

  it('renders brand, product name, quantity, unit price, and line total without variant duplication', async () => {
    const { wrapper } = await mountCheckout('existing')

    expect(wrapper.findAll('[data-checkout-products] article')).toHaveLength(2)
    expect(wrapper.get('[data-checkout-products]').text()).toContain('Toàn bộ giỏ hàng')
    expect(wrapper.get('[data-checkout-products]').text()).toContain('Sữa rửa mặt thật')
    expect(wrapper.get('[data-checkout-products]').text()).toContain('La Roche-Posay')
    expect(wrapper.findAll('[data-product-brand]')).toHaveLength(1)
    expect(wrapper.get('[data-checkout-products]').text()).not.toContain('SKU-71')
    expect(wrapper.get('[data-checkout-products]').text()).not.toContain('SKU-72')
    expect(wrapper.get('[data-checkout-products]').text()).not.toContain('50ml')
    expect(wrapper.get('[data-checkout-products]').text()).not.toContain('30ml')
    expect(wrapper.get('[data-checkout-products]').text()).toContain('Số lượng: 2')
    expect(wrapper.get('[data-checkout-products]').text()).not.toContain('Sẵn sàng đặt hàng')
    expect(wrapper.get('[data-checkout-products]').text()).toContain('100.000')
    expect(wrapper.get('[data-checkout-products]').text()).toContain('200.000')
    expect(wrapper.find('[data-checkout-products] [data-cart-quantity]').exists()).toBe(false)
    expect(wrapper.get('[data-checkout-products] a').attributes('href')).toBe('/cart')
    expect(wrapper.findAll('[data-checkout-product-image]')).toHaveLength(1)
    expect(wrapper.get<HTMLImageElement>('[data-checkout-product-image]').attributes('src'))
      .toBe('https://cdn.mizuki.test/products/cleanser.webp')
    expect(wrapper.findAll('[data-checkout-product-fallback]')).toHaveLength(1)
    expect(wrapper.findAll('[data-checkout-products] h3')[0]?.classes()).toEqual(
      expect.arrayContaining(['break-words', '[overflow-wrap:anywhere]']),
    )

    await wrapper.get('[data-checkout-product-image]').trigger('error')
    expect(wrapper.find('[data-checkout-product-image]').exists()).toBe(false)
    expect(wrapper.findAll('[data-checkout-product-fallback]')).toHaveLength(2)
  })

  it('omits the brand line when the server brandName is null', async () => {
    const { wrapper } = await mountCheckout('existing')
    const productRows = wrapper.findAll('[data-checkout-products] article')

    expect(productRows[0]?.get('[data-product-brand]').text()).toBe('La Roche-Posay')
    expect(productRows[1]?.find('[data-product-brand]').exists()).toBe(false)
    expect(productRows[1]?.text()).toContain('Serum thật')
    expect(productRows[1]?.text()).toContain('Số lượng: 1')
  })

  it('blocks checkout when the active branch and cart branch do not match', async () => {
    const { wrapper } = await mountCheckout('existing')
    useBranchPreferenceStore(pinia).$patch({ selectedBranchId: 5 })
    await nextTick()

    expect(wrapper.get('[data-checkout-branch-error]').text()).toContain('không khớp')
    expect(wrapper.get('[data-place-order-desktop]').attributes('disabled')).toBeDefined()
  })

  it('blocks checkout when no active branch is selected', async () => {
    const { wrapper } = await mountCheckout('existing')
    useBranchPreferenceStore(pinia).$patch({ selectedBranchId: null })
    await nextTick()

    expect(wrapper.get('[data-checkout-branch-error]').text()).toContain('Chưa chọn chi nhánh')
    expect(wrapper.get('[data-place-order-desktop]').attributes('disabled')).toBeDefined()
  })

  it('blocks ordering for unavailable products and shows a correction warning', async () => {
    const { wrapper } = await mountCheckout('unavailable')

    expect(wrapper.get('[data-unavailable-warning]').text()).toContain('chưa thể đặt hàng')
    expect(wrapper.get('[data-unavailable-warning] a').attributes('href')).toBe('/cart')
    expect(wrapper.get('[data-place-order-desktop]').attributes('disabled')).toBeDefined()
  })

  it('selects, replaces, and removes centralized sample vouchers without changing totals', async () => {
    const { wrapper } = await mountCheckout('existing')
    const totalBefore = wrapper.get('[data-total]').text()

    expect(wrapper.get('[data-voucher-empty]').text()).toContain('Chưa chọn voucher mẫu')
    expect(wrapper.get('[data-voucher-empty]').classes()).toEqual(
      expect.arrayContaining(['border-blue-200', 'bg-blue-50']),
    )
    await wrapper.get('[data-open-voucher-dialog]').trigger('click')
    await nextTick()
    expect(document.querySelector('[data-voucher-dialog]')).not.toBeNull()

    const orderInputs = [...document.querySelectorAll<HTMLInputElement>('input[name="order-voucher"]')]
    const firstOrder = orderInputs.find((input) => !input.disabled)
    const shippingLabels = [...document.querySelectorAll<HTMLLabelElement>('[data-voucher-dialog] label')]
    const freeShippingLabel = shippingLabels.find((label) => label.textContent?.includes('Miễn phí vận chuyển'))
    const freeShippingInput = freeShippingLabel?.querySelector<HTMLInputElement>('input[name="shipping-voucher"]')
    expect(firstOrder).toBeDefined()
    expect(freeShippingInput).not.toBeNull()
    expect(freeShippingInput?.disabled).toBe(false)
    firstOrder?.click()
    freeShippingInput?.click()
    findDocumentButton('Xác nhận voucher').click()
    await nextTick()

    expect(wrapper.get('[data-selected-order-voucher]').classes()).toEqual(
      expect.arrayContaining(['border-blue-300', 'bg-blue-50']),
    )
    expect(wrapper.get('[data-selected-shipping-voucher]').text()).toContain('Miễn phí vận chuyển')
    expect(wrapper.get('[data-selected-order-voucher]').text()).toContain('Đơn tối thiểu')
    expect(wrapper.get('[data-open-voucher-dialog]').text()).toBe('Đổi voucher')
    const firstOrderCode = wrapper.get('[data-selected-order-voucher]').text()
    expect(wrapper.get('[data-total]').text()).toBe(totalBefore)

    await wrapper.get('[data-open-voucher-dialog]').trigger('click')
    await nextTick()
    const replacement = [...document.querySelectorAll<HTMLInputElement>('input[name="order-voucher"]')]
      .find((input) => !input.disabled && input.value !== firstOrder?.value)
    expect(replacement).toBeDefined()
    replacement?.click()
    findDocumentButton('Xác nhận voucher').click()
    await nextTick()
    expect(wrapper.get('[data-selected-order-voucher]').text()).not.toBe(firstOrderCode)
    expect(wrapper.get('[data-total]').text()).toBe(totalBefore)

    await wrapper.get('[data-remove-vouchers]').trigger('click')
    expect(wrapper.find('[data-selected-voucher-box]').exists()).toBe(false)
    expect(wrapper.get('[data-voucher-empty]').text()).toContain('Chưa chọn voucher mẫu')
    expect(wrapper.get('[data-total]').text()).toBe(totalBefore)
    expect(orderApiMocks.createCustomerOrder).not.toHaveBeenCalled()
    expect(wrapper.find('[data-total-order-voucher]').exists()).toBe(false)
    expect(wrapper.find('[data-total-shipping-discount]').exists()).toBe(false)
  })

  it('shows only backend-supported payment methods and clearly highlights cash', async () => {
    const { wrapper } = await mountCheckout('existing')
    expect(wrapper.get('[data-checkout-payment-card] [data-change-payment]').text()).toBe('Thay đổi')
    await wrapper.get('[data-change-payment]').trigger('click')
    await nextTick()

    expect(document.querySelectorAll('[data-payment-id]')).toHaveLength(2)
    const cashMethod = document.querySelector('[data-payment-id="cod"]')
    expect(cashMethod).not.toBeNull()
    expect(document.querySelector('[data-payment-id="wallet"]')).toBeNull()
    expect(document.querySelector('[data-payment-id="vnpay"]')).not.toBeNull()
    expect(document.querySelector('[data-payment-id="atm"]')).toBeNull()
    expect(document.querySelector('[data-payment-id="card"]')).toBeNull()
    expect(document.querySelector<HTMLInputElement>('[data-payment-id="vnpay"] input')?.disabled).toBe(false)
    expect(document.querySelector('[data-payment-id="vnpay"]')?.textContent)
      .toContain('Thanh toán trực tuyến trước khi nhận hàng.')
    expect(document.querySelector('[data-payment-id="vnpay"]')?.textContent)
      .not.toContain('đang được cập nhật')
    expect(cashMethod?.getAttribute('data-payment-selected')).toBe('true')
    expect(cashMethod?.classList.contains('border-primary-600')).toBe(true)
    expect(cashMethod?.classList.contains('bg-primary-50')).toBe(true)
    expect(cashMethod?.querySelector('[data-payment-selected-indicator]')).not.toBeNull()
    expect(cashMethod?.textContent).toContain('Thanh toán khi đơn hàng được giao.')
    expect(wrapper.get('[data-selected-payment]').text()).toContain('Thanh toán khi nhận hàng')
    expect(wrapper.find('#checkout-note').exists()).toBe(false)
  })

  it('creates a delivery VNPay order and redirects only to the backend payment URL', async () => {
    orderApiMocks.createCustomerOrder.mockResolvedValueOnce({
      ...createdOrder,
      paymentMethod: 'vnpay',
    })
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get('[data-change-payment]').trigger('click')
    await nextTick()
    document.querySelector<HTMLInputElement>('[data-payment-id="vnpay"] input')?.click()
    findDocumentButton('Xác nhận thanh toán').click()
    await nextTick()
    expect(wrapper.get('[data-selected-payment]').text()).toContain('VNPay')

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()

    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[0]).toEqual({
      delivery_method: 'delivery',
      address_id: 17,
      shipping_quote_token: quoteToken17,
      payment_method: 'vnpay',
    })
    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[1]).toBe(firstIdempotencyKey)
    expect(vnpayApiMocks.initiateCustomerVnPayPayment).toHaveBeenCalledWith(901)
    expect(vnpayApiMocks.redirectToVnPay)
      .toHaveBeenCalledWith('https://pay.example.test/vnpay/backend-signed-url')
    expect(window.sessionStorage.getItem('mizuki:vnpay:payment-context'))
      .toContain('PAY-20260826-ABC12345')
    expect(document.querySelector('[data-order-success]')).toBeNull()
  })

  it('creates a pickup VNPay order without delivery fields', async () => {
    orderApiMocks.createCustomerOrder.mockResolvedValueOnce({
      ...createdOrder,
      deliveryMethod: 'pickup',
      paymentMethod: 'vnpay',
      totalAmount: 475_000,
    })
    const { wrapper } = await mountCheckout('existing')
    await wrapper.get('[data-fulfillment="pickup"]').trigger('click')
    await wrapper.get('[data-change-payment]').trigger('click')
    await nextTick()
    document.querySelector<HTMLInputElement>('[data-payment-id="vnpay"] input')?.click()
    findDocumentButton('Xác nhận thanh toán').click()
    await nextTick()

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()

    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[0]).toEqual({
      delivery_method: 'pickup',
      payment_method: 'vnpay',
    })
    expect(Object.keys(orderApiMocks.createCustomerOrder.mock.calls[0]![0]))
      .toEqual(['delivery_method', 'payment_method'])
    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[1]).toBe(firstIdempotencyKey)
    expect(vnpayApiMocks.initiateCustomerVnPayPayment).toHaveBeenCalledWith(901)
    expect(vnpayApiMocks.redirectToVnPay).toHaveBeenCalledTimes(1)
  })

  it('retries VNPay initiation for the existing order without creating another order', async () => {
    orderApiMocks.createCustomerOrder.mockResolvedValueOnce({
      ...createdOrder,
      paymentMethod: 'vnpay',
    })
    vnpayApiMocks.initiateCustomerVnPayPayment
      .mockRejectedValueOnce(new Error('VNPay tạm thời không phản hồi.'))
      .mockResolvedValueOnce({
        paymentUrl: 'https://pay.example.test/vnpay/retry-url',
        expiresAt: '2026-08-26T12:30:00+07:00',
        paymentNumber: 'PAY-20260826-ABC12345',
      })
    const { wrapper } = await mountCheckout('existing')
    await wrapper.get('[data-change-payment]').trigger('click')
    await nextTick()
    document.querySelector<HTMLInputElement>('[data-payment-id="vnpay"] input')?.click()
    findDocumentButton('Xác nhận thanh toán').click()
    await wrapper.get('[data-place-order-desktop]').trigger('click')
    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()

    expect(document.querySelector('[data-vnpay-initiation-error]')?.textContent)
      .toContain('VNPay tạm thời không phản hồi.')
    document.querySelector<HTMLButtonElement>('[data-retry-vnpay-initiation]')?.click()
    await flushPromises()

    expect(orderApiMocks.createCustomerOrder).toHaveBeenCalledTimes(1)
    expect(vnpayApiMocks.initiateCustomerVnPayPayment).toHaveBeenCalledTimes(2)
    expect(vnpayApiMocks.initiateCustomerVnPayPayment).toHaveBeenLastCalledWith(901)
    expect(vnpayApiMocks.redirectToVnPay)
      .toHaveBeenCalledWith('https://pay.example.test/vnpay/retry-url')
  })

  it('opens a confirmation with current delivery data and cancel sends no request', async () => {
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    await nextTick()

    const confirmation = document.querySelector('[data-order-confirmation]')
    expect(confirmation).not.toBeNull()
    expect(confirmation?.textContent).toContain('Giao tận nơi')
    expect(confirmation?.textContent).toContain('Nguyễn Minh Anh')
    expect(confirmation?.textContent).toContain('48 đường 30/4')
    expect(confirmation?.textContent).toContain('Mizuki Vĩnh Long')
    expect(confirmation?.textContent).toContain('3 sản phẩm')
    expect(confirmation?.textContent).toContain('Thanh toán khi nhận hàng')
    expect(document.querySelector('[data-confirmation-total]')?.textContent).toContain('517.000')

    findDocumentButton('Hủy').click()
    await nextTick()
    expect(document.querySelector('[data-order-confirmation]')).toBeNull()
    expect(orderApiMocks.createCustomerOrder).not.toHaveBeenCalled()
  })

  it('submits the exact current delivery payload once and uses the real success response', async () => {
    const emptyCart = {
      ...structuredClone(serverCart),
      items: [],
      totalQuantity: 0,
      totalAmount: 0,
      discountAmount: 0,
      totalAfterDiscount: 0,
    }
    cartApiMocks.getCustomerCart.mockReset()
      .mockResolvedValueOnce(structuredClone(serverCart))
      .mockResolvedValueOnce(emptyCart)
    const { wrapper, queryClient } = await mountCheckout('existing')
    const totalBeforeVoucher = wrapper.get('[data-total]').text()

    await wrapper.get('[data-open-voucher-dialog]').trigger('click')
    await nextTick()
    document.querySelector<HTMLInputElement>('input[name="order-voucher"]:not(:disabled)')?.click()
    const freeShippingLabel = [...document.querySelectorAll<HTMLLabelElement>('[data-voucher-dialog] label')]
      .find((label) => label.textContent?.includes('Miễn phí vận chuyển'))
    freeShippingLabel?.querySelector<HTMLInputElement>('input')?.click()
    findDocumentButton('Xác nhận voucher').click()
    await nextTick()
    expect(wrapper.find('[data-selected-voucher-box]').exists()).toBe(true)
    expect(wrapper.get('[data-total]').text()).toBe(totalBeforeVoucher)

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()

    expect(orderApiMocks.createCustomerOrder).toHaveBeenCalledTimes(1)
    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[0]).toEqual({
      delivery_method: 'delivery',
      address_id: 17,
      shipping_quote_token: quoteToken17,
      payment_method: 'cash',
    })
    expect(Object.keys(orderApiMocks.createCustomerOrder.mock.calls[0]![0])).toEqual([
      'delivery_method',
      'address_id',
      'shipping_quote_token',
      'payment_method',
    ])
    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[1]).toBe(firstIdempotencyKey)
    expect(window.sessionStorage.getItem(orderAttemptStorageKey)).toBeNull()
    expect(document.querySelector('[data-order-success]')).not.toBeNull()
    expect(document.querySelector('[data-success-order-number]')?.textContent)
      .toContain('MZ-20260825-0901')
    expect(document.querySelector('[data-success-order-total]')?.textContent).toContain('519.000')
    expect(document.querySelector('[data-success-order-status]')?.textContent).toContain('Chờ xác nhận')
    expect(document.querySelector('[data-order-confirmation]')).toBeNull()
    expect(cartApiMocks.getCustomerCart).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-checkout-empty]').exists()).toBe(true)
    expect(queryClient.getQueryData(customerShippingQuoteKeys.detail(17))).toBeUndefined()
    expect(document.body.textContent).not.toContain('ORD-DEMO')
  })

  it('prevents duplicate confirmation while Create Order is pending', async () => {
    orderApiMocks.createCustomerOrder.mockReturnValueOnce(new Promise(() => undefined))
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    const confirmButton = document.querySelector<HTMLButtonElement>('[data-confirm-order]')!
    confirmButton.click()
    confirmButton.click()
    await nextTick()

    expect(orderApiMocks.createCustomerOrder).toHaveBeenCalledTimes(1)
    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[1]).toBe(firstIdempotencyKey)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(confirmButton.disabled).toBe(true)
    expect(confirmButton.textContent).toContain('Đang đặt hàng')
    expect(document.querySelector<HTMLButtonElement>('[data-cancel-order-confirmation]')?.disabled)
      .toBe(true)
  })

  it('keeps and reuses the idempotency key when the same payload is retried after a network failure', async () => {
    orderApiMocks.createCustomerOrder.mockRejectedValueOnce(new Error('Mất kết nối mạng.'))
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()

    expect(orderApiMocks.createCustomerOrder).toHaveBeenCalledTimes(1)
    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[1]).toBe(firstIdempotencyKey)
    expect(window.sessionStorage.getItem(orderAttemptStorageKey)).toContain(firstIdempotencyKey)

    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()

    expect(orderApiMocks.createCustomerOrder).toHaveBeenCalledTimes(2)
    expect(orderApiMocks.createCustomerOrder.mock.calls[1]?.[1]).toBe(firstIdempotencyKey)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem(orderAttemptStorageKey)).toBeNull()
    expect(document.querySelector('[data-order-success]')).not.toBeNull()
  })

  it('discards the old attempt and generates a new key when the order payload changes', async () => {
    orderApiMocks.createCustomerOrder.mockRejectedValueOnce(new Error('Mất kết nối mạng.'))
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()
    findDocumentButton('Hủy').click()
    await nextTick()

    await wrapper.get('[data-delivery-section] button').trigger('click')
    await nextTick()
    document.querySelector<HTMLInputElement>('input[value="18"]')?.click()
    findDocumentButton('Dùng địa chỉ này').click()
    await flushPromises()

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()

    expect(orderApiMocks.createCustomerOrder).toHaveBeenCalledTimes(2)
    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[1]).toBe(firstIdempotencyKey)
    expect(orderApiMocks.createCustomerOrder.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      address_id: 18,
      shipping_quote_token: quoteToken18,
    }))
    expect(orderApiMocks.createCustomerOrder.mock.calls[1]?.[1]).toBe(secondIdempotencyKey)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2)
  })

  it('keeps Checkout state and shows normalized validation errors when Create Order fails', async () => {
    orderApiMocks.createCustomerOrder.mockRejectedValueOnce({
      name: 'ApplicationError',
      kind: 'validation',
      message: 'Dữ liệu đặt hàng chưa hợp lệ.',
      validationErrors: {
        shipping_quote_token: ['Báo giá vận chuyển đã hết hạn.'],
        stock: ['Sản phẩm không còn đủ số lượng.'],
      },
      cause: null,
    })
    const { wrapper } = await mountCheckout('existing')

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()

    expect(document.querySelector('[data-order-success]')).toBeNull()
    expect(document.querySelector('[data-order-confirmation]')).not.toBeNull()
    expect(document.querySelector('[data-create-order-error]')?.textContent)
      .toContain('Dữ liệu đặt hàng chưa hợp lệ.')
    expect(document.querySelector('[data-create-order-error]')?.textContent)
      .toContain('Báo giá vận chuyển đã hết hạn.')
    expect(document.querySelector('[data-create-order-error]')?.textContent)
      .toContain('Sản phẩm không còn đủ số lượng.')
    expect(wrapper.findAll('[data-checkout-products] article')).toHaveLength(2)
    expect(cartApiMocks.getCustomerCart).toHaveBeenCalledTimes(1)
    expect(document.querySelector<HTMLButtonElement>('[data-confirm-order]')?.disabled).toBe(false)
  })

  it('refreshes an expired token before requiring a new confirmation', async () => {
    const { wrapper, queryClient } = await mountCheckout('existing')
    await wrapper.get('[data-place-order-desktop]').trigger('click')
    queryClient.setQueryData(customerShippingQuoteKeys.detail(17), {
      ...shippingQuote,
      expiresAt: '2020-01-01T00:00:00Z',
    })
    await nextTick()
    shippingApiMocks.getCustomerShippingQuote.mockResolvedValueOnce({
      ...shippingQuote,
      shippingFee: 50_000,
      quoteToken: quoteToken18,
    })

    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()

    expect(orderApiMocks.createCustomerOrder).not.toHaveBeenCalled()
    expect(shippingApiMocks.getCustomerShippingQuote).toHaveBeenCalledTimes(2)
    expect(document.querySelector('[data-order-confirmation]')).toBeNull()
    expect(wrapper.get('[data-order-notice]').text()).toContain('Tổng dự kiến đã thay đổi')
    expect(wrapper.get('[data-total]').text()).toContain('525.000')

    await wrapper.get('[data-place-order-desktop]').trigger('click')
    expect(document.querySelector('[data-order-confirmation]')).not.toBeNull()
    expect(document.querySelector('[data-confirmation-total]')?.textContent).toContain('525.000')
    findDocumentButton('Xác nhận đặt hàng').click()
    await flushPromises()
    expect(orderApiMocks.createCustomerOrder.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      address_id: 17,
      shipping_quote_token: quoteToken18,
    }))
  })

  it('calculates non-negative typed totals and saved amount', async () => {
    const { wrapper } = await mountCheckout('existing')
    const summaryLabels = wrapper.findAll('[data-checkout-summary] dt').map((row) => row.text())

    expect(summaryLabels).toEqual(['Số lượng', 'Tạm tính', 'Phí vận chuyển', 'Tiết kiệm', 'Tổng dự kiến'])
    expect(wrapper.get('[data-total-count]').text()).toBe('3')
    expect(wrapper.get('[data-total-subtotal]').text()).toContain('500.000')
    expect(wrapper.get('[data-total-shipping]').text()).toContain('42.000')
    expect(wrapper.get('[data-total]').text()).toContain('517.000')
    expect(wrapper.get('[data-saved-amount]').text()).toBe('25.000 đ')
    expect(wrapper.text()).not.toContain('máy chủ')
    expect(wrapper.text()).not.toContain('-0 đ')
  })

  it('uses exact customer savings wording when the actual discount is zero', async () => {
    const { wrapper } = await mountCheckout('unavailable')

    expect(wrapper.get('[data-saved-amount]').text()).toBe('0 đ')
    expect(wrapper.text()).not.toContain('-0 đ')
    expect(wrapper.text()).not.toContain('máy chủ')
  })

  it.each([
    ['loading', '[data-checkout-loading]'],
    ['empty', '[data-checkout-empty]'],
    ['error', '[data-checkout-error]'],
  ] as const)('renders the server cart %s state', async (scenario, selector) => {
    const { wrapper } = await mountCheckout(scenario)

    expect(wrapper.find(selector).exists()).toBe(true)
    if (scenario === 'empty') expect(wrapper.find('[data-checkout-summary]').exists()).toBe(false)
  })

  it.each([
    [1440, 900],
    [1024, 1366],
    [768, 1024],
    [390, 844],
  ])('keeps checkout layout contracts at %i×%i', async (width, height) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
    window.dispatchEvent(new Event('resize'))
    const { wrapper } = await mountCheckout('existing')
    const layout = wrapper.get('[data-checkout-layout]')
    const sidebarStack = wrapper.get('[data-checkout-sidebar-stack]')
    const mobileBar = wrapper.get('[data-mobile-order-bar]')
    const sidebarChildren = [...sidebarStack.element.children]

    expect(layout.classes()).toContain('lg:grid-cols-[minmax(0,1fr)_21rem]')
    expect(sidebarStack.classes()).toEqual(expect.arrayContaining(['grid', 'gap-3', 'lg:sticky', 'lg:top-28']))
    expect(sidebarChildren[0]?.hasAttribute('data-checkout-voucher-card')).toBe(true)
    expect(sidebarChildren[1]?.hasAttribute('data-checkout-payment-card')).toBe(true)
    expect(sidebarChildren[2]?.hasAttribute('data-checkout-summary')).toBe(true)
    expect(mobileBar.classes()).toEqual(expect.arrayContaining(['fixed', 'bottom-[5.75rem]', 'md:hidden']))
    expect(mobileBar.attributes('aria-label')).toBe('Thanh đặt hàng mobile')
    expect(wrapper.find('[data-customer-voucher-float]').exists()).toBe(false)
    expect(wrapper.find('[data-customer-back-to-top]').exists()).toBe(false)
  })

  it('uses no external images, direct browser request, or any type in checkout implementation', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const { wrapper } = await mountCheckout('existing')

    const checkoutSource = readFileSync('src/pages/customer/CheckoutPage.vue', 'utf8')
    const source = [
      checkoutSource,
      readFileSync('src/components/checkout/CheckoutAddressDialog.vue', 'utf8'),
      readFileSync('src/components/checkout/CheckoutVoucherDialog.vue', 'utf8'),
      readFileSync('src/components/checkout/CheckoutPaymentDialog.vue', 'utf8'),
      readFileSync('src/data/customer/checkoutDemoData.ts', 'utf8'),
    ].join('\n')
    const addressDialogSource = readFileSync(
      'src/components/checkout/CheckoutAddressDialog.vue',
      'utf8',
    )

    expect(wrapper.findAll('img[src^="http"]')).toHaveLength(1)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(openSpy).not.toHaveBeenCalled()
    expect(source).not.toMatch(/\bany\b/)
    expect(checkoutSource).not.toMatch(/createCheckoutScenario|CheckoutOrderResult|data-order-result/)
    expect(checkoutSource).not.toMatch(/variant\.sku/)
    expect(checkoutSource).not.toMatch(/data-delivery-only/)
    expect(checkoutSource).not.toMatch(/(?:animate|pulse|bounce|blink)[^>]*data-delivery-truck-icon|data-delivery-truck-icon[^>]*(?:animate|pulse|bounce|blink)/)
    expect(checkoutSource).not.toMatch(/item\.variant\.name/)
    expect(addressDialogSource).not.toMatch(/apiClient|axios|ENDPOINTS|\/api\/v1\/locations/)
  })
})
