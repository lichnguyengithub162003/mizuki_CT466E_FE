import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import type { ProductListingResponseDto } from '@/api/productListingApi'
import {
  adaptProductDetail,
  type ProductDetailSourceResponseDto,
} from '@/api/productListingAdapter'
import { pinia } from '@/stores/pinia'
import { useBranchPreferenceStore } from '@/stores/branchPreference'
import { useAuthStore } from '@/stores/auth'

const mocks = vi.hoisted(() => ({
  getProductDetail: vi.fn(),
  getProductListing: vi.fn(),
  getProductReviews: vi.fn(),
  followBrand: vi.fn(),
  unfollowBrand: vi.fn(),
}))
const cartMocks = vi.hoisted(() => ({
  getCustomerCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  selectCartBranch: vi.fn(),
}))
const favoriteMocks = vi.hoisted(() => ({
  getCustomerFavorites: vi.fn(),
  addCustomerFavorite: vi.fn(),
  removeCustomerFavorite: vi.fn(),
}))
vi.mock('@/api/productListingApi', () => ({
  getProductDetail: mocks.getProductDetail,
  getProductListing: mocks.getProductListing,
  getProductReviews: mocks.getProductReviews,
  followBrand: mocks.followBrand,
  unfollowBrand: mocks.unfollowBrand,
}))
vi.mock('@/api/cartApi', () => cartMocks)
vi.mock('@/api/favoritesApi', () => favoriteMocks)

const slug = 'thuc-pham-bao-ve-suc-khoe-dhc-vitamin-b-mix-242388'
const detail: ProductDetailSourceResponseDto = {
  success: true, message: 'OK', data: {
    product: {
      id: 2406, name: 'Thực Phẩm Bảo Vệ Sức Khỏe DHC Vitamin B Mix', slug,
      short_description: 'Gói 20 ngày uống', description: '<p>Mô tả sản phẩm thật.</p>', ingredients: '<p>Vitamin B.</p>', usage_instructions: '<p>Uống theo hướng dẫn.</p>',
    },
    specifications: { spec_dung_tich: '40 viên' }, origin_country: 'Nhật Bản',
    brand: { id: 91, name: 'DHC', slug: 'dhc', logo_url: null, active_product_count: 22, average_rating: 4.9, review_count: 225, follower_count: 802 },
    images: [{ id: 1, image_url: 'http://localhost:8000/storage/catalog/products/242388/one.jpg', alt_text: 'DHC Vitamin B', sort_order: 0 }],
    gallery: [{ id: 1, image_url: 'http://localhost:8000/storage/catalog/products/242388/one.jpg', alt_text: 'DHC Vitamin B', sort_order: 0 }],
    variants: [{ id: 2421, name: 'Gói 20 ngày', sku: 'HS-242388', attributes: {}, price: 90000, sale_price: null, effective_price: 90000, total_available_quantity: 20, available: true }],
    prices: { minimum: 90000, maximum: 90000 }, rating: 3.2, review_count: 4,
    branch_availability: [{ variant_id: 2421, branch_id: 6, branch_name: 'Mizuki Vĩnh Long', available_quantity: 3 }],
    related_products: [],
    reviews: [],
    questions_and_answers: [],
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
    availability: { available: true, available_quantity: 10, stock_state: 'available' },
  }],
  meta: { pagination: { current_page: 1, per_page: 8, total: 1, last_page: 1 } },
}
const wrappers: VueWrapper[] = []

function detailResponse(
  productOverrides: Partial<ProductDetailSourceResponseDto['data']['product']> = {},
  rootOverrides: Partial<Omit<ProductDetailSourceResponseDto['data'], 'product'>> = {},
): ProductDetailSourceResponseDto {
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

function authenticateCustomer(id = 7): void {
  useAuthStore(pinia).$patch({
    user: {
      id,
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
  window.localStorage.setItem('mizuki:selected-branch-id', '6')
  useBranchPreferenceStore(pinia).$patch({ branches: [{ id: 6, code: 'MZ-VL', name: 'Mizuki Vĩnh Long', address: '', phone: null, email: null, is_active: true, opening_hours: [] }], selectedBranchId: 6, status: 'success', error: null })
  mocks.getProductDetail.mockReset(); mocks.getProductListing.mockReset(); mocks.getProductReviews.mockReset(); mocks.followBrand.mockReset(); mocks.unfollowBrand.mockReset()
  cartMocks.getCustomerCart.mockReset(); cartMocks.addCartItem.mockReset(); cartMocks.updateCartItem.mockReset(); cartMocks.removeCartItem.mockReset(); cartMocks.selectCartBranch.mockReset()
  favoriteMocks.getCustomerFavorites.mockReset(); favoriteMocks.addCustomerFavorite.mockReset(); favoriteMocks.removeCustomerFavorite.mockReset()
  mocks.getProductDetail.mockResolvedValue(detail); mocks.getProductListing.mockResolvedValue(listing)
  mocks.getProductReviews.mockResolvedValue({ success: true, message: 'OK', data: { summary: { average_rating: 0, total_reviews: 0, rating_distribution: {} }, reviews: [] }, meta: { pagination: { current_page: 1, per_page: 3, total: 0, last_page: 1 } } })
  cartMocks.getCustomerCart.mockResolvedValue({ id: 1, totalQuantity: 0, totalAmount: 0, discountAmount: 0, totalAfterDiscount: 0, items: [] })
  favoriteMocks.getCustomerFavorites.mockResolvedValue([])
  favoriteMocks.addCustomerFavorite.mockResolvedValue({ productId: 2406, name: detail.data.product.name, slug, minimumPrice: 90000 })
  favoriteMocks.removeCustomerFavorite.mockResolvedValue(undefined)
  mocks.followBrand.mockResolvedValue({ follower_count: 803 }); mocks.unfollowBrand.mockResolvedValue({ follower_count: 802 })
})
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; window.localStorage.removeItem('mizuki:selected-branch-id'); vi.restoreAllMocks() })

describe('customer product detail page', () => {
  it('loads the exact runtime slug from the real detail contract', async () => {
    const { wrapper, router } = await mountDetail()
    expect(router.currentRoute.value.path).toBe(`/products/${slug}`)
    expect(mocks.getProductDetail).toHaveBeenCalledWith(slug)
    expect(wrapper.get('[data-product-detail-page]').attributes('data-content-state')).toBe('success')
    expect(wrapper.get('h1').text()).toBe(detail.data.product.name)
    expect(wrapper.get('[data-detail-main-image]').attributes('src')).toContain('/storage/catalog/products/')
  })

  it('adds and removes the current product through the real favorites contract', async () => {
    authenticateCustomer(701)
    const { wrapper } = await mountDetail()
    const addButton = wrapper.get('button[aria-label="Thêm vào yêu thích"]')

    await addButton.trigger('click')
    await flushPromises()
    expect(favoriteMocks.addCustomerFavorite.mock.calls[0]?.[0]).toBe(2406)
    expect(wrapper.get('button[aria-label="Bỏ khỏi yêu thích"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('button[aria-label="Bỏ khỏi yêu thích"]').trigger('click')
    await flushPromises()
    expect(favoriteMocks.removeCustomerFavorite.mock.calls[0]?.[0]).toBe(2406)
    expect(wrapper.get('button[aria-label="Thêm vào yêu thích"]').attributes('aria-pressed')).toBe('false')
  })

  it('keeps the confirmed favorite state when the Detail remove request fails', async () => {
    authenticateCustomer(702)
    favoriteMocks.getCustomerFavorites.mockResolvedValueOnce([{ productId: 2406, name: detail.data.product.name, slug, minimumPrice: 90000 }])
    favoriteMocks.removeCustomerFavorite.mockRejectedValueOnce(new Error('Không thể bỏ yêu thích lúc này'))
    const { wrapper } = await mountDetail()

    await wrapper.get('button[aria-label="Bỏ khỏi yêu thích"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('button[aria-label="Bỏ khỏi yêu thích"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[role="alert"]').text()).toContain('Không thể bỏ yêu thích lúc này')
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
    }, {
      images: [
        { id: 1, image_url: firstUrl, alt_text: 'Ảnh chính', sort_order: 0 },
        { id: 2, image_url: secondUrl, alt_text: 'Ảnh phụ', sort_order: 1 },
      ],
      gallery: [],
    }))

    const { wrapper } = await mountDetail(`/products/${testSlug}`)
    const frame = wrapper.get('[data-gallery-frame]')
    expect(frame.classes()).toEqual(expect.arrayContaining(['h-72', 'sm:h-80', 'lg:h-[25rem]', 'xl:h-[27rem]']))
    expect(frame.classes()).toContain('bg-white')
    expect(frame.classes()).not.toContain('aspect-square')
    expect(frame.classes()).not.toContain('bg-gradient-to-br')
    const mainImage = wrapper.get('[data-detail-main-image]')
    expect(mainImage.attributes('src')).toBe(firstUrl)
    expect(mainImage.classes()).toEqual(expect.arrayContaining(['object-contain', 'p-2', 'sm:p-2.5']))

    const thumbnails = wrapper.findAll('[data-thumbnail-id]')
    expect(thumbnails).toHaveLength(2)
    expect(thumbnails.every((thumbnail) => thumbnail.classes().includes('bg-white'))).toBe(true)
    expect(thumbnails.every((thumbnail) => !thumbnail.classes().includes('bg-gradient-to-br'))).toBe(true)
    expect(thumbnails[0]!.get('img').classes()).toContain('p-1')
    await thumbnails[1]!.trigger('click')
    expect(wrapper.get('[data-detail-main-image]').attributes('src')).toBe(secondUrl)
  })

  it('uses the real backend brand ID in the listing link', async () => {
    const { wrapper } = await mountDetail()
    const href = wrapper.get('[data-brand-products-link]').attributes('href')
    expect(href).toBe('/brand/dhc')
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
      'gap-0',
      'lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]',
    ]))
    expect(wrapper.get('[data-product-info]').classes()).toEqual(expect.arrayContaining([
      'rounded-4xl',
      'bg-white',
      'sm:p-6',
    ]))
    expect(wrapper.get('[data-shipping-summary]').classes()).toContain('items-start')
    expect(wrapper.find('[data-pickup-summary]').exists()).toBe(false)

    for (const selector of ['#description', '#ingredients', '#usage']) {
      const section = wrapper.get(selector)
      expect(section.classes()).toEqual(expect.arrayContaining(['rounded-4xl', 'bg-white', 'sm:p-8']))
      expect(section.classes().some((className) => className.startsWith('min-h-'))).toBe(false)
    }
    expect(wrapper.find('[data-usage-steps]').exists()).toBe(false)
    expect(wrapper.get('#usage').text()).toContain('Uống theo hướng dẫn.')
  })

  it('collapses a very long backend description without replacing its content', async () => {
    const testSlug = 'runtime-product-long-description'
    const longDescription = `Nội dung backend ${'rất dài '.repeat(120)}`
    mocks.getProductDetail.mockResolvedValueOnce(detailResponse({ slug: testSlug, description: longDescription }))
    const { wrapper } = await mountDetail(`/products/${testSlug}`)

    const content = wrapper.get('[data-description-content]')
    expect(content.text()).toContain(longDescription.trim())
    expect(content.classes()).toEqual(expect.arrayContaining(['max-h-80', 'overflow-hidden']))
    const toggle = wrapper.findAll('button').find((button) => button.text() === 'Xem thêm')
    expect(toggle).toBeDefined()
    await toggle?.trigger('click')
    expect(wrapper.get('[data-description-content]').classes()).not.toContain('max-h-80')
  })

  it('does not invent sold count and uses the honest brand wordmark fallback', async () => {
    const { wrapper } = await mountDetail()
    expect(wrapper.find('[data-sold-count]').exists()).toBe(false)
    expect(wrapper.find('[data-brand-logo]').exists()).toBe(false)
    expect(wrapper.get('[data-brand-wordmark]').text()).toBe('D')
  })

  it('does not subtract a matching variant already in a cart for another branch', async () => {
    authenticateCustomer(710)
    cartMocks.getCustomerCart.mockResolvedValueOnce({
      id: 1,
      branch: { id: 5, name: 'Mizuki Cần Thơ', address: 'Cần Thơ' },
      totalQuantity: 20,
      totalAmount: 1800000,
      discountAmount: 0,
      totalAfterDiscount: 1800000,
      items: [{
        id: 1,
        product: { id: 2406, name: detail.data.product.name, slug },
        variant: { id: 2421, name: 'Gói 20 ngày', sku: 'HS-242388', effectivePrice: 90000 },
        quantity: 20,
        subtotal: 1800000,
        availableQuantity: 20,
        stockWarning: false,
      }],
    })
    const { wrapper } = await mountDetail()

    expect(wrapper.get('button[aria-label="Tăng số lượng"]').attributes('disabled')).toBeUndefined()
  })

  it('uses selected-branch variant inventory minus the same cart line quantity', async () => {
    authenticateCustomer(711)
    cartMocks.getCustomerCart.mockResolvedValueOnce({
      id: 1,
      branch: { id: 6, name: 'Mizuki Vĩnh Long', address: 'Vĩnh Long' },
      totalQuantity: 2,
      totalAmount: 180000,
      discountAmount: 0,
      totalAfterDiscount: 180000,
      items: [{
        id: 1,
        product: { id: 2406, name: detail.data.product.name, slug },
        variant: { id: 2421, name: 'Gói 20 ngày', sku: 'HS-242388', effectivePrice: 90000 },
        quantity: 2,
        subtotal: 180000,
        availableQuantity: 3,
        stockWarning: false,
      }],
    })
    const { wrapper } = await mountDetail()

    expect(adaptProductDetail(detail).branches[0]?.availableQuantity).toBe(3)
    expect(wrapper.get('button[aria-label="Tăng số lượng"]').attributes('disabled')).toBeDefined()
  })

  it('shows the backend inventory validation detail when adding to cart fails', async () => {
    authenticateCustomer(712)
    cartMocks.addCartItem.mockRejectedValueOnce({
      message: 'Dữ liệu không hợp lệ',
      validationErrors: {
        quantity: ['Số lượng sản phẩm bạn chọn vượt quá số lượng tồn kho của chi nhánh.'],
      },
    })
    const { wrapper } = await mountDetail()

    await wrapper.findAll('button').find((button) => button.text().includes('Thêm vào giỏ'))?.trigger('click')
    await flushPromises()

    expect(cartMocks.addCartItem).toHaveBeenCalledWith(2421, 1)
    expect(wrapper.text()).toContain('Số lượng sản phẩm bạn chọn vượt quá số lượng tồn kho của chi nhánh.')
  })

  it('shows a non-blocking success toast after adding a detail variant to the server cart', async () => {
    authenticateCustomer(713)
    cartMocks.addCartItem.mockResolvedValueOnce({ id: 1, totalQuantity: 1, totalAmount: 90000, discountAmount: 0, totalAfterDiscount: 90000, items: [] })
    const { wrapper } = await mountDetail()

    await wrapper.findAll('button').find((button) => button.text().includes('Thêm vào giỏ'))?.trigger('click')
    await flushPromises()

    expect(cartMocks.addCartItem).toHaveBeenCalledWith(2421, 1)
    expect(document.body.textContent).toContain('Đã thêm sản phẩm vào giỏ hàng.')
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
    expect(wrapper.get('[data-brand-products-link]').attributes('href')).toBe('/brand/dhc')
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
    }, {
      rating: 4.5,
      review_count: 2,
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
      questions_and_answers: [
        {
          id: 81,
          question: 'Có thể dùng sau bữa sáng không?',
          author: 'Trần Bình',
          date: '2026-07-21',
          answers: [{ id: 1, text: 'Có thể dùng theo hướng dẫn trên bao bì.', author: 'Dược sĩ Minh', date: '2026-07-22' }],
        },
        { id: 82, question: 'Sản phẩm này còn câu trả lời không?' },
      ],
    }))
    mocks.getProductReviews.mockResolvedValueOnce({ success: true, message: 'OK', data: {
      summary: { average_rating: 4.5, total_reviews: 2, rating_distribution: { '5': 1, '4': 1 } },
      reviews: [
        { id: 71, customer: { id: 1, display_name: 'Nguyễn An', avatar_url: null }, rating: 5, content: 'Sản phẩm phù hợp với tôi.', reviewed_at: '2026-07-20', verified_purchase: true },
        { id: 72, customer: { id: null, display_name: null, avatar_url: null }, rating: 4, content: 'Đánh giá không kèm thông tin người gửi.', reviewed_at: null, verified_purchase: false },
      ],
    }, meta: { pagination: { current_page: 1, per_page: 3, total: 2, last_page: 1 } } })

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
    expect(question.text()).toContain('Dược sĩ Minh trả lời')
    expect(question.text()).toContain('2026-07-22')
    expect(wrapper.findAll('[data-product-question]')).toHaveLength(2)
    expect(wrapper.find('[data-question-empty]').exists()).toBe(false)
    expect(wrapper.get('[data-product-review]').text()).toContain('Nguyễn An')
    expect(wrapper.text()).not.toContain('Chưa có phản hồi.')
  })

  it('shows honest empty states when backend reviews and Q&A are empty', async () => {
    const testSlug = 'runtime-product-without-feedback'
    mocks.getProductDetail.mockResolvedValueOnce(detailResponse({
      slug: testSlug,
    }, {
      rating: 0,
      review_count: 0,
      reviews: [],
      questions_and_answers: [],
    }))

    const { wrapper } = await mountDetail(`/products/${testSlug}`)
    expect(wrapper.get('[data-review-empty]').text()).toContain('Chưa có đánh giá phù hợp')
    expect(wrapper.get('[data-review-summary]').text()).toContain('0 lượt đánh giá')
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
