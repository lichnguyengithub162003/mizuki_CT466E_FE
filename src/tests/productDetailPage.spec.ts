import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import type {
  ProductDetailProductDto,
  ProductDetailResponseDto,
  ProductListingResponseDto,
} from '@/api/productListingApi'
import { adaptProductDetail } from '@/api/productListingAdapter'
import { pinia } from '@/stores/pinia'
import { useBranchPreferenceStore } from '@/stores/branchPreference'
import { useAuthStore } from '@/stores/auth'

const mocks = vi.hoisted(() => ({
  getProductDetail: vi.fn(),
  getProductListing: vi.fn(),
  followBrand: vi.fn(),
  unfollowBrand: vi.fn(),
}))
vi.mock('@/api/productListingApi', () => ({
  getProductDetail: mocks.getProductDetail,
  getProductListing: mocks.getProductListing,
  followBrand: mocks.followBrand,
  unfollowBrand: mocks.unfollowBrand,
}))

const slug = 'thuc-pham-bao-ve-suc-khoe-dhc-vitamin-b-mix-242388'
const detail: ProductDetailResponseDto = {
  success: true, message: 'OK', data: {
    product: {
      id: 2406, name: 'Thực Phẩm Bảo Vệ Sức Khỏe DHC Vitamin B Mix', slug,
      short_description: 'Gói 20 ngày uống', description: '<p>Mô tả sản phẩm thật.</p>', ingredients: '<p>Vitamin B.</p>', usage_instructions: '<p>Uống theo hướng dẫn.</p>',
      specifications: { spec_dung_tich: '40 viên' }, origin_country: 'Nhật Bản',
      images: [{ id: 1, image_url: 'http://localhost:8000/storage/catalog/products/242388/one.jpg', alt_text: 'DHC Vitamin B', sort_order: 0 }],
      gallery: [{ id: 1, image_url: 'http://localhost:8000/storage/catalog/products/242388/one.jpg', alt_text: 'DHC Vitamin B', sort_order: 0 }],
      variants: [{ id: 2421, name: 'Gói 20 ngày', sku: 'HS-242388', attributes: {}, price: 90000, sale_price: null, effective_price: 90000, total_available_quantity: 20, available: true }],
      prices: { minimum: 90000, maximum: 90000 }, rating: 3.2, review_count: 4,
      branch_availability: [{ variant_id: 2421, branch_id: 6, branch_name: 'Mizuki Vĩnh Long', available_quantity: 3 }],
      related_products: [],
    },
    brand: { id: 91, name: 'DHC', slug: 'dhc', logo_url: null, active_product_count: 22, average_rating: 4.9, review_count: 225, follower_count: 802 },
    reviews: [],
    qa: [],
  },
}
const listing: ProductListingResponseDto = {
  success: true,
  message: 'OK',
  data: [{
    id: 2407,
    name: 'Sản phẩm DHC liên quan',
    slug: 'san-pham-dhc-lien-quan',
    category: { id: 12, name: 'Thực phẩm bảo vệ sức khỏe', parent_id: null },
    brand: { id: 91, name: 'DHC' },
    primary_image: null,
    primary_image_url: null,
    price: 100000,
    original_price: null,
    minimum_price: 100000,
    has_discount: false,
    discount: null,
    rating: 4.5,
    review_count: 2,
    default_variant: null,
    availability: { available: true, available_quantity: 10 },
  }],
  meta: { pagination: { current_page: 1, per_page: 8, total: 1, last_page: 1 } },
}
const wrappers: VueWrapper[] = []

function detailResponse(
  productOverrides: Partial<ProductDetailProductDto> = {},
  rootOverrides: Partial<Omit<ProductDetailResponseDto['data'], 'product'>> = {},
): ProductDetailResponseDto {
  return {
    ...structuredClone(detail),
    data: {
      ...structuredClone(detail.data),
      ...rootOverrides,
      product: { ...structuredClone(detail.data.product), ...productOverrides },
    },
  }
}

async function mountDetail(path = `/products/${slug}`): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path); await router.isReady()
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
  wrappers.push(wrapper); await flushPromises()
  return { wrapper, router }
}

function authenticateCustomer(): void {
  useAuthStore(pinia).$patch({
    user: {
      id: 7,
      name: 'Khách hàng thử nghiệm',
      email: 'customer@example.com',
      phone: null,
      avatar: null,
      role: 'customer',
      role_label: 'Khách hàng',
      branch_id: null,
      email_verified_at: '2026-08-01T00:00:00Z',
      created_at: '2026-08-01T00:00:00Z',
    },
    isInitialized: true,
  })
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  useAuthStore(pinia).resetForTesting()
  useBranchPreferenceStore(pinia).$patch({ branches: [{ id: 6, code: 'MZ-VL', name: 'Mizuki Vĩnh Long', address: '', phone: null, email: null, is_active: true, opening_hours: [] }], selectedBranchId: 6, status: 'success', error: null })
  mocks.getProductDetail.mockReset(); mocks.getProductListing.mockReset(); mocks.followBrand.mockReset(); mocks.unfollowBrand.mockReset()
  mocks.getProductDetail.mockResolvedValue(detail); mocks.getProductListing.mockResolvedValue(listing)
  mocks.followBrand.mockResolvedValue({ follower_count: 803 }); mocks.unfollowBrand.mockResolvedValue({ follower_count: 802 })
})
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks() })

describe('customer product detail page', () => {
  it('loads the exact runtime slug from the real detail contract', async () => {
    const { wrapper, router } = await mountDetail()
    expect(router.currentRoute.value.path).toBe(`/products/${slug}`)
    expect(mocks.getProductDetail).toHaveBeenCalledWith(slug)
    expect(wrapper.get('[data-product-detail-page]').attributes('data-content-state')).toBe('success')
    expect(wrapper.get('h1').text()).toBe(detail.data.product.name)
    expect(wrapper.get('[data-detail-main-image]').attributes('src')).toContain('/storage/catalog/products/')
  })

  it('renders backend variant, selected-branch stock, and text-only rich content', async () => {
    const { wrapper } = await mountDetail()
    expect(wrapper.text()).toContain('Gói 20 ngày')
    expect(wrapper.text()).toContain('Sắp hết hàng')
    expect(wrapper.text()).toContain('Mô tả sản phẩm thật.')
    expect(wrapper.html()).not.toContain('<script')
  })

  it('keeps real gallery images in a controlled F4e frame and switches thumbnails', async () => {
    const testSlug = 'runtime-product-with-gallery'
    const firstUrl = 'http://localhost:8000/storage/catalog/products/runtime/one.jpg'
    const secondUrl = 'http://localhost:8000/storage/catalog/products/runtime/two.jpg'
    mocks.getProductDetail.mockResolvedValueOnce(detailResponse({
      slug: testSlug,
      images: [
        { id: 1, image_url: firstUrl, alt_text: 'Ảnh chính', sort_order: 0 },
        { id: 2, image_url: secondUrl, alt_text: 'Ảnh phụ', sort_order: 1 },
      ],
      gallery: [],
    }))

    const { wrapper } = await mountDetail(`/products/${testSlug}`)
    const frame = wrapper.get('[data-gallery-frame]')
    expect(frame.classes()).toEqual(expect.arrayContaining(['h-80', 'lg:h-[28rem]', 'xl:h-[30rem]']))
    expect(frame.classes()).toContain('bg-white')
    expect(frame.classes()).not.toContain('aspect-square')
    expect(frame.classes()).not.toContain('bg-gradient-to-br')
    const mainImage = wrapper.get('[data-detail-main-image]')
    expect(mainImage.attributes('src')).toBe(firstUrl)
    expect(mainImage.classes()).toEqual(expect.arrayContaining(['object-contain', 'p-2', 'sm:p-3']))

    const thumbnails = wrapper.findAll('[data-thumbnail-id]')
    expect(thumbnails).toHaveLength(2)
    expect(thumbnails.every((thumbnail) => thumbnail.classes().includes('bg-white'))).toBe(true)
    expect(thumbnails.every((thumbnail) => !thumbnail.classes().includes('bg-gradient-to-br'))).toBe(true)
    expect(thumbnails[0]!.get('img').classes()).toContain('p-0.5')
    await thumbnails[1]!.trigger('click')
    expect(wrapper.get('[data-detail-main-image]').attributes('src')).toBe(secondUrl)
  })

  it('uses the real backend brand ID in the listing link', async () => {
    const { wrapper } = await mountDetail()
    const href = wrapper.get('[data-brand-products-link]').attributes('href')
    expect(href).toContain('brand_id=91')
    expect(href).toContain('page=1')
    expect(href).not.toContain('brand=DHC')
  })

  it('maps root-level brand aggregates separately from product metrics', async () => {
    const adapted = adaptProductDetail(detail)
    expect(adapted.rating).toBe(3.2)
    expect(adapted.reviewCount).toBe(4)
    expect(adapted.brand).toMatchObject({
      id: 91,
      name: 'DHC',
      slug: 'dhc',
      logoUrl: undefined,
      productCount: 22,
      rating: 4.9,
      reviewCount: 225,
      followerCount: 802,
    })

    const { wrapper } = await mountDetail()
    expect(wrapper.get('[data-product-info]').text()).toContain('3.2')
    expect(wrapper.get('[data-product-info]').text()).toContain('4 đánh giá')
    expect(wrapper.get('[data-brand-active-product-count]').text()).toBe('22 sản phẩm')
    expect(wrapper.get('[data-brand-average-rating]').text()).toBe('4.9')
    expect(wrapper.get('[data-brand-review-count]').text()).toBe('225')
    expect(wrapper.get('[data-brand-follower-count]').text()).toBe('802')
  })

  it('restores the F4e hero and section-card layout without fixed content heights', async () => {
    const { wrapper } = await mountDetail()
    expect(wrapper.get('[data-product-hero]').classes()).toEqual(expect.arrayContaining([
      'grid',
      'items-start',
      'gap-8',
      'lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]',
    ]))
    expect(wrapper.get('[data-product-info]').classes()).toEqual(expect.arrayContaining([
      'rounded-[2rem]',
      'bg-white',
      'sm:p-6',
    ]))
    expect(wrapper.get('[data-shipping-summary]').classes()).toContain('items-center')
    expect(wrapper.get('[data-pickup-summary]').classes()).toContain('items-center')

    for (const selector of ['#description', '#ingredients', '#usage']) {
      const section = wrapper.get(selector)
      expect(section.classes()).toEqual(expect.arrayContaining(['rounded-[2rem]', 'bg-white', 'sm:p-8']))
      expect(section.classes().some((className) => className.startsWith('min-h-'))).toBe(false)
    }
    expect(wrapper.find('[data-usage-steps]').exists()).toBe(false)
    expect(wrapper.get('[data-usage-prose]').text()).toContain('Uống theo hướng dẫn.')
  })

  it('collapses a very long backend description without replacing its content', async () => {
    const testSlug = 'runtime-product-long-description'
    const longDescription = `Nội dung backend ${'rất dài '.repeat(120)}`
    mocks.getProductDetail.mockResolvedValueOnce(detailResponse({ slug: testSlug, description: longDescription }))
    const { wrapper } = await mountDetail(`/products/${testSlug}`)

    const content = wrapper.get('[data-description-content]')
    expect(content.text()).toContain(longDescription.trim())
    expect(content.classes()).toEqual(expect.arrayContaining(['max-h-64', 'overflow-hidden']))
    await wrapper.get('[data-description-toggle]').trigger('click')
    expect(wrapper.get('[data-description-content]').classes()).not.toContain('max-h-64')
    expect(wrapper.get('[data-description-toggle]').text()).toBe('Thu gọn')
  })

  it('does not invent sold count and uses the honest brand wordmark fallback', async () => {
    const { wrapper } = await mountDetail()
    expect(wrapper.find('[data-sold-count]').exists()).toBe(false)
    expect(wrapper.find('[data-brand-logo]').exists()).toBe(false)
    expect(wrapper.get('[data-brand-wordmark]').text()).toBe('D')
  })

  it('renders the root-level brand logo and keeps the brand action available', async () => {
    const testSlug = 'runtime-product-with-brand-logo'
    mocks.getProductDetail.mockResolvedValueOnce(detailResponse({ slug: testSlug }, {
      brand: {
        id: 91,
        name: 'DHC',
        slug: 'dhc',
        logo_url: 'catalog/brands/dhc.png',
        active_product_count: 22,
        average_rating: 4.9,
        review_count: 225,
        follower_count: 802,
      },
    }))

    const { wrapper } = await mountDetail(`/products/${testSlug}`)
    expect(wrapper.get('[data-brand-logo]').attributes('src')).toBe('http://localhost:8000/storage/catalog/brands/dhc.png')
    expect(wrapper.find('[data-brand-wordmark]').exists()).toBe(false)
    expect(wrapper.get('[data-brand-products-link]').attributes('href')).toContain('brand_id=91')
  })

  it('follows and unfollows the real brand ID while using response follower counts', async () => {
    authenticateCustomer()
    const { wrapper } = await mountDetail()
    const button = wrapper.get('[data-brand-follow-button]')

    expect(button.text()).toBe('Theo dõi')
    expect(wrapper.get('[data-brand-follower-count]').text()).toBe('802')

    await button.trigger('click')
    await flushPromises()
    expect(mocks.followBrand).toHaveBeenCalledWith(91)
    expect(wrapper.get('[data-brand-follower-count]').text()).toBe('803')
    expect(button.text()).toBe('Đã theo dõi')

    await button.trigger('click')
    await flushPromises()
    expect(mocks.unfollowBrand).toHaveBeenCalledWith(91)
    expect(wrapper.get('[data-brand-follower-count]').text()).toBe('802')
    expect(button.text()).toBe('Theo dõi')
  })

  it('disables follow while pending and preserves the API count after failure', async () => {
    authenticateCustomer()
    let resolveFollow: ((value: { follower_count: number }) => void) | undefined
    mocks.followBrand.mockReturnValueOnce(new Promise((resolve) => { resolveFollow = resolve }))
    const { wrapper } = await mountDetail()
    const button = wrapper.get('[data-brand-follow-button]')

    await button.trigger('click')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-brand-follower-count]').text()).toBe('802')

    resolveFollow?.({ follower_count: 804 })
    await flushPromises()
    expect(button.attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-brand-follower-count]').text()).toBe('804')

    mocks.unfollowBrand.mockRejectedValueOnce({
      name: 'ApplicationError',
      kind: 'server',
      message: 'Không thể bỏ theo dõi.',
    })
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-brand-follower-count]').text()).toBe('804')
    expect(button.text()).toBe('Đã theo dõi')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-brand-follow-feedback]').text()).toContain('Không thể bỏ theo dõi.')
  })

  it('renders real backend reviews and Q&A without demo substitutions', async () => {
    const testSlug = 'runtime-product-with-feedback'
    mocks.getProductDetail.mockResolvedValueOnce(detailResponse({
      slug: testSlug,
      rating: 4.5,
      review_count: 2,
    }, {
      reviews: [
        {
          id: 71,
          rating: 5,
          comment: 'Sản phẩm phù hợp với tôi.',
          customer_name: 'Nguyễn An',
          created_at: '2026-07-20',
          is_verified_purchase: true,
        },
        { id: 72, rating: 4, content: 'Đánh giá không kèm thông tin người gửi.' },
      ],
      qa: [
        {
          id: 81,
          question: 'Có thể dùng sau bữa sáng không?',
          answer: 'Có thể dùng theo hướng dẫn trên bao bì.',
          customer_name: 'Trần Bình',
          created_at: '2026-07-21',
          responder_name: 'Dược sĩ Minh',
          answered_at: '2026-07-22',
        },
        { id: 82, question: 'Sản phẩm này còn câu trả lời không?' },
      ],
    }))

    const { wrapper } = await mountDetail(`/products/${testSlug}`)
    const review = wrapper.get('[data-product-review]')
    expect(review.text()).toContain('Nguyễn An')
    expect(review.text()).toContain('Sản phẩm phù hợp với tôi.')
    expect(review.text()).toContain('2026-07-20')
    expect(review.text()).toContain('Đã mua hàng')
    expect(wrapper.findAll('[data-product-review]')).toHaveLength(2)
    expect(wrapper.find('[data-review-empty]').exists()).toBe(false)

    const question = wrapper.get('[data-product-question]')
    expect(question.text()).toContain('Có thể dùng sau bữa sáng không?')
    expect(question.text()).toContain('Có thể dùng theo hướng dẫn trên bao bì.')
    expect(question.text()).toContain('Trần Bình')
    expect(question.text()).toContain('2026-07-21')
    expect(question.text()).toContain('Dược sĩ Minh trả lời:')
    expect(question.text()).toContain('2026-07-22')
    expect(wrapper.findAll('[data-product-question]')).toHaveLength(2)
    expect(wrapper.find('[data-question-empty]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Khách hàng Mizuki')
    expect(wrapper.text()).not.toContain('Chưa có phản hồi.')
  })

  it('shows honest empty states when backend reviews and Q&A are empty', async () => {
    const testSlug = 'runtime-product-without-feedback'
    mocks.getProductDetail.mockResolvedValueOnce(detailResponse({
      slug: testSlug,
      rating: 0,
      review_count: 0,
    }, {
      reviews: [],
      qa: [],
    }))

    const { wrapper } = await mountDetail(`/products/${testSlug}`)
    expect(wrapper.get('[data-review-empty]').text()).toContain('Chưa có nội dung đánh giá')
    expect(wrapper.find('[data-review-summary]').exists()).toBe(false)
    expect(wrapper.get('[data-question-empty]').text()).toContain('Chưa có câu hỏi nào')
    expect(wrapper.find('[data-product-review]').exists()).toBe(false)
    expect(wrapper.find('[data-product-question]').exists()).toBe(false)
  })

  it('uses the normal not-found state when the backend detail request fails', async () => {
    mocks.getProductDetail.mockRejectedValueOnce(new Error('not found'))
    const { wrapper } = await mountDetail('/products/slug-khong-ton-tai')
    expect(wrapper.get('[data-detail-error]').attributes('data-detail-error')).toBe('')
  })
})
