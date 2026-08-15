import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import ProductBrandSlider from '@/components/products/ProductBrandSlider.vue'
import ProductCategoryProductSlider from '@/components/products/ProductCategoryProductSlider.vue'
import ProductFilterPanel from '@/components/products/ProductFilterPanel.vue'
import ProductListingGrid from '@/components/products/ProductListingGrid.vue'
import ProductListingHero from '@/components/products/ProductListingHero.vue'
import ProductSuggestions from '@/components/products/ProductSuggestions.vue'
import { adaptProductListing } from '@/api/productListingAdapter'
import { createAppRouter } from '@/router'
import type { ProductCategoryBrand, ProductCategorySummary } from '@/types/products'
import type {
  ProductBrandDto,
  ProductCategoryDto,
  ProductListingRequest,
  ProductListingResponseDto,
} from '@/api/productListingApi'
import { pinia } from '@/stores/pinia'
import {
  BRANCH_PREFERENCE_KEY,
  useBranchPreferenceStore,
} from '@/stores/branchPreference'
import { useAuthStore } from '@/stores/auth'

const { getProductBrandsMock, getProductCategoriesMock, getProductListingMock } = vi.hoisted(() => ({
  getProductBrandsMock: vi.fn(),
  getProductCategoriesMock: vi.fn(),
  getProductListingMock: vi.fn(),
}))
const cartApiMocks = vi.hoisted(() => ({
  getCustomerCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  selectCartBranch: vi.fn(),
}))
const favoriteApiMocks = vi.hoisted(() => ({
  getCustomerFavorites: vi.fn(),
  addCustomerFavorite: vi.fn(),
  removeCustomerFavorite: vi.fn(),
}))

vi.mock('@/api/productListingApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/productListingApi')>()
  return {
    ...actual,
    getProductBrands: getProductBrandsMock,
    getProductCategories: getProductCategoriesMock,
    getProductListing: getProductListingMock,
  }
})
vi.mock('@/api/cartApi', () => cartApiMocks)
vi.mock('@/api/favoritesApi', () => favoriteApiMocks)

const categoryFixtures: ProductCategoryDto[] = [
  { id: 6, parent_id: null, name: 'Chăm Sóc Da Mặt', slug: 'cham-soc-da-mat', children: [
    { id: 10, parent_id: 6, name: 'Sữa Rửa Mặt', slug: 'sua-rua-mat', children: [] },
  ] },
  { id: 12, parent_id: null, name: 'Chăm Sóc Cơ Thể', slug: 'cham-soc-co-the', children: [] },
  { id: 38, parent_id: null, name: 'Trang Điểm', slug: 'trang-diem', children: [] },
  { id: 66, parent_id: null, name: 'Chăm Sóc Tóc Và Da Đầu', slug: 'cham-soc-toc', children: [] },
  { id: 98, parent_id: null, name: 'Chăm Sóc Cá Nhân', slug: 'cham-soc-ca-nhan', children: [] },
  { id: 132, parent_id: null, name: 'Thực Phẩm Chức Năng', slug: 'thuc-pham-chuc-nang', children: [] },
  { id: 86, parent_id: null, name: 'Đồ Dùng Phòng Tắm', slug: 'do-dung-phong-tam', children: [] },
  { id: 80, parent_id: null, name: 'Mini / Sample', slug: 'mini-sample', children: [] },
]

const brandFixtures: ProductBrandDto[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: index === 0 ? 'Anessa' : index === 1 ? 'Cocoon' : `Thương hiệu thật ${index + 1}`,
  slug: `thuong-hieu-that-${index + 1}`,
  logo: index === 0
    ? '/storage/brands/anessa.png'
    : index === 1
      ? '/storage/brands/cocoon.png'
      : null,
  banner_image: null,
  description: null,
}))

const listingResponse: ProductListingResponseDto = {
  success: true,
  message: 'OK',
  data: Array.from({ length: 24 }, (_, index) => ({
    id: index + 1,
    name: index === 0 ? 'Sữa Rửa Mặt Cocoon Bí Đao' : `Sản phẩm thật ${index + 1}`,
    slug: index === 0 ? 'sua-rua-mat-cocoon-bi-dao' : `san-pham-that-${index + 1}`,
    category: { id: 6, name: 'Chăm Sóc Da Mặt', parent_id: null },
    brand: { id: 45, name: index === 0 ? 'Cocoon' : 'Mizuki' },
    primary_image: index === 0 ? '/storage/catalog/products/cocoon.jpg' : null,
    primary_image_url: index === 1 ? 'https://cdn.example.test/product.jpg' : null,
    price: 200_000 + index,
    original_price: index === 0 ? 250_000 : 200_000 + index,
    minimum_price: 190_000 + index,
    has_discount: index === 0,
    discount: index === 0 ? { amount: 60_000, percentage: 24 } : null,
    rating: 4.8,
    review_count: 12,
    default_variant: {
      id: index + 100,
      name: 'Mặc định',
      sku: `SKU-${index + 1}`,
      attributes: {},
      price: 200_000 + index,
      sale_price: index === 0 ? 190_000 : null,
      effective_price: 180_000 + index,
    },
    availability: {
      available: index !== 23,
      available_quantity: index === 23 ? 0 : 10,
      stock_state: index === 23 ? 'sold-out' : 'available',
    },
  })),
  meta: {
    pagination: { current_page: 1, per_page: 24, total: 2406, last_page: 101 },
  },
}

const productListingProducts = adaptProductListing(listingResponse).products
const suggestedProducts = productListingProducts.slice(0, 8)
const productCategorySummary: ProductCategorySummary = {
  name: 'sản phẩm',
  description: 'Dữ liệu kiểm thử',
  resultCount: 4,
  quickFilterIds: [],
  previewProducts: productListingProducts.slice(0, 4).map((product, index) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    tone: index === 0 ? 'sky' : 'mint',
    featured: index === 0,
  })),
}
const productBrandPromotions: ProductCategoryBrand[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  name: brandFixtures[index]?.name ?? `Thương hiệu ${index + 1}`,
  initials: `T${index + 1}`,
  tone: 'mint',
  description: '',
  imageUrl: productListingProducts[index]?.imageUrl,
  imageAlt: productListingProducts[index]?.name,
}))

interface MountedProductListing {
  readonly wrapper: VueWrapper
  readonly router: Router
}

const mountedWrappers: VueWrapper[] = []

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
}

function createMatchMedia(matches: boolean): (query: string) => MediaQueryList {
  return (query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })
}

async function mountProductListing(path = '/products'): Promise<MountedProductListing> {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
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
  useAuthStore(pinia).resetForTesting()
  useAuthStore(pinia).$patch({ user: null, isInitialized: true })
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.stubGlobal('matchMedia', createMatchMedia(false))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  })
  window.localStorage.clear()
  window.localStorage.setItem(BRANCH_PREFERENCE_KEY, '6')
  useBranchPreferenceStore(pinia).$patch({
    branches: [{
      id: 6,
      code: 'MZ-VL-01',
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
  getProductListingMock.mockReset()
  cartApiMocks.getCustomerCart.mockReset()
  cartApiMocks.addCartItem.mockReset()
  favoriteApiMocks.getCustomerFavorites.mockReset()
  favoriteApiMocks.addCustomerFavorite.mockReset()
  favoriteApiMocks.removeCustomerFavorite.mockReset()
  getProductCategoriesMock.mockReset()
  getProductBrandsMock.mockReset()
  getProductCategoriesMock.mockResolvedValue(categoryFixtures)
  getProductBrandsMock.mockResolvedValue(brandFixtures)
  getProductListingMock.mockImplementation((request: ProductListingRequest) => Promise.resolve({
    ...listingResponse,
    data: listingResponse.data.slice(0, request.per_page),
    meta: {
      pagination: {
        ...listingResponse.meta.pagination,
        current_page: request.page,
        per_page: request.per_page,
      },
    },
  }))
  cartApiMocks.getCustomerCart.mockResolvedValue({ id: 1, totalQuantity: 0, totalAmount: 0, discountAmount: 0, totalAfterDiscount: 0, items: [] })
  cartApiMocks.addCartItem.mockResolvedValue({ id: 1, totalQuantity: 1, totalAmount: 180000, discountAmount: 0, totalAfterDiscount: 180000, items: [] })
  favoriteApiMocks.getCustomerFavorites.mockResolvedValue([])
  favoriteApiMocks.addCustomerFavorite.mockImplementation((productId: number) => Promise.resolve({
    productId,
    name: productListingProducts.find((product) => Number(product.id) === productId)?.name ?? 'Sản phẩm',
    slug: productListingProducts.find((product) => Number(product.id) === productId)?.slug ?? 'san-pham',
    minimumPrice: 180000,
  }))
  favoriteApiMocks.removeCustomerFavorite.mockResolvedValue(undefined)
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('customer product listing page', () => {
  it('renders the /products route and links desktop and mobile product navigation to it', async () => {
    const { wrapper, router } = await mountProductListing()

    expect(router.currentRoute.value.path).toBe('/products')
    expect(wrapper.get('h1').text()).toBe('Sản phẩm chăm sóc da')
    expect(getProductListingMock).toHaveBeenCalledWith(expect.objectContaining({
      branch_id: 6, page: 1, per_page: 24,
    }))
    expect(getProductListingMock.mock.calls.some(([request]) => request.per_page === 1)).toBe(false)
    const productLinks = wrapper.findAll('a[href="/products"]')
    expect(productLinks.length).toBeGreaterThanOrEqual(2)
    expect(productLinks.some((link) => link.attributes('aria-current') === 'page')).toBe(true)
  }, 15_000)

  it('keeps the breadcrumb while removing the old top-left summary block', async () => {
    const { wrapper } = await mountProductListing()

    expect(wrapper.get('nav[aria-label="Đường dẫn trang"]').text()).toContain('Trang chủ')
    expect(wrapper.find('[data-category-summary]').exists()).toBe(false)
    expect(wrapper.find('[data-category-product-slider]').exists()).toBe(false)
    expect(wrapper.find('[data-brand-conveyor]').exists()).toBe(true)
  })

  it('renders real cards with backend images, prices, discounts, and availability', async () => {
    const { wrapper } = await mountProductListing()
    const cards = wrapper.findAll('[data-listing-product]')

    expect(cards).toHaveLength(24)
    expect(cards[0]?.text()).toContain('Sữa Rửa Mặt Cocoon Bí Đao')
    expect(cards[0]?.get('img').attributes('src')).toBe(
      'http://localhost:8000/storage/catalog/products/cocoon.jpg',
    )
    expect(cards[1]?.get('img').attributes('src')).toBe('https://cdn.example.test/product.jpg')
    expect(cards[0]?.get('[data-current-price]').text()).toContain('180.000')
    expect(cards[0]?.get('[data-discount-badge]').text()).toContain('24%')
    expect(cards[23]?.text()).toContain('Bán hết')
    expect(cards[23]?.find('button[disabled]').exists()).toBe(true)
  })

  it('shows a non-blocking success toast after adding a listing product to the server cart', async () => {
    useAuthStore(pinia).$patch({ user: { id: 7, name: 'Customer', email: 'customer@example.com', phone: null, avatar: null, role: 'customer', role_label: 'Khách hàng', branch_id: null, email_verified_at: null, created_at: '2026-08-14' }, isInitialized: true })
    const { wrapper } = await mountProductListing()

    await wrapper.get('button[aria-label^="Thêm Sữa Rửa Mặt Cocoon Bí Đao vào giỏ hàng"]').trigger('click')
    await flushPromises()

    expect(cartApiMocks.addCartItem).toHaveBeenCalledWith(100, 1)
    expect(document.body.textContent).toContain('Đã thêm sản phẩm vào giỏ hàng.')
  })

  it('removes the featured-category shortcut section completely', async () => {
    const { wrapper } = await mountProductListing()

    expect(wrapper.find('#featured-category-heading').exists()).toBe(false)
    expect(wrapper.findAll('[data-featured-category]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Lối tắt mua sắm')
    expect(wrapper.text()).not.toContain('Danh mục nổi bật')
  })

  it('renders real logo-only brand items and honest text wordmarks', async () => {
    const { wrapper, router } = await mountProductListing()
    const slider = wrapper.get('[data-brand-conveyor]')

    expect(slider.attributes('data-motion')).toBe('continuous-marquee')
    expect(slider.attributes('data-drag-enabled')).toBe('true')
    expect(slider.findAll('[data-brand-item]').length).toBeGreaterThan(0)
    expect(slider.get('[data-brand-logo]').attributes('src')).toBe(
      'http://localhost:8000/storage/brands/cocoon.png',
    )
    expect(slider.findAll('[data-brand-wordmark]')).toHaveLength(0)
    expect(wrapper.find('[data-featured-promotion]').exists()).toBe(false)
    expect(slider.find('[data-brand-product-image]').exists()).toBe(false)
    expect(slider.find('button[aria-label^="Xem nhóm thương hiệu"]').exists()).toBe(false)

    expect(slider.text()).not.toContain('9Wishes')
    await slider.get('button[aria-label="Lọc theo thương hiệu Cocoon"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ brand_id: '2', page: '1' })
    expect(getProductListingMock).toHaveBeenCalledWith(expect.objectContaining({ brand_id: 2 }))
  })

  it('stops the marquee and keeps the selected real brand visible', async () => {
    const { wrapper, router } = await mountProductListing('/products?brand_id=2&page=1')
    const slider = wrapper.get('[data-brand-conveyor]')

    expect(slider.attributes('data-autoplay-enabled')).toBe('false')
    expect(slider.attributes('data-paused')).toBe('true')
    expect(slider.get('button[aria-label="Lọc theo thương hiệu Cocoon"]').attributes('aria-pressed')).toBe('true')
    expect(slider.get('[data-brand-marquee-track]').attributes('style')).toContain(
      'animation-play-state: paused',
    )

    await slider.get('button[aria-label="Lọc theo thương hiệu Cocoon"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.brand_id).toBeUndefined()
    expect(slider.attributes('data-autoplay-enabled')).toBe('true')
    await slider.trigger('focusout')
    expect(slider.attributes('data-marquee-running')).toBe('true')
  })

  it('renders a contained representative product image when brand image data exists', () => {
    const imageReadyBrand: ProductCategoryBrand = {
      ...productBrandPromotions[0]!,
      imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E',
      imageAlt: 'Sản phẩm làm sạch đại diện CeraVe',
    }
    const wrapper = mount(ProductBrandSlider, {
      props: { brands: [imageReadyBrand] },
    })
    mountedWrappers.push(wrapper)

    const image = wrapper.get('[data-brand-product-image]')
    expect(image.attributes('alt')).toBe('Sản phẩm làm sạch đại diện CeraVe')
    expect(image.classes()).toContain('object-contain')
    expect(wrapper.find('[data-brand-image-placeholder]').exists()).toBe(false)
  })

  it('shares real category options and sends category_id from desktop and mobile', async () => {
    const { wrapper, router } = await mountProductListing()
    const desktopFilters = wrapper.get('[data-testid="desktop-product-filters"]')
    const heroElement = wrapper.get('[data-brand-conveyor]').element
    const scrollToSpy = vi.spyOn(window, 'scrollTo')

    expect(desktopFilters.text()).toContain('Danh mục')
    expect(desktopFilters.text()).toContain('Thương hiệu')
    expect(desktopFilters.text()).toContain('Khoảng giá')
    expect(desktopFilters.text()).not.toContain('Nhu cầu')
    expect(desktopFilters.text()).not.toContain('Ưu đãi')
    expect(desktopFilters.find('input[type="search"]').exists()).toBe(false)
    expect(desktopFilters.findAll('details').every((group) => group.attributes('open') === undefined)).toBe(true)
    expect(desktopFilters.text()).not.toContain('Sữa Rửa Mặt')
    const categoryChevron = desktopFilters.get('button[aria-label="Mở rộng danh mục Chăm Sóc Da Mặt"]')
    expect(categoryChevron.attributes('aria-expanded')).toBe('false')
    await categoryChevron.trigger('click')
    expect(router.currentRoute.value.query.category_id).toBeUndefined()
    expect(categoryChevron.attributes('aria-expanded')).toBe('true')
    expect(desktopFilters.text()).toContain('Sữa Rửa Mặt')

    const parentCheckbox = desktopFilters.get(
      'input[aria-label="Lọc theo danh mục Chăm Sóc Da Mặt"]',
    )
    await parentCheckbox.setValue(true)

    await flushPromises()
    expect(wrapper.findAll('[data-listing-product]')).toHaveLength(24)
    expect(router.currentRoute.value.query.category_id).toBe('6')
    expect(getProductListingMock).toHaveBeenCalledWith(expect.objectContaining({ category_id: 6 }))
    expect(wrapper.get('[data-brand-conveyor]').element).toBe(heroElement)
    expect(scrollToSpy).not.toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))

    await wrapper.get('[data-testid="mobile-filter-trigger"]').trigger('click')
    await nextTick()
    const dialog = document.body.querySelector('[role="dialog"][data-state="open"]')
    expect(dialog?.textContent).toContain('Chăm Sóc Da Mặt')
    expect(dialog?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true)
  })

  it('expands the real parent containing a route-selected child after refresh', async () => {
    const { wrapper, router } = await mountProductListing('/products?category_id=10&page=1')
    const desktopFilters = wrapper.get('[data-testid="desktop-product-filters"]')

    expect(desktopFilters.get('button[aria-label="Thu gọn danh mục Chăm Sóc Da Mặt"]').attributes('aria-expanded')).toBe('true')
    expect(
      (desktopFilters.get('input[aria-label="Lọc theo danh mục Sữa Rửa Mặt"]').element as HTMLInputElement).checked,
    ).toBe(true)
    expect(router.currentRoute.value.query.category_id).toBe('10')
    expect(getProductListingMock).toHaveBeenCalledWith(expect.objectContaining({ category_id: 10 }))
  })

  it('opens, applies, resets, and closes the mobile filter dialog locally', async () => {
    const { wrapper, router } = await mountProductListing()

    await wrapper.get('[data-testid="mobile-filter-trigger"]').trigger('click')
    await nextTick()
    const dialog = document.body.querySelector('[role="dialog"][data-state="open"]')
    expect(dialog).not.toBeNull()

    const dialogCheckbox = dialog?.querySelector<HTMLInputElement>(
      'input[aria-label="Lọc theo danh mục Chăm Sóc Da Mặt"]',
    )
    expect(dialogCheckbox).not.toBeNull()
    dialogCheckbox?.click()
    await nextTick()

    document.body.querySelector<HTMLButtonElement>('[data-testid="mobile-filter-apply"]')?.click()
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"][data-state="open"]')).toBeNull()
    expect(wrapper.text()).toContain('1 bộ lọc đang áp dụng')
    expect(router.currentRoute.value.query.category_id).toBe('6')

    await wrapper.get('[data-testid="mobile-filter-trigger"]').trigger('click')
    await nextTick()
    document.body.querySelector<HTMLButtonElement>('[data-testid="mobile-filter-reset"]')?.click()
    document.body.querySelector<HTMLButtonElement>('[data-testid="mobile-filter-apply"]')?.click()
    await flushPromises()
    expect(wrapper.text()).not.toContain('1 bộ lọc đang áp dụng')
    expect(router.currentRoute.value.query.category_id).toBeUndefined()

    await wrapper.get('[data-testid="mobile-filter-trigger"]').trigger('click')
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(document.body.querySelector('[role="dialog"][data-state="open"]')).toBeNull()
  })

  it('renders real-label chips, removes one filter, and clears all filters once', async () => {
    const { wrapper, router } = await mountProductListing(
      '/products?keyword=Cocoon&category_id=6&brand_id=2&in_stock=1&sort=price_asc&page=4',
    )
    const chips = wrapper.get('[data-testid="active-filter-chips"]')

    expect(chips.findAll('[data-filter-chip]')).toHaveLength(5)
    expect(chips.text()).toContain('Cocoon')
    expect(chips.text()).toContain('Chăm Sóc Da Mặt')
    expect(chips.text()).toContain('Giá tăng dần')

    await chips.get('[data-filter-chip="brand"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.brand_id).toBeUndefined()
    expect(router.currentRoute.value.query).toMatchObject({
      keyword: 'Cocoon',
      category_id: '6',
      in_stock: '1',
      sort: 'price_asc',
      page: '1',
    })

    const pushSpy = vi.spyOn(router, 'push')
    await wrapper.get('[data-testid="clear-all-product-filters"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ page: '1' })
    expect(pushSpy).toHaveBeenCalledOnce()
    expect(useBranchPreferenceStore(pinia).selectedBranchId).toBe(6)
  })

  it('desktop Reset clears keyword, category, brand, stock, sort, and page in one update', async () => {
    const { wrapper, router } = await mountProductListing(
      '/products?keyword=Serum&category_id=10&brand_id=2&in_stock=1&sort=rating&page=3',
    )
    const pushSpy = vi.spyOn(router, 'push')
    const resetButton = wrapper
      .get('[data-testid="desktop-product-filters"]')
      .findAll('button')
      .find((button) => button.text().trim() === 'Đặt lại')

    expect(resetButton).toBeDefined()
    await resetButton?.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ page: '1' })
    expect(pushSpy).toHaveBeenCalledOnce()
    expect(useBranchPreferenceStore(pinia).selectedBranchId).toBe(6)
  })

  it('sends a supported sort through route-backed state', async () => {
    const { wrapper, router } = await mountProductListing('/products?page=4')

    await wrapper.get('[data-testid="product-sort"]').setValue('price_asc')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({ sort: 'price_asc', page: '1' })
    expect(getProductListingMock).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'price_asc', page: 1 }),
    )
    expect(wrapper.get('[data-testid="product-sort"]').element).toHaveProperty(
      'value',
      'price_asc',
    )
  })

  it('selects a visible real brand checkbox and sends brand_id without a local search field', async () => {
    const { wrapper, router } = await mountProductListing()
    const desktopFilters = wrapper.get('[data-testid="desktop-product-filters"]')
    expect(desktopFilters.find('input[type="search"]').exists()).toBe(false)
    const brandCheckbox = desktopFilters.findAll('label').find((label) => label.text().includes('Cocoon'))?.get('input')
    expect(brandCheckbox).toBeDefined()
    await brandCheckbox?.setValue(true)
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({ brand_id: '2', page: '1' })
    expect(router.currentRoute.value.query.brand_id).toBe('2')
  })

  it('selects a marquee brand by its backend ID and resumes motion after clearing it', async () => {
    const { wrapper, router } = await mountProductListing()
    const cocoon = wrapper.get('button[aria-label="Lọc theo thương hiệu Cocoon"]')

    await cocoon.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({ brand_id: '2', page: '1' })
    expect(wrapper.get('[data-brand-conveyor]').attributes('data-marquee-running')).toBe('false')
    expect(wrapper.get('button[aria-label="Lọc theo thương hiệu Cocoon"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('button[aria-label="Lọc theo thương hiệu Cocoon"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.brand_id).toBeUndefined()
    expect(wrapper.get('[data-brand-conveyor]').attributes('data-marquee-running')).toBe('true')
  })

  it('renders numbered backend pagination and preserves filters when changing pages', async () => {
    const { wrapper, router } = await mountProductListing(
      '/products?keyword=Cocoon&category_id=6&brand_id=45&in_stock=1&sort=price_asc&page=1',
    )
    const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')

    expect(wrapper.findAll('[data-listing-product]')).toHaveLength(24)
    expect(wrapper.find('[data-testid="load-more-products"]').exists()).toBe(false)
    const pagination = wrapper.get('[data-testid="product-pagination"]')
    expect(pagination.get('button[aria-label="Trang trước"]').attributes('disabled')).toBeDefined()
    expect(pagination.get('button[aria-label="Trang 1"]').attributes('aria-current')).toBe('page')
    expect(pagination.text()).toContain('101')

    await pagination.get('button[aria-label="Trang 2"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      keyword: 'Cocoon',
      category_id: '6',
      brand_id: '45',
      in_stock: '1',
      sort: 'price_asc',
      page: '2',
    })
    expect(getProductListingMock).toHaveBeenCalledWith(expect.objectContaining({
      keyword: 'Cocoon', category_id: 6, brand_id: 45, branch_id: 6,
      in_stock: true, sort: 'price_asc', page: 2,
    }))
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('renders compact suggestions in exactly one carousel row', async () => {
    const { wrapper } = await mountProductListing()

    expect(wrapper.get('#product-suggestion-heading').text()).toBe('Có thể bạn thích')
    expect(wrapper.findAll('[data-suggestion-row]')).toHaveLength(1)
    expect(wrapper.findAll('[data-suggested-product]')).toHaveLength(8)
    expect(wrapper.findAll('[data-compact-product-card]')).toHaveLength(8)
    expect(wrapper.get('[data-suggestion-row]').classes()).toContain('flex')
    expect(wrapper.get('[data-suggestion-row]').classes()).not.toContain('flex-wrap')
    expect(wrapper.findAll('[data-suggested-product-image]')).toHaveLength(8)
    expect(wrapper.findAll('[data-suggestion-product-action]')).toHaveLength(8)
    expect(wrapper.get('[data-suggestion-product-action]').text()).toBe('Xem sản phẩm')
    expect(wrapper.get('[data-suggested-product-image]').attributes('src')).toContain(
      'localhost:8000/storage/catalog/products',
    )
    expect(getProductListingMock.mock.calls.every(([request]) => (
      typeof request === 'object' && request !== null && 'per_page' in request
    ))).toBe(true)
  })

  it('renders honest rating states and redirects a guest favorite action to login', async () => {
    const { wrapper, router } = await mountProductListing()
    const cards = wrapper.findAll('[data-listing-product]')
    expect(cards[0]?.get('[data-product-image-area]').classes()).toContain('aspect-square')
    expect(cards[0]?.get('[data-product-image]').classes()).toContain('object-contain')
    expect(cards[0]?.get('[data-product-name]').classes()).toContain('line-clamp-2')
    expect(cards[0]?.get('[data-product-name]').classes()).toContain('min-h-11')
    expect(cards[0]?.get('[data-rating-stock-row]').find('[data-product-stock]').exists()).toBe(true)
    expect(cards[0]?.get('[data-product-rating]').text()).toContain('4.8')
    expect(cards[0]?.get('[data-product-rating]').text()).toContain('(12)')

    const zeroRatingProduct = { ...productListingProducts[0]!, rating: 0, reviewCount: 0 }
    const zeroWrapper = mount(ProductListingGrid, {
      props: { products: [zeroRatingProduct], state: 'success' },
    })
    mountedWrappers.push(zeroWrapper)
    expect(zeroWrapper.get('[data-product-rating]').text()).toBe('Chưa có đánh giá')
    expect(zeroWrapper.get('[data-rating-stock-row]').find('[data-product-stock]').exists()).toBe(true)

    const favorite = cards[0]?.get('button[aria-label^="Yêu thích"]')
    expect(useAuthStore(pinia).isAuthenticated).toBe(false)
    expect(favorite?.attributes('aria-pressed')).toBe('false')
    expect(favorite?.classes()).toContain('border-white/90')
    await cards[0]?.get('[data-product-image]').trigger('error')
    expect(cards[0]?.get('[data-product-image]').attributes('src')).toMatch(/^data:image\/svg\+xml/)
    expect(wrapper.findAll('img').every((image) => !image.attributes('src')?.includes('placehold.co'))).toBe(true)

    await favorite?.trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(ProductListingGrid).emitted('toggle-favorite')).toHaveLength(1)
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/login'))
    expect(router.currentRoute.value.query.redirect).toBe('/products')
    expect(favoriteApiMocks.addCustomerFavorite).not.toHaveBeenCalled()

  })

  it('adds and removes a real favorite from Listing using backend-confirmed state', async () => {
    useAuthStore(pinia).$patch({ user: { id: 71, name: 'Customer', email: 'favorite@example.com', phone: null, avatar: null, role: 'customer', role_label: 'Khách hàng', branch_id: null, email_verified_at: null, created_at: '2026-08-14' }, isInitialized: true })
    const { wrapper, router } = await mountProductListing()
    const firstProduct = productListingProducts[0]!
    const favorite = wrapper.get(`[data-listing-product] button[aria-label="Yêu thích ${firstProduct.name}"]`)

    await favorite.trigger('click')
    await flushPromises()
    expect(favoriteApiMocks.addCustomerFavorite.mock.calls[0]?.[0]).toBe(Number(firstProduct.id))
    expect(wrapper.get(`[data-listing-product] button[aria-pressed="true"]`).classes()).toContain('text-red-600')
    expect(wrapper.get(`[data-suggested-product] button[aria-pressed="true"]`).attributes('aria-label')).toContain(firstProduct.name)
    expect(router.currentRoute.value.path).toBe('/products')

    await wrapper.get(`[data-listing-product] button[aria-label="Bỏ ${firstProduct.name} khỏi yêu thích"]`).trigger('click')
    await flushPromises()
    expect(favoriteApiMocks.removeCustomerFavorite.mock.calls[0]?.[0]).toBe(Number(firstProduct.id))
    expect(wrapper.get(`[data-listing-product] button[aria-label="Yêu thích ${firstProduct.name}"]`).attributes('aria-pressed')).toBe('false')
  })

  it('restores valid route query state and sends the selected branch ID', async () => {
    const { router } = await mountProductListing(
      '/products?keyword=route-state-test&category_id=6&brand_id=45&in_stock=true&sort=rating&page=3',
    )

    expect(router.currentRoute.value.query).toMatchObject({
      keyword: 'route-state-test', category_id: '6', brand_id: '45',
      in_stock: 'true', sort: 'rating', page: '3',
    })
    expect(getProductListingMock).toHaveBeenCalledWith(expect.objectContaining({
      keyword: 'route-state-test', category_id: 6, brand_id: 45, branch_id: 6,
      in_stock: true, sort: 'rating', page: 3, per_page: 24,
    }))
  })

  it('keeps the previous grid visible while a filter request is refetching', async () => {
    const { wrapper } = await mountProductListing()
    let resolveRefetch: ((value: ProductListingResponseDto) => void) | undefined
    getProductListingMock.mockImplementationOnce(() => new Promise<ProductListingResponseDto>(
      (resolve) => { resolveRefetch = resolve },
    ))

    await wrapper
      .get('[data-testid="desktop-product-filters"] input[aria-label="Lọc theo danh mục Chăm Sóc Cơ Thể"]')
      .setValue(true)
    await nextTick()

    expect(wrapper.findAll('[data-listing-product]')).toHaveLength(24)
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="product-results-refreshing"]').exists()).toBe(true)
    })
    expect(wrapper.find('[aria-label="Đang tải danh sách sản phẩm"]').exists()).toBe(false)

    resolveRefetch?.(listingResponse)
    await flushPromises()
    expect(wrapper.findAll('[data-listing-product]')).toHaveLength(24)
  })

  it('preserves listing filters and resets only page when the branch changes', async () => {
    const { router } = await mountProductListing(
      '/products?keyword=Cocoon&category_id=6&brand_id=2&in_stock=1&sort=price_asc&page=3',
    )
    const branchStore = useBranchPreferenceStore(pinia)
    branchStore.$patch({
      branches: [
        ...branchStore.branches,
        {
          id: 1,
          code: 'MZ-NK-01',
          name: 'Mizuki Ninh Kiều',
          address: 'Cần Thơ',
          phone: null,
          email: null,
          is_active: true,
          opening_hours: [],
        },
      ],
    })

    branchStore.selectBranch(1)
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      keyword: 'Cocoon',
      category_id: '6',
      brand_id: '2',
      in_stock: '1',
      sort: 'price_asc',
      page: '1',
    })
    expect(getProductListingMock).toHaveBeenCalledWith(expect.objectContaining({
      branch_id: 1,
      category_id: 6,
      brand_id: 2,
      page: 1,
    }))
  })

  it('rejects invalid IDs, sort, and page values safely', async () => {
    await mountProductListing(
      '/products?keyword=invalid-route-test&category_id=abc&brand_id=-1&sort=popular&page=0',
    )

    expect(getProductListingMock).toHaveBeenCalledWith({
      keyword: 'invalid-route-test', branch_id: 6, sort: 'newest', page: 1, per_page: 24,
    })
  })

  it('restores listing state with browser Back-compatible route history', async () => {
    const { router } = await mountProductListing('/products?keyword=Cocoon&page=2')
    await router.push('/products?keyword=Serum&sort=name&page=1')
    await flushPromises()
    router.back()
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({ keyword: 'Cocoon', page: '2' })
  })

  it('opens the existing product detail route with the real slug', async () => {
    const { wrapper, router } = await mountProductListing()
    const productAction = wrapper.get('button[aria-label="Xem Sữa Rửa Mặt Cocoon Bí Đao"]')

    await productAction.trigger('click')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe('/products/sua-rua-mat-cocoon-bi-dao')
    })
    await flushPromises()
  })

  it('shows API error and retry without rendering demo listing products', async () => {
    getProductListingMock.mockRejectedValueOnce(new Error('network unavailable'))
    const { wrapper } = await mountProductListing('/products?keyword=force-error-unique')
    await flushPromises()

    expect(wrapper.text()).toContain('Chưa thể hiển thị sản phẩm')
    expect(wrapper.get('#product-results').text()).not.toContain(productListingProducts[0]!.name)

    getProductListingMock.mockResolvedValueOnce(listingResponse)
    const retryButton = wrapper.findAll('button').find((button) => button.text().trim() === 'Thử lại')
    expect(retryButton).toBeDefined()
    await retryButton?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Sữa Rửa Mặt Cocoon Bí Đao')
  })

  it('moves through compact suggestions with buttons and keyboard', async () => {
    const router = createAppRouter(createMemoryHistory())
    const wrapper = mount(ProductSuggestions, {
      props: { products: suggestedProducts },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)
    const carousel = wrapper.get('[data-suggestion-carousel]')

    await wrapper.get('button[aria-label="Xem sản phẩm gợi ý tiếp theo"]').trigger('click')
    expect(carousel.attributes('data-active-index')).toBe('1')

    await wrapper.get('[data-suggestion-row]').trigger('keydown', { key: 'ArrowRight' })
    expect(carousel.attributes('data-active-index')).toBe('2')

    await wrapper.get('button[aria-label="Xem sản phẩm gợi ý trước"]').trigger('click')
    expect(carousel.attributes('data-active-index')).toBe('1')

    await wrapper.get('[data-suggestion-product-action]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/products/sua-rua-mat-cocoon-bi-dao')
  })

  it.each([
    ['loading', 'Đang tải danh sách sản phẩm'],
    ['empty', 'Chưa tìm thấy sản phẩm phù hợp'],
    ['error', 'Chưa thể hiển thị sản phẩm'],
  ] as const)('renders the %s product state', async (state, expectedText) => {
    const wrapper = mount(ProductListingGrid, {
      props: {
        products: state === 'empty' ? [] : productListingProducts.slice(0, 2),
        state,
      },
    })
    mountedWrappers.push(wrapper)
    await nextTick()

    if (state === 'loading') {
      expect(wrapper.find(`[aria-label="${expectedText}"]`).exists()).toBe(true)
    } else {
      expect(wrapper.text()).toContain(expectedText)
    }
  })

  it('uses the listing API abstraction without raw browser requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const { wrapper } = await mountProductListing('/products?keyword=raw-network-test')

    await wrapper.get('[data-testid="product-sort"]').setValue('name')
    await wrapper.get('[data-testid="mobile-filter-trigger"]').trigger('click')
    await nextTick()
    document.body.querySelector<HTMLButtonElement>('[data-testid="mobile-filter-apply"]')?.click()
    await nextTick()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
    expect(getProductListingMock).toHaveBeenCalled()
  })
})

describe('category and brand slider motion contracts', () => {
  it('keeps one desktop filter scroller and renders only real curated IDs plus the selection', () => {
    const filters = {
      categoryIds: [], brandIds: ['99'], concernIds: [], priceRange: 'all' as const,
      minimumRating: null, highlights: [], inStockOnly: false,
    }
    const wrapper = mount(ProductFilterPanel, {
      props: {
        filters,
        categories: [{ id: '6', label: 'Chăm sóc da', children: [
          { id: '10', label: 'Làm sạch', children: [] },
        ] }],
        brands: [
          { id: '45', label: 'Cocoon', slug: 'cocoon' },
          { id: '7', label: 'La Roche-Posay', slug: 'la-roche-posay' },
          { id: '99', label: 'Thương hiệu đã chọn', slug: 'selected-brand' },
          { id: '100', label: 'Không thuộc danh sách', slug: 'not-featured' },
        ],
        optionsState: 'success',
      },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('[data-testid="product-filter-panel"]').classes()).toContain('overflow-visible')
    expect(wrapper.get('[data-category-filter-tree]').classes()).toContain('overflow-visible')
    expect(wrapper.get('[data-category-filter-tree]').classes()).not.toContain('overflow-y-auto')
    expect(wrapper.get('[data-brand-filter-list]').classes()).toContain('max-h-96')
    expect(wrapper.get('[data-brand-filter-list]').classes()).toContain('overflow-y-auto')
    expect(wrapper.text()).toContain('Đặt lại')
    expect(wrapper.findAll('summary svg')).toHaveLength(3)
    expect(wrapper.findAll('[data-brand-filter-id]').map((item) => item.attributes('data-brand-filter-id')))
      .toEqual(['45', '100', '7', '99'])
    expect(wrapper.text()).toContain('Không thuộc danh sách')
    expect(wrapper.text()).not.toContain('Bioderma')
  })

  it('runs the continuous logo marquee and pauses it on hover and focus', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    const router = createAppRouter(createMemoryHistory())
    await router.push('/products')
    await router.isReady()
    const wrapper = mount(ProductListingHero, {
      props: {
        brands: brandFixtures.map((brand) => ({
          id: String(brand.id),
          name: brand.name,
          logoUrl: brand.logo ?? undefined,
        })),
      },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    const conveyor = wrapper.get('[data-brand-conveyor]')
    const track = wrapper.get('[data-brand-marquee-track]')
    expect(conveyor.attributes('data-autoplay-enabled')).toBe('true')
    expect(conveyor.attributes('data-marquee-running')).toBe('true')
    expect(track.attributes('style')).toContain('animation-play-state: running')
    expect(setIntervalSpy).not.toHaveBeenCalled()

    await conveyor.trigger('mouseenter')
    expect(conveyor.attributes('data-marquee-running')).toBe('false')
    expect(track.attributes('style')).toContain('animation-play-state: paused')

    await conveyor.trigger('mouseleave')
    await conveyor.trigger('focusin')
    expect(conveyor.attributes('data-paused')).toBe('true')
    expect(track.attributes('style')).toContain('animation-play-state: paused')
  })

  it('disables logo-marquee automatic movement for reduced motion', async () => {
    vi.stubGlobal('matchMedia', createMatchMedia(true))
    const router = createAppRouter(createMemoryHistory())
    await router.push('/products')
    await router.isReady()
    const wrapper = mount(ProductListingHero, {
      props: {
        brands: brandFixtures.map((brand) => ({
          id: String(brand.id),
          name: brand.name,
          logoUrl: brand.logo ?? undefined,
        })),
      },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    await nextTick()
    expect(wrapper.get('[data-brand-conveyor]').attributes('data-autoplay-enabled')).toBe('false')
    expect(wrapper.get('[data-brand-conveyor]').attributes('data-marquee-running')).toBe('false')
    expect(wrapper.get('[data-brand-marquee-track]').attributes('style')).toContain(
      'animation-play-state: paused',
    )
    expect(wrapper.find('button[aria-label^="Xem nhóm thương hiệu"]').exists()).toBe(false)
  })

  it('supports pointer drag without accidentally selecting a brand', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/products')
    await router.isReady()
    const wrapper = mount(ProductListingHero, {
      props: {
        brands: brandFixtures.map((brand) => ({
          id: String(brand.id),
          name: brand.name,
          logoUrl: brand.logo ?? undefined,
        })),
      },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    const viewport = wrapper.get('[data-brand-marquee-viewport]')
    const brand = wrapper.get('button[aria-label="Lọc theo thương hiệu Cocoon"]')
    brand.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 180 }))
    viewport.element.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 120 }))
    viewport.element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 120 }))
    await nextTick()
    brand.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await nextTick()

    expect(wrapper.emitted('selectBrand')).toBeUndefined()
    expect(wrapper.get('[data-brand-conveyor]').attributes('data-drag-enabled')).toBe('true')
  })

  it('treats small pointer movement as selection and lets a cloned item select', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/products')
    await router.isReady()
    const wrapper = mount(ProductListingHero, {
      props: {
        brands: [
          { id: '2', name: 'Cocoon', logoUrl: '/storage/brands/cocoon.png' },
          { id: '3', name: 'CeraVe', logoUrl: '/storage/brands/cerave.png' },
        ],
      },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    const viewport = wrapper.get('[data-brand-marquee-viewport]')
    const original = wrapper.get('[data-brand-copy="1"][data-brand-id="2"]')
    original.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100 }))
    viewport.element.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 96 }))
    viewport.element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 96 }))
    await nextTick()
    expect(wrapper.emitted('selectBrand')).toEqual([['2']])

    await wrapper.get('[data-brand-copy="2"][data-brand-id="3"]').trigger('click')
    expect(wrapper.emitted('selectBrand')).toEqual([['2'], ['3']])
  })

  it('never renders 9Wishes in either marquee copy', () => {
    const router = createAppRouter(createMemoryHistory())
    const wrapper = mount(ProductListingHero, {
      props: { brands: [
        { id: '9', name: '9Wishes', logoUrl: '/9wishes.png' },
        { id: '2', name: 'Cocoon', logoUrl: '/cocoon.png' },
      ] },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).not.toContain('9Wishes')
    expect(wrapper.find('[data-brand-id="9"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-brand-id="2"]')).toHaveLength(5)
  })

  it('drops a brand whose logo cannot be loaded instead of rendering a wordmark', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/products')
    await router.isReady()
    const wrapper = mount(ProductListingHero, {
      props: {
        brands: [{ id: '2', name: 'Cocoon', logoUrl: 'https://cdn.example.test/cocoon.png' }],
      },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    await wrapper.get('[data-brand-logo]').trigger('error')
    expect(wrapper.find('[data-brand-logo]').exists()).toBe(false)
    expect(wrapper.find('[data-brand-item]').exists()).toBe(false)
    expect(wrapper.find('[data-brand-wordmark]').exists()).toBe(false)
  })

  it('uses a continuous duplicated conveyor without discrete controls or timers', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    const wrapper = mount(ProductCategoryProductSlider, {
      props: { products: productCategorySummary.previewProducts },
    })
    mountedWrappers.push(wrapper)

    expect(productCategorySummary.previewProducts).toHaveLength(4)
    expect(wrapper.attributes('data-motion')).toBe('continuous-marquee')
    expect(wrapper.attributes('data-autoplay-ms')).toBeUndefined()
    expect(wrapper.find('[data-category-conveyor-track]').exists()).toBe(true)
    expect(wrapper.get('[data-category-conveyor-track]').classes()).toContain('motion-reduce:animate-none')
    expect(wrapper.get('[data-category-conveyor-viewport]').classes()).toContain('motion-reduce:overflow-x-auto')
    expect(wrapper.findAll('[data-category-preview-product]')).toHaveLength(4)
    expect(wrapper.findAll('[data-category-preview-clone]')).toHaveLength(4)
    expect(wrapper.get('[data-category-conveyor-clone]').attributes('aria-hidden')).toBe('true')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(setIntervalSpy).not.toHaveBeenCalled()
    expect(wrapper.attributes('data-pause-on-hover')).toBe('true')
    expect(wrapper.attributes('data-pause-on-focus')).toBe('true')
    expect(wrapper.attributes('data-reduced-motion')).toBe('static-horizontal-scroll')
  })

  it('autoplays every six seconds and pauses while focused', async () => {
    vi.useFakeTimers()
    const wrapper = mount(ProductBrandSlider, {
      props: { brands: productBrandPromotions },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.attributes('data-autoplay-ms')).toBe('6000')
    expect(wrapper.attributes('data-autoplay-enabled')).toBe('true')
    vi.advanceTimersByTime(6_000)
    await nextTick()
    expect(wrapper.attributes('data-active-slide')).toBe('1')

    await wrapper.trigger('focusin')
    vi.advanceTimersByTime(6_000)
    await nextTick()
    expect(wrapper.attributes('data-active-slide')).toBe('1')
  })

  it('disables autoplay and strong transitions for reduced motion', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', createMatchMedia(true))
    const wrapper = mount(ProductBrandSlider, {
      props: { brands: productBrandPromotions },
    })
    mountedWrappers.push(wrapper)
    await nextTick()

    vi.advanceTimersByTime(12_000)
    await nextTick()
    expect(wrapper.attributes('data-autoplay-enabled')).toBe('false')
    expect(wrapper.attributes('data-active-slide')).toBe('0')
    expect(wrapper.get('[data-brand-slide="0"]').classes()).toContain('motion-reduce:transition-none')

    await wrapper.get('button[aria-label="Xem nhóm thương hiệu tiếp theo"]').trigger('click')
    expect(wrapper.attributes('data-active-slide')).toBe('1')
  })

  it('cleans up the brand autoplay timer when unmounted', () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
    const brandWrapper = mount(ProductBrandSlider, {
      props: { brands: productBrandPromotions },
    })

    brandWrapper.unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
