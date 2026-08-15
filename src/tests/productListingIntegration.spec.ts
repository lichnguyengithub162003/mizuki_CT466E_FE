import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CustomerSearch from '@/components/customer-shell/CustomerSearch.vue'
import { ROUTE_NAMES } from '@/constants/routes'

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }))

vi.mock('@/api/clients', () => ({
  apiClient: { get: apiGetMock },
}))

import {
  getProductBrands,
  getProductCategories,
  getProductListing,
  searchProducts,
  type ProductListingItemDto,
  type ProductListingResponseDto,
} from '@/api/productListingApi'
import {
  adaptProductListItem,
  adaptProductListing,
  PRODUCT_LISTING_FALLBACK_IMAGE,
  resolveCatalogAsset,
  resolveProductImage,
} from '@/api/productListingAdapter'

const baseProduct: ProductListingItemDto = {
  id: 1037,
  name: 'Son Dưỡng Cocoon Dầu Dừa Bến Tre 5g',
  slug: 'son-duong-cocoon-dau-dua-ben-tre-5g-86707',
  category: { id: 12, name: 'Son Dưỡng Môi', parent_id: 10 },
  brand: { id: 45, name: 'Cocoon' },
  primary_image: '/storage/catalog/products/86707/product.jpg',
  primary_image_url: null,
  price: 149_000,
  original_price: 169_000,
  minimum_price: 139_000,
  has_discount: true,
  discount: { amount: 30_000, percentage: 18 },
  rating: 4.8,
  review_count: 25,
  default_variant: {
    id: 2001,
    name: '5g',
    sku: 'COCOON-86707',
    attributes: { size: '5g' },
    price: 169_000,
    sale_price: 129_000,
    effective_price: 129_000,
  },
  availability: { available: true, available_quantity: 8, stock_state: 'available' },
}

beforeEach(() => {
  apiGetMock.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('product listing API and adapter', () => {
  it('requests only GET /products with supported listing parameters', async () => {
    const response: ProductListingResponseDto = {
      success: true,
      data: [baseProduct],
      message: 'OK',
      meta: { pagination: { current_page: 2, per_page: 24, total: 2406, last_page: 101 } },
    }
    apiGetMock.mockResolvedValue({ data: response })

    await expect(getProductListing({
      keyword: 'Cocoon',
      category_id: 12,
      brand_id: 45,
      branch_id: 6,
      in_stock: true,
      sort: 'price_asc',
      page: 2,
      per_page: 24,
    })).resolves.toEqual(response)

    expect(apiGetMock).toHaveBeenCalledOnce()
    expect(apiGetMock).toHaveBeenCalledWith('/products', {
      params: {
        keyword: 'Cocoon', category_id: 12, brand_id: 45, branch_id: 6,
        in_stock: true, sort: 'price_asc', page: 2, per_page: 24,
      },
    })
    expect(String(apiGetMock.mock.calls[0]?.[0])).not.toMatch(/\/products\//)
  })

  it('loads category, brand, and autocomplete contracts from their confirmed endpoints', async () => {
    apiGetMock
      .mockResolvedValueOnce({ data: { data: [{ id: 6, parent_id: null, name: 'Da mặt', slug: 'da-mat', children: [] }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: 45, name: 'Cocoon', slug: 'cocoon', logo: null, banner_image: null, description: null }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: 1, name: 'Cocoon Bí Đao', slug: 'cocoon-bi-dao', primary_image_url: '/storage/cocoon.jpg', minimum_price: 180_000 }] } })

    await expect(getProductCategories()).resolves.toHaveLength(1)
    await expect(getProductBrands()).resolves.toHaveLength(1)
    await expect(searchProducts('Cocoon')).resolves.toHaveLength(1)

    expect(apiGetMock.mock.calls).toEqual([
      ['/categories'],
      ['/brands'],
      ['/products/search', { params: { keyword: 'Cocoon' } }],
    ])
  })

  it('maps backend pagination and effective-price precedence', () => {
    const result = adaptProductListing({
      success: true,
      data: [baseProduct],
      message: 'OK',
      meta: { pagination: { current_page: 3, per_page: 24, total: 2406, last_page: 101 } },
    })

    expect(result.pagination).toEqual({ currentPage: 3, perPage: 24, total: 2406, lastPage: 101 })
    expect(result.products[0]?.price).toBe(129_000)
    expect(result.products[0]?.originalPrice).toBe(169_000)
    expect(result.products[0]?.discountPercent).toBe(18)
  })

  it('falls back from effective price to minimum price and then product price', () => {
    expect(adaptProductListItem({
      ...baseProduct,
      default_variant: { ...baseProduct.default_variant!, effective_price: null },
    }).price).toBe(139_000)

    expect(adaptProductListItem({
      ...baseProduct,
      default_variant: null,
      minimum_price: null,
    }).price).toBe(149_000)
  })

  it('keeps absolute images and resolves relative storage images to the backend', () => {
    expect(resolveProductImage('https://cdn.example.test/product.jpg')).toBe(
      'https://cdn.example.test/product.jpg',
    )
    expect(resolveProductImage('/storage/catalog/products/product.jpg')).toBe(
      'http://localhost:8000/storage/catalog/products/product.jpg',
    )
    expect(resolveProductImage(null)).toBe(PRODUCT_LISTING_FALLBACK_IMAGE)
    expect(resolveProductImage('https://placehold.co/480x480')).toBe(
      PRODUCT_LISTING_FALLBACK_IMAGE,
    )
    expect(resolveCatalogAsset('/storage/brands/cocoon.png')).toBe(
      'http://localhost:8000/storage/brands/cocoon.png',
    )
    expect(resolveCatalogAsset('cocoon.png')).toBe(
      'http://localhost:8000/storage/catalog/brands/cocoon.png',
    )
    expect(resolveCatalogAsset('catalog/brands/cocoon.png')).toBe(
      'http://localhost:8000/storage/catalog/brands/cocoon.png',
    )
    expect(resolveCatalogAsset('https://cdn.example.test/cocoon.png')).toBe(
      'https://cdn.example.test/cocoon.png',
    )
    expect(resolveCatalogAsset(null)).toBeUndefined()
  })

  it('uses backend availability without invented sales or badges', () => {
    const unavailable = adaptProductListItem({
      ...baseProduct,
      availability: { available: false, available_quantity: 0, stock_state: 'sold-out' },
    })

    expect(unavailable.stockState).toBe('sold_out')
    expect(unavailable.soldCount).toBeUndefined()
    expect(unavailable.badge).toBeUndefined()
    expect(adaptProductListItem({
      ...baseProduct,
      availability: { available: true, available_quantity: 3, stock_state: 'low-stock' },
    }).stockState).toBe('low')
  })

  it('contains no any type in the listing integration files', () => {
    const source = [
      'src/api/productListingApi.ts',
      'src/api/productListingAdapter.ts',
      'src/queries/productListing.ts',
      'src/pages/customer/ProductListingPage.vue',
    ].map((path) => readFileSync(path, 'utf8')).join('\n')

    expect(source).not.toMatch(/\bany\b/)
    expect(source).not.toContain('productListingDemoData')
  })
})

function createSearchRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/products', name: ROUTE_NAMES.products, component: { template: '<div />' } },
      { path: '/products/:slug', name: ROUTE_NAMES.productDetail, component: { template: '<div />' } },
    ],
  })
}

const searchResult = {
  id: 1311,
  name: 'Bộ Chăm Sóc Tóc Cocoon',
  slug: 'bo-cham-soc-toc-cocoon-114573',
  primary_image_url: '/storage/catalog/products/114573/product.png',
  minimum_price: 616_000,
}

describe('customer header search', () => {
  it('debounces only the autocomplete endpoint and navigates a suggestion by slug', async () => {
    vi.useFakeTimers()
    apiGetMock.mockResolvedValue({ data: { data: [searchResult] } })
    const router = createSearchRouter()
    await router.push('/products')
    const wrapper = mount(CustomerSearch, { global: { plugins: [router] } })

    await wrapper.get('input').setValue('Cocoon')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()

    expect(apiGetMock).toHaveBeenCalledOnce()
    expect(apiGetMock).toHaveBeenCalledWith('/products/search', { params: { keyword: 'Cocoon' } })
    expect(apiGetMock).not.toHaveBeenCalledWith('/products', expect.anything())
    expect(wrapper.get('[role="option"]').text()).toContain('Bộ Chăm Sóc Tóc Cocoon')

    await wrapper.get('[role="option"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/products/bo-cham-soc-toc-cocoon-114573')
    wrapper.unmount()
  })

  it('submits a listing keyword query without starting autocomplete', async () => {
    vi.useFakeTimers()
    const router = createSearchRouter()
    await router.push('/products')
    const wrapper = mount(CustomerSearch, { global: { plugins: [router] } })

    await wrapper.get('input').setValue('  Cocoon  ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value).toMatchObject({
      path: '/products',
      query: { keyword: 'Cocoon', page: '1' },
    })
    expect(apiGetMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('supports keyboard navigation, Escape, and ignores stale autocomplete responses', async () => {
    vi.useFakeTimers()
    let resolveFirst: ((value: { data: { data: Array<typeof searchResult> } }) => void) | undefined
    const first = new Promise<{ data: { data: Array<typeof searchResult> } }>((resolve) => {
      resolveFirst = resolve
    })
    apiGetMock
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({ data: { data: [{ ...searchResult, id: 2, name: 'Cocoon mới', slug: 'cocoon-moi' }] } })
    const router = createSearchRouter()
    await router.push('/products')
    const wrapper = mount(CustomerSearch, { global: { plugins: [router] } })

    await wrapper.get('input').setValue('Co')
    await vi.advanceTimersByTimeAsync(250)
    await wrapper.get('input').setValue('Cocoon')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    resolveFirst?.({ data: { data: [{ ...searchResult, name: 'Kết quả cũ' }] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Cocoon mới')
    expect(wrapper.text()).not.toContain('Kết quả cũ')
    await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.get('input').trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.get('[role="option"]').attributes('aria-selected')).toBe('true')
    await wrapper.get('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-search-suggestions]').exists()).toBe(false)
    wrapper.unmount()
  })
})
