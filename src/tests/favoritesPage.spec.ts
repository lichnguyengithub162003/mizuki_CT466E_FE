import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { useCustomerFavoritesQuery } from '@/queries/favorites'
import { useAuthStore } from '@/stores/auth'
import {
  BRANCH_PREFERENCE_KEY,
  useBranchPreferenceStore,
} from '@/stores/branchPreference'
import { pinia } from '@/stores/pinia'
import type { CustomerFavorite } from '@/types/favorites'

const api = vi.hoisted(() => ({
  getCustomerFavorites: vi.fn(),
  addCustomerFavorite: vi.fn(),
  removeCustomerFavorite: vi.fn(),
}))
vi.mock('@/api/favoritesApi', () => api)

const serum: CustomerFavorite = {
  productId: 101,
  name: 'Serum phục hồi Mizuki',
  slug: 'serum-phuc-hoi-mizuki',
  imageUrl: 'http://localhost:8000/storage/products/serum.jpg',
  minimumPrice: 150000,
  brand: { id: 8, name: 'Cocoon', slug: 'cocoon' },
  originalPrice: 190000,
  stockState: 'available',
}
const cleanser: CustomerFavorite = {
  productId: 102,
  name: 'Gel làm sạch dịu nhẹ',
  slug: 'gel-lam-sach-diu-nhe',
  minimumPrice: 95000,
  brand: null,
  originalPrice: null,
  stockState: 'available',
}
const manyFavorites: CustomerFavorite[] = [serum, cleanser, ...Array.from(
  { length: 12 },
  (_, index): CustomerFavorite => ({
    productId: 200 + index,
    name: `Sản phẩm Mizuki ${index + 1}`,
    slug: `san-pham-mizuki-${index + 1}`,
    minimumPrice: 110000 + index * 10000,
    brand: { id: 9, name: 'Mizuki', slug: 'mizuki' },
    originalPrice: null,
    stockState: 'available',
  }),
)]

const lowStockFavorite: CustomerFavorite = {
  ...manyFavorites[2]!,
  productId: 301,
  name: 'Serum Mizuki sắp hết',
  slug: 'serum-mizuki-sap-het',
  minimumPrice: 125000,
  originalPrice: 125000,
  stockState: 'low-stock',
}
const soldOutFavorite: CustomerFavorite = {
  ...manyFavorites[3]!,
  productId: 302,
  name: 'Kem Mizuki hết hàng',
  slug: 'kem-mizuki-het-hang',
  minimumPrice: 210000,
  originalPrice: 250000,
  stockState: 'sold-out',
}
const discontinuedFavorite: CustomerFavorite = {
  ...manyFavorites[4]!,
  productId: 303,
  name: 'Gel Mizuki ngưng bán',
  slug: 'gel-mizuki-ngung-ban',
  minimumPrice: 85000,
  brand: null,
  originalPrice: 70000,
  stockState: 'discontinued',
}

interface MountedFavorites {
  readonly wrapper: VueWrapper
  readonly router: Router
}

const mountedWrappers: VueWrapper[] = []
let userSequence = 800

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
}

function authenticateCustomer(id = ++userSequence): void {
  useAuthStore(pinia).$patch({
    user: {
      id,
      name: `Customer ${id}`,
      email: `customer-${id}@example.com`,
      phone: null,
      avatar: null,
      role: 'customer',
      role_label: 'Khách hàng',
      branch_id: null,
      email_verified_at: null,
      created_at: '2026-08-15T00:00:00Z',
    },
    isInitialized: true,
  })
}

function setViewport(width: number, height = 900): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
  window.dispatchEvent(new Event('resize'))
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
  setViewport(1440)
  window.localStorage.clear()
  window.localStorage.setItem(BRANCH_PREFERENCE_KEY, '6')
  useAuthStore(pinia).resetForTesting()
  useBranchPreferenceStore(pinia).$patch({
    branches: [{
      id: 6,
      code: 'MZ-VL',
      name: 'Mizuki Vĩnh Long',
      address: 'Vĩnh Long',
      phone: null,
      email: null,
      is_active: true,
      opening_hours: [],
    }],
    selectedBranchId: 6,
    status: 'success',
    error: null,
  })
  authenticateCustomer()
  api.getCustomerFavorites.mockReset()
  api.addCustomerFavorite.mockReset()
  api.removeCustomerFavorite.mockReset()
  api.getCustomerFavorites.mockResolvedValue([serum, cleanser])
  api.addCustomerFavorite.mockImplementation((productId: number) => Promise.resolve({ ...serum, productId }))
  api.removeCustomerFavorite.mockResolvedValue(undefined)
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('customer favorites page', () => {
  it('loads the authenticated customer real favorites and preserves the page structure', async () => {
    const { wrapper, router } = await mountFavorites()

    expect(router.currentRoute.value.path).toBe('/favorites')
    expect(api.getCustomerFavorites).toHaveBeenCalledWith(6)
    expect(wrapper.get('[data-favorites-page] h1').text()).toBe('Sản phẩm yêu thích')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(2)
    expect(wrapper.text()).toContain(serum.name)
    expect(wrapper.text()).toContain('150.000')
    expect(wrapper.get('[data-favorites-grid]').classes()).toEqual(expect.arrayContaining([
      'grid-cols-2',
      'sm:grid-cols-3',
      'lg:grid-cols-4',
      'min-[85rem]:grid-cols-5',
    ]))
    expect(wrapper.get('[data-favorite-toolbar-content]').classes()).toEqual(expect.arrayContaining([
      'flex-col',
      'min-[85rem]:flex-row',
    ]))
    expect(wrapper.get('[data-favorite-item] a').attributes('href')).toBe(`/products/${serum.slug}`)
    expect(wrapper.get(`a[aria-label="Chi tiết ${serum.name}"]`).attributes('href')).toBe(`/products/${serum.slug}`)
    expect(wrapper.get(`a[aria-label="Chi tiết ${serum.name}"]`).find('svg').exists()).toBe(false)
    expect(wrapper.get('[data-favorite-item]').findAll('a')).toHaveLength(1)
    expect(wrapper.get('[data-favorite-detail-link]').text()).toBe('Chi tiết')
    expect(wrapper.get('[data-favorite-item] button svg').classes()).toContain('fill-current')
    expect(wrapper.get('[data-favorites-mobile-header]').text()).toContain('Sản phẩm yêu thích')
    expect(wrapper.get('[data-favorite-search]').attributes('placeholder')).toBe('Tìm trong sản phẩm yêu thích')
    expect(wrapper.get<HTMLSelectElement>('[data-favorite-stock-filter]').element.value).toBe('all')
    expect(wrapper.get('[data-favorite-stock-filter]').classes()).toEqual(expect.arrayContaining([
      'focus-visible:ring-2',
      'focus-visible:ring-inset',
    ]))
    expect(wrapper.get('[data-favorite-sort]').classes()).toEqual(expect.arrayContaining([
      'focus-visible:ring-2',
      'focus-visible:ring-inset',
    ]))
    expect(wrapper.text()).not.toContain('Xóa tất cả')
    expect(wrapper.text()).not.toContain('giỏ hàng demo')
  }, 10_000)

  it('renders real brand, valid original price, and all stock labels', async () => {
    api.getCustomerFavorites.mockResolvedValueOnce([
      serum,
      lowStockFavorite,
      soldOutFavorite,
      discontinuedFavorite,
    ])
    const { wrapper } = await mountFavorites()

    expect(wrapper.get('[data-favorite-brand]').text()).toBe('Cocoon')
    expect(wrapper.get('[data-favorite-original-price]').text()).toContain('190.000')
    expect(wrapper.findAll('[data-favorite-stock-label]').map((badge) => badge.text())).toEqual([
      'Còn hàng',
      'Sắp hết',
      'Hết hàng',
      'Ngưng bán',
    ])
    expect(wrapper.findAll('[data-favorite-stock-overlay]').map((overlay) => overlay.text())).toEqual([
      'Hết hàng',
      'Ngưng bán',
    ])
  })

  it('limits unavailable overlays to the image area and keeps low stock unobscured', async () => {
    api.getCustomerFavorites.mockResolvedValueOnce([
      soldOutFavorite,
      discontinuedFavorite,
      lowStockFavorite,
      serum,
    ])
    const { wrapper } = await mountFavorites()
    const cards = wrapper.findAll('[data-favorite-item]')

    for (const [index, expectedLabel] of [[0, 'Hết hàng'], [1, 'Ngưng bán']] as const) {
      const imageArea = cards[index]!.get('[data-favorite-image-area]')
      const overlay = cards[index]!.get('[data-favorite-stock-overlay]')
      expect(overlay.text()).toBe(expectedLabel)
      expect(overlay.element.parentElement).toBe(imageArea.element)
      expect(overlay.classes()).toEqual(expect.arrayContaining(['absolute', 'inset-0', 'z-10']))
      expect(cards[index]!.get('[data-favorite-image-visual]').classes()).toEqual(expect.arrayContaining([
        'opacity-75',
        'saturate-[0.65]',
      ]))
      expect(cards[index]!.get('[data-favorite-stock-label]').classes()).toContain('sr-only')
      expect(cards[index]!.get('button[aria-pressed="true"]').classes()).toContain('z-20')
      expect(cards[index]!.get('button[aria-pressed="true"]').attributes('disabled')).toBeUndefined()
    }

    expect(cards[2]!.find('[data-favorite-stock-overlay]').exists()).toBe(false)
    expect(cards[2]!.get('[data-favorite-image-visual]').classes()).not.toContain('opacity-75')
    expect(cards[2]!.get('[data-favorite-stock-label]').text()).toBe('Sắp hết')
    expect(cards[2]!.get('[data-favorite-stock-label]').classes()).not.toContain('sr-only')
    expect(cards[3]!.find('[data-favorite-stock-overlay]').exists()).toBe(false)

    await cards[0]!.get('button[aria-pressed="true"]').trigger('click')
    await flushPromises()
    expect(api.removeCustomerFavorite).toHaveBeenCalledWith(soldOutFavorite.productId)
  })

  it('hides brand and original price when absent or not greater than the current price', async () => {
    api.getCustomerFavorites.mockResolvedValueOnce([
      cleanser,
      lowStockFavorite,
      discontinuedFavorite,
    ])
    const { wrapper } = await mountFavorites()
    const cards = wrapper.findAll('[data-favorite-item]')

    expect(cards[0]!.find('[data-favorite-brand]').exists()).toBe(false)
    expect(cards[0]!.find('[data-favorite-original-price]').exists()).toBe(false)
    expect(cards[1]!.find('[data-favorite-original-price]').exists()).toBe(false)
    expect(cards[2]!.find('[data-favorite-original-price]').exists()).toBe(false)
  })

  it('keeps exactly one detail CTA for sold-out and discontinued products', async () => {
    api.getCustomerFavorites.mockResolvedValueOnce([soldOutFavorite, discontinuedFavorite])
    const { wrapper } = await mountFavorites()
    const cards = wrapper.findAll('[data-favorite-item]')

    for (const card of cards) {
      expect(card.findAll('a')).toHaveLength(1)
      expect(card.get('[data-favorite-detail-link]').text()).toBe('Chi tiết')
      expect(card.get('[data-favorite-detail-link]').attributes('aria-disabled')).toBeUndefined()
    }
    expect(cards[0]!.get('a').attributes('href')).toBe(`/products/${soldOutFavorite.slug}`)
    expect(cards[1]!.get('a').attributes('href')).toBe(`/products/${discontinuedFavorite.slug}`)
  })

  it('filters by real stock state and composes with name search', async () => {
    api.getCustomerFavorites.mockResolvedValueOnce([
      serum,
      lowStockFavorite,
      soldOutFavorite,
      discontinuedFavorite,
    ])
    const { wrapper } = await mountFavorites()

    await wrapper.get<HTMLSelectElement>('[data-favorite-stock-filter]').setValue('sold-out')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(1)
    expect(wrapper.get('[data-favorite-item]').text()).toContain(soldOutFavorite.name)

    await wrapper.get<HTMLInputElement>('[data-favorite-search]').setValue('serum')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(0)

    await wrapper.get<HTMLSelectElement>('[data-favorite-stock-filter]').setValue('low-stock')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(1)
    expect(wrapper.get('[data-favorite-item]').text()).toContain(lowStockFavorite.name)
  })

  it('composes stock filtering with price sorting', async () => {
    const cheaperSoldOut = {
      ...soldOutFavorite,
      productId: 304,
      name: 'Kem Mizuki hết hàng giá thấp',
      slug: 'kem-mizuki-het-hang-gia-thap',
      minimumPrice: 99000,
    }
    api.getCustomerFavorites.mockResolvedValueOnce([soldOutFavorite, cheaperSoldOut, serum])
    const { wrapper } = await mountFavorites()

    await wrapper.get<HTMLSelectElement>('[data-favorite-stock-filter]').setValue('sold-out')
    await wrapper.get<HTMLSelectElement>('[data-favorite-sort]').setValue('price-ascending')

    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(2)
    expect(wrapper.findAll('[data-favorite-item]')[0]!.text()).toContain(cheaperSoldOut.name)
  })

  it('resets the visible batch when stock status changes', async () => {
    api.getCustomerFavorites.mockResolvedValueOnce(manyFavorites)
    const { wrapper } = await mountFavorites()
    await wrapper.get('[data-favorites-show-more]').trigger('click')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(manyFavorites.length)

    await wrapper.get<HTMLSelectElement>('[data-favorite-stock-filter]').setValue('available')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(10)
  })

  it('shows ten desktop products initially and reveals the next batch', async () => {
    api.getCustomerFavorites.mockResolvedValueOnce(manyFavorites)
    const { wrapper } = await mountFavorites()

    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(10)
    expect(wrapper.get('[data-favorites-show-more]').text()).toBe('Xem thêm')

    await wrapper.get('[data-favorites-show-more]').trigger('click')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(manyFavorites.length)
    expect(wrapper.get('[data-favorites-collapse]').text()).toBe('Thu gọn')
  })

  it.each([
    [390, 844, 6],
    [768, 1024, 6],
    [1024, 1366, 8],
    [1440, 900, 10],
  ])('uses a responsive initial window at %i×%ipx', async (width, height, expectedCount) => {
    setViewport(width, height)
    api.getCustomerFavorites.mockResolvedValueOnce(manyFavorites)
    const { wrapper } = await mountFavorites()

    expect(window.innerHeight).toBe(height)
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(expectedCount)
  })

  it('resets the visible window after search and sort changes', async () => {
    api.getCustomerFavorites.mockResolvedValueOnce(manyFavorites)
    const { wrapper } = await mountFavorites()
    await wrapper.get('[data-favorites-show-more]').trigger('click')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(manyFavorites.length)

    await wrapper.get<HTMLInputElement>('[data-favorite-search]').setValue('Mizuki')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(10)

    await wrapper.get<HTMLInputElement>('[data-favorite-search]').setValue('')
    await wrapper.get('[data-favorites-show-more]').trigger('click')
    await wrapper.get<HTMLSelectElement>('[data-favorite-sort]').setValue('price-descending')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(10)
  })

  it('supports edit mode, multi-select, and safe removal through the existing endpoint', async () => {
    api.getCustomerFavorites.mockResolvedValueOnce([serum, cleanser, manyFavorites[2]!])
    const { wrapper } = await mountFavorites()

    await wrapper.get('[data-favorite-edit-toggle]').trigger('click')
    const checkboxes = wrapper.findAll<HTMLInputElement>('[data-favorite-item] input[type="checkbox"]')
    expect(checkboxes).toHaveLength(3)
    await checkboxes[0]!.setValue(true)
    await checkboxes[1]!.setValue(true)

    expect(wrapper.get('[data-favorite-remove-selected]').attributes('disabled')).toBeUndefined()
    await wrapper.get('[data-favorite-remove-selected]').trigger('click')
    await flushPromises()

    expect(api.removeCustomerFavorite).toHaveBeenCalledWith(serum.productId)
    expect(api.removeCustomerFavorite).toHaveBeenCalledWith(cleanser.productId)
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toContain('Đã bỏ 2 sản phẩm')
  })

  it('renders the real empty state', async () => {
    api.getCustomerFavorites.mockResolvedValueOnce([])
    const { wrapper } = await mountFavorites()

    expect(wrapper.find('[data-favorites-empty]').exists()).toBe(true)
    expect(wrapper.get('[data-favorites-empty]').text()).toContain('Chưa có sản phẩm yêu thích')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(0)
  })

  it('filters by real product name and sorts by the real minimum price', async () => {
    const { wrapper } = await mountFavorites()
    await wrapper.get<HTMLInputElement>('[data-favorite-search]').setValue('gel')
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(1)
    expect(wrapper.get('[data-favorite-item]').text()).toContain(cleanser.name)

    await wrapper.get<HTMLInputElement>('[data-favorite-search]').setValue('')
    await wrapper.get<HTMLSelectElement>('[data-favorite-sort]').setValue('price-ascending')
    expect(wrapper.findAll('[data-favorite-item]')[0]?.text()).toContain(cleanser.name)
  })

  it('removes a favorite through the backend and updates every active observer', async () => {
    const { wrapper } = await mountFavorites()
    const FavoriteStateProbe = defineComponent({
      setup() {
        const query = useCustomerFavoritesQuery(computed(() => useAuthStore(pinia).user?.id ?? null))
        return () => h('output', { 'data-favorite-probe': '' }, String(query.data.value?.length ?? 0))
      },
    })
    const probe = mount(FavoriteStateProbe)
    mountedWrappers.push(probe)
    await flushPromises()

    await wrapper.get(`button[aria-label="Bỏ ${serum.name} khỏi yêu thích"]`).trigger('click')
    await flushPromises()

    expect(api.removeCustomerFavorite.mock.calls[0]?.[0]).toBe(serum.productId)
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toContain('Đã bỏ')
    expect(probe.get('[data-favorite-probe]').text()).toBe('1')
  })

  it('keeps the server-confirmed collection when removal fails', async () => {
    api.removeCustomerFavorite.mockRejectedValueOnce(new Error('Không thể cập nhật yêu thích'))
    const { wrapper } = await mountFavorites()

    await wrapper.get(`button[aria-label="Bỏ ${serum.name} khỏi yêu thích"]`).trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(2)
    expect(wrapper.get('[role="alert"]').text()).toContain('Không thể cập nhật yêu thích')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('reloads favorites from the server instead of local demo state', async () => {
    const firstMount = await mountFavorites()
    expect(firstMount.wrapper.findAll('[data-favorite-item]')).toHaveLength(2)
    firstMount.wrapper.unmount()

    const secondMount = await mountFavorites()
    expect(secondMount.wrapper.findAll('[data-favorite-item]')).toHaveLength(2)
    expect(api.getCustomerFavorites.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('isolates cached favorites when the authenticated account changes', async () => {
    api.getCustomerFavorites
      .mockResolvedValueOnce([serum])
      .mockResolvedValueOnce([cleanser])
    const { wrapper } = await mountFavorites()
    expect(wrapper.text()).toContain(serum.name)

    authenticateCustomer(++userSequence)
    await flushPromises()

    expect(wrapper.text()).toContain(cleanser.name)
    expect(wrapper.text()).not.toContain(serum.name)
    expect(api.getCustomerFavorites).toHaveBeenCalledTimes(2)
  })

  it('refetches and isolates cached stock states when the selected branch changes', async () => {
    api.getCustomerFavorites
      .mockResolvedValueOnce([serum])
      .mockResolvedValueOnce([{ ...serum, stockState: 'sold-out' }])
    const { wrapper } = await mountFavorites()
    expect(wrapper.get('[data-favorite-stock-label]').text()).toBe('Còn hàng')

    useBranchPreferenceStore(pinia).$patch({ selectedBranchId: 9 })
    await flushPromises()

    expect(api.getCustomerFavorites).toHaveBeenNthCalledWith(1, 6)
    expect(api.getCustomerFavorites).toHaveBeenNthCalledWith(2, 9)
    expect(wrapper.get('[data-favorite-stock-label]').text()).toBe('Hết hàng')
  })

  it('shows a load error without substituting demo favorites', async () => {
    api.getCustomerFavorites.mockRejectedValueOnce(new Error('Backend unavailable'))
    const { wrapper } = await mountFavorites()

    expect(wrapper.find('[data-favorites-error]').exists()).toBe(true)
    expect(wrapper.findAll('[data-favorite-item]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain(serum.name)
  })
})
