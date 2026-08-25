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
import { pinia } from '@/stores/pinia'

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

vi.mock('@/api/locations/locationApi', () => locationApiMocks)
vi.mock('@/api/cartApi', () => cartApiMocks)
vi.mock('@/api/addressApi', () => addressApiMocks)

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
  findDocumentButton('Lưu địa chỉ').click()
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
  cartApiMocks.getCustomerCart.mockReset().mockResolvedValue({
    id: 1,
    branch: { id: 6, name: 'Mizuki Vĩnh Long', address: 'Vĩnh Long' },
    totalQuantity: 1,
    totalAmount: 100000,
    discountAmount: 0,
    totalAfterDiscount: 100000,
    items: [{
      id: 1,
      product: { id: 1, name: 'Sản phẩm kiểm thử', slug: 'san-pham-kiem-thu' },
      variant: { id: 1, name: 'Mặc định', sku: 'SKU-1', effectivePrice: 100000 },
      quantity: 1,
      subtotal: 100000,
      availableQuantity: 5,
      stockWarning: false,
    }],
  })
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
})

describe('customer checkout foundation', () => {
  it('renders the real /checkout route with a compact semantic heading', async () => {
    const { wrapper, router } = await mountCheckout('first-time', true)

    expect(router.currentRoute.value.path).toBe('/checkout')
    expect(wrapper.get('[data-checkout-page] h1').text()).toBe('Thanh toán')
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
