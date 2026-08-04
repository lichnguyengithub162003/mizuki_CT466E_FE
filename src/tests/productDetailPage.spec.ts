import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import type { ProductDetailResponseDto, ProductListingResponseDto } from '@/api/productListingApi'
import { pinia } from '@/stores/pinia'
import { useBranchPreferenceStore } from '@/stores/branchPreference'

const mocks = vi.hoisted(() => ({ getProductDetail: vi.fn(), getProductListing: vi.fn() }))
vi.mock('@/api/productListingApi', () => ({ getProductDetail: mocks.getProductDetail, getProductListing: mocks.getProductListing }))

const slug = 'thuc-pham-bao-ve-suc-khoe-dhc-vitamin-b-mix-242388'
const detail: ProductDetailResponseDto = {
  success: true, message: 'OK', data: {
    id: 2406, name: 'Thực Phẩm Bảo Vệ Sức Khỏe DHC Vitamin B Mix', slug,
    short_description: 'Gói 20 ngày uống', description: '<p>Mô tả sản phẩm thật.</p>', ingredients: '<p>Vitamin B.</p>', usage_instructions: '<p>Uống theo hướng dẫn.</p>',
    specifications: { spec_dung_tich: '40 viên' }, origin_country: 'Nhật Bản', brand: { id: 91, name: 'DHC' },
    images: [{ id: 1, image_url: 'http://localhost:8000/storage/catalog/products/242388/one.jpg', alt_text: 'DHC Vitamin B', sort_order: 0 }],
    gallery: [{ id: 1, image_url: 'http://localhost:8000/storage/catalog/products/242388/one.jpg', alt_text: 'DHC Vitamin B', sort_order: 0 }],
    variants: [{ id: 2421, name: 'Gói 20 ngày', sku: 'HS-242388', attributes: {}, price: 90000, sale_price: null, effective_price: 90000, total_available_quantity: 20, available: true }],
    prices: { minimum: 90000, maximum: 90000 }, rating: 0, review_count: 0,
    branch_availability: [{ variant_id: 2421, branch_id: 6, branch_name: 'Mizuki Vĩnh Long', available_quantity: 3 }],
    related_products: [], reviews: [], questions_and_answers: [],
  },
}
const listing: ProductListingResponseDto = { success: true, message: 'OK', data: [], meta: { pagination: { current_page: 1, per_page: 8, total: 0, last_page: 1 } } }
const wrappers: VueWrapper[] = []

async function mountDetail(path = `/products/${slug}`): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path); await router.isReady()
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
  wrappers.push(wrapper); await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  useBranchPreferenceStore(pinia).$patch({ branches: [{ id: 6, code: 'MZ-VL', name: 'Mizuki Vĩnh Long', address: '', phone: null, email: null, is_active: true, opening_hours: [] }], selectedBranchId: 6, status: 'success', error: null })
  mocks.getProductDetail.mockReset(); mocks.getProductListing.mockReset()
  mocks.getProductDetail.mockResolvedValue(detail); mocks.getProductListing.mockResolvedValue(listing)
})
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks() })

describe('customer product detail page', () => {
  it('loads the exact runtime slug from the real detail contract', async () => {
    const { wrapper, router } = await mountDetail()
    expect(router.currentRoute.value.path).toBe(`/products/${slug}`)
    expect(mocks.getProductDetail).toHaveBeenCalledWith(slug)
    expect(wrapper.get('[data-product-detail-page]').attributes('data-content-state')).toBe('success')
    expect(wrapper.get('h1').text()).toBe(detail.data.name)
    expect(wrapper.get('[data-detail-main-image]').attributes('src')).toContain('/storage/catalog/products/')
  })

  it('renders backend variant, selected-branch stock, and text-only rich content', async () => {
    const { wrapper } = await mountDetail()
    expect(wrapper.text()).toContain('Gói 20 ngày')
    expect(wrapper.text()).toContain('Sắp hết hàng')
    expect(wrapper.text()).toContain('Mô tả sản phẩm thật.')
    expect(wrapper.html()).not.toContain('<script')
  })

  it('uses the normal not-found state when the backend detail request fails', async () => {
    mocks.getProductDetail.mockRejectedValueOnce(new Error('not found'))
    const { wrapper } = await mountDetail('/products/slug-khong-ton-tai')
    expect(wrapper.get('[data-detail-error]').attributes('data-detail-error')).toBe('')
  })
})
