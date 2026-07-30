import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import { productListingProducts } from '@/data/products/productListingDemoData'
import { createAppRouter } from '@/router'

interface MountedProductDetail {
  readonly wrapper: VueWrapper
  readonly router: Router
}

const mountedWrappers: VueWrapper[] = []
const firstProduct = productListingProducts[0]!

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

async function mountRoute(path = `/products/${firstProduct.slug}`): Promise<MountedProductDetail> {
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
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.stubGlobal('matchMedia', createMatchMedia(false))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('fetch', vi.fn())
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('customer product detail page', () => {
  it(
    'renders the dynamic product route with local catalog content',
    async () => {
      const { wrapper, router } = await mountRoute()

      expect(router.currentRoute.value.path).toBe(`/products/${firstProduct.slug}`)
      expect(wrapper.get('[data-product-detail-page]').attributes('data-content-state')).toBe('success')
      expect(wrapper.get('h1').text()).toBe(firstProduct.name)
      expect(wrapper.text()).toContain(firstProduct.brand)
      expect(wrapper.findAll('[data-product-gallery] button')).toHaveLength(5)
    },
    10_000,
  )

  it('navigates from a listing card to detail without a document navigation', async () => {
    const { wrapper, router } = await mountRoute('/products')
    const firstCard = wrapper.findAll('[data-listing-product]')[0]
    const actionButtons = firstCard?.findAll('button') ?? []

    await actionButtons.at(-1)?.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('product-detail')
    expect(router.currentRoute.value.params.slug).toBe(firstProduct.slug)
    expect(wrapper.find('[data-product-detail-page]').exists()).toBe(true)
  })

  it('switches the main gallery visual from accessible thumbnails', async () => {
    const { wrapper } = await mountRoute()
    const gallery = wrapper.get('[data-product-gallery]')

    expect(gallery.get('[role="img"]').attributes('data-main-image-id')).toBe('front')
    await gallery.get('[data-thumbnail-id="routine"]').trigger('click')

    expect(gallery.get('[role="img"]').attributes('data-main-image-id')).toBe('routine')
    expect(gallery.get('[data-thumbnail-id="routine"]').attributes('aria-pressed')).toBe('true')
  })

  it('constrains quantity and disables purchase for an unavailable variant', async () => {
    const { wrapper } = await mountRoute()
    const quantity = wrapper.get<HTMLOutputElement>('#product-quantity')

    await wrapper.get('button[aria-label="Tăng số lượng"]').trigger('click')
    expect(quantity.text()).toBe('2')
    await wrapper.get('button[aria-label="Giảm số lượng"]').trigger('click')
    expect(quantity.text()).toBe('1')
    expect(wrapper.find('input[type="number"]').exists()).toBe(false)

    await wrapper.get('input[value="473ml"]').setValue(true)
    expect(wrapper.get('[data-stock-state]').attributes('data-stock-state')).toBe('out-of-stock')
    expect(wrapper.get('[data-stock-state]').text()).toContain('tạm hết hàng')

    const purchaseButtons = wrapper.findAll('button').filter((button) =>
      ['Thêm vào giỏ', 'Mua ngay'].includes(button.text()),
    )
    expect(purchaseButtons).toHaveLength(2)
    expect(purchaseButtons.every((button) => button.attributes('disabled') !== undefined)).toBe(true)
  })

  it('keeps purchase contrast, quantity spacing, and a red filled favorite state', async () => {
    const { wrapper } = await mountRoute()
    const buyButton = wrapper.findAll('button').find((button) => button.text() === 'Mua ngay')

    expect(buyButton?.classes()).toContain('!text-white')
    expect(wrapper.get('[data-quantity-control]').classes()).toEqual(expect.arrayContaining([
      'flex',
      'items-center',
      'gap-3',
    ]))

    const favorite = wrapper.get('button[aria-label="Thêm vào yêu thích"]')
    await favorite.trigger('click')

    const likedFavorite = wrapper.get('button[aria-label="Bỏ khỏi yêu thích"]')
    expect(likedFavorite.attributes('aria-pressed')).toBe('true')
    expect(likedFavorite.classes()).toContain('text-[#c43d38]')
    expect(likedFavorite.get('svg').classes()).toEqual(expect.arrayContaining([
      'fill-current',
      'text-[#c43d38]',
    ]))
  })

  it('renders a complete brand summary with local follow behavior and SPA navigation', async () => {
    const { wrapper, router } = await mountRoute()
    const brand = wrapper.get('[data-brand-summary]')
    const brandBar = brand.get('[data-brand-summary-bar]')

    expect(brand.get('#brand-heading').text()).toBe(firstProduct.brand)
    expect(brand.text()).toContain('OFFICIAL')
    expect(brand.text()).toContain('Xuất xứ Pháp')
    expect(brand.text()).toContain('4.8')
    expect(brand.text()).toContain('2.460')
    expect(brand.text()).toContain('128 sản phẩm')
    expect(brandBar.findAll('[data-brand-group]')).toHaveLength(4)
    const brandGroupOrder = brandBar.findAll('[data-brand-group]').map((group) =>
      group.attributes('data-brand-group'),
    )
    expect(brandGroupOrder).toEqual(['identity', 'actions', 'products', 'rating'])
    expect(brandBar.classes()).toEqual(expect.arrayContaining([
      'flex',
      'flex-col',
      'md:flex-row',
      'md:flex-wrap',
      'md:justify-start',
      'xl:flex-nowrap',
    ]))
    expect(brandBar.classes()).not.toContain('justify-between')
    expect(brandBar.classes()).not.toContain('ml-auto')
    expect(brandBar.findAll('[data-brand-group]').every((group) =>
      group.classes().includes('flex-none'),
    )).toBe(true)

    const identityGroup = brandBar.get('[data-brand-group="identity"]')
    const actionsGroup = brandBar.get('[data-brand-group="actions"]')
    const ratingGroup = brandBar.get('[data-brand-group="rating"]')
    const productsGroup = brandBar.get('[data-brand-group="products"]')
    expect(brandGroupOrder.indexOf('products')).toBeLessThan(
      brandGroupOrder.indexOf('rating'),
    )

    expect(identityGroup.get('[data-official-badge]').attributes('aria-label')).toBe(
      'Thương hiệu chính hãng',
    )
    expect(identityGroup.get('[data-official-badge]').classes()).toContain('text-[#1769aa]')
    expect(identityGroup.get('[data-official-badge] svg').classes()).toContain('text-[#1769aa]')
    expect(actionsGroup.text()).toContain('Xem thương hiệu')
    expect(actionsGroup.text()).toContain('Theo dõi')
    expect(actionsGroup.classes()).toEqual(expect.arrayContaining(['flex-col', 'items-stretch']))
    expect(actionsGroup.findAll('a, button').map((action) => action.text())).toEqual([
      'Xem thương hiệu',
      'Theo dõi',
    ])
    expect(ratingGroup.text()).toContain('Đánh giá:')
    expect(ratingGroup.text()).toContain('4.8')
    expect(ratingGroup.text()).toContain('Lượt đánh giá:')
    expect(ratingGroup.text()).toContain('2.460')
    expect(productsGroup.text()).toContain('Đang bày bán')
    expect(productsGroup.text()).toContain('128 sản phẩm')
    expect(brand.find('[data-brand-stats]').exists()).toBe(false)
    expect(brand.find('[data-brand-stat]').exists()).toBe(false)
    expect(brand.text()).not.toContain('Thương hiệu chăm sóc cá nhân chú trọng')

    const follow = actionsGroup.get('button[aria-pressed="false"]')
    await follow.trigger('click')
    expect(actionsGroup.get('button[aria-pressed="true"]').text()).toBe('Đang theo dõi')

    await actionsGroup.get('a').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/products')
    expect(router.currentRoute.value.query.brand).toBe(firstProduct.brand)
  })

  it('keeps section navigation wired to every long-form content section', async () => {
    const { wrapper } = await mountRoute()
    const navigation = wrapper.get('[data-detail-section-nav]')
    const expectedIds = [
      'description',
      'ingredients',
      'usage',
      'specifications',
      'reviews',
      'questions',
      'branches',
    ]

    expect(navigation.findAll('a')).toHaveLength(expectedIds.length)
    expectedIds.forEach((id) => {
      expect(navigation.find(`a[href="#${id}"]`).exists()).toBe(true)
      const section = wrapper.get(`#${id}`)
      expect(section.classes()).toEqual(expect.arrayContaining(['scroll-mt-32', 'md:scroll-mt-36']))
      expect(section.attributes('data-detail-scroll-section')).toBe('')
    })

    await navigation.get('a[href="#questions"]').trigger('click')
    expect(navigation.get('a[href="#questions"]').attributes('aria-current')).toBe('location')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledOnce()

    await navigation.get('a[href="#ingredients"]').trigger('keydown', { key: 'Enter' })
    expect(navigation.get('a[href="#ingredients"]').attributes('aria-current')).toBe('location')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2)
  })

  it('renders review distribution, Q&A, branch stock states, and recommendations', async () => {
    const { wrapper } = await mountRoute()

    expect(wrapper.get('[data-review-section]').text()).toContain('Đánh giá từ khách hàng')
    expect(wrapper.get('[data-question-section]').text()).toContain('Mizuki trả lời')
    expect(wrapper.findAll('[data-branch-stock]')).toHaveLength(6)
    expect(wrapper.find('[data-branch-stock="available"]').exists()).toBe(true)
    expect(wrapper.find('[data-branch-stock="low-stock"]').exists()).toBe(true)
    expect(wrapper.find('[data-branch-stock="out-of-stock"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-suggested-product]')).toHaveLength(8)
    expect(wrapper.get('[data-suggestion-carousel] a').attributes('href')).toBe('/products')
  })

  it('renders branch availability as one responsive carousel row with local controls', async () => {
    const { wrapper } = await mountRoute()
    const carousel = wrapper.get('[data-branch-carousel]')
    const header = carousel.get('[data-branch-carousel-header]')
    const controls = carousel.get('[data-branch-carousel-controls]')
    const row = carousel.get('[data-branch-carousel-row]')
    const cards = row.findAll('[data-branch-card]')
    const previous = carousel.get('button[aria-label="Xem chi nhánh trước"]')
    const next = carousel.get('button[aria-label="Xem chi nhánh tiếp theo"]')

    expect(carousel.attributes('role')).toBe('region')
    expect(carousel.attributes('aria-label')).toBe('Tình trạng sản phẩm tại các chi nhánh')
    expect(header.text()).toContain('Chi nhánh còn hàng')
    expect(header.classes()).toEqual(expect.arrayContaining([
      'flex',
      'flex-nowrap',
      'items-center',
      'justify-between',
    ]))
    expect(header.classes()).not.toContain('flex-wrap')
    expect(controls.element.parentElement).toBe(header.element)
    expect(header.find('button[aria-label="Xem chi nhánh trước"]').exists()).toBe(true)
    expect(header.find('button[aria-label="Xem chi nhánh tiếp theo"]').exists()).toBe(true)
    expect(row.element.previousElementSibling).toBe(header.element)
    expect(row.classes()).toContain('mt-4')
    expect(cards).toHaveLength(6)
    expect(row.classes()).toEqual(expect.arrayContaining([
      'flex',
      'flex-nowrap',
      'snap-x',
      'overflow-x-auto',
    ]))
    expect(row.classes()).not.toContain('grid')
    expect(row.classes()).not.toContain('flex-wrap')
    expect(cards[0]?.classes()).toEqual(expect.arrayContaining([
      'basis-[82%]',
      'md:basis-[calc((100%_-_0.75rem)/2)]',
      'lg:basis-[calc((100%_-_1.5rem)/3)]',
    ]))
    expect(previous.attributes('disabled')).toBeDefined()
    expect(next.attributes('disabled')).toBeUndefined()

    await next.trigger('click')
    expect(carousel.attributes('data-active-index')).toBe('1')
    expect(previous.attributes('disabled')).toBeUndefined()

    await row.trigger('keydown', { key: 'ArrowRight' })
    expect(carousel.attributes('data-active-index')).toBe('2')

    await previous.trigger('click')
    expect(carousel.attributes('data-active-index')).toBe('1')

    for (let index = 1; index < 5; index += 1) {
      await next.trigger('click')
    }
    expect(carousel.attributes('data-active-index')).toBe('5')
    expect(next.attributes('disabled')).toBeDefined()

    expect(cards.map((card) => card.text()).join(' ')).toContain('Còn hàng')
    expect(cards.map((card) => card.text()).join(' ')).toContain('Sắp hết hàng')
    expect(cards.map((card) => card.text()).join(' ')).toContain('Tạm hết hàng')
    expect(wrapper.findAll('[data-branch-carousel-row]')).toHaveLength(1)
  })

  it('validates and appends a local customer question without requiring a purchase', async () => {
    const { wrapper } = await mountRoute()
    const form = wrapper.get('[data-question-form]')
    const textarea = form.get<HTMLTextAreaElement>('#product-question')
    const submit = form.get('button[type="submit"]')

    expect(submit.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-question-section]').text()).toContain('không yêu cầu đã mua')

    await textarea.setValue('Da dầu?')
    await form.trigger('submit')
    expect(form.get('[role="alert"]').text()).toContain('ít nhất 10 ký tự')
    expect(textarea.attributes('aria-invalid')).toBe('true')

    await textarea.setValue('Da dầu nhạy cảm có thể dùng hai lần mỗi ngày không?')
    await form.trigger('submit')

    expect(wrapper.findAll('[data-submitted-question]')).toHaveLength(1)
    expect(wrapper.get('[data-submitted-question]').text()).toContain('Câu hỏi của bạn')
    expect(wrapper.get('[data-submitted-question]').text()).toContain('Chờ tư vấn')
    expect(form.get('[role="status"]').text()).toContain('đang chờ tư vấn')
    expect(textarea.element.value).toBe('')
  })

  it('navigates from recommendation view-all to /products with Vue Router', async () => {
    const { wrapper, router } = await mountRoute()

    await wrapper.get('[data-suggestion-carousel] a[href="/products"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/products')
  })

  it.each([
    ['loading', '[data-detail-loading]'],
    ['empty', '[data-detail-empty]'],
    ['error', '[data-detail-error]'],
  ])('supports the %s content state without network data', async (state, selector) => {
    const { wrapper } = await mountRoute(`/products/${firstProduct.slug}?state=${state}`)

    expect(wrapper.find(selector).exists()).toBe(true)
    expect(wrapper.find('[data-product-gallery]').exists()).toBe(false)
  })

  it.each([
    ['out-of-stock', 'out-of-stock'],
    ['low-stock', 'low-stock'],
    ['unavailable-variant', 'out-of-stock'],
  ])('supports the %s purchase state', async (state, expectedStockState) => {
    const { wrapper } = await mountRoute(`/products/${firstProduct.slug}?state=${state}`)

    expect(wrapper.get('[data-stock-state]').attributes('data-stock-state')).toBe(expectedStockState)
  })

  it('retries the local error state and shows the detail content', async () => {
    const { wrapper } = await mountRoute(`/products/${firstProduct.slug}?state=error`)

    await wrapper.get('[data-detail-error] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-detail-error]').exists()).toBe(false)
    expect(wrapper.find('[data-product-gallery]').exists()).toBe(true)
  })

  it('uses only local visuals and makes no network request', async () => {
    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const { wrapper } = await mountRoute()
    await nextTick()

    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
    expect(openSpy).not.toHaveBeenCalled()
    expect(wrapper.findAll('img[src^="http"]')).toHaveLength(0)
    expect(document.querySelectorAll('img[src*="hasaki"], img[src*="tiki"]')).toHaveLength(0)
  })
})
