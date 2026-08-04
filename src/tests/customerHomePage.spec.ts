/// <reference types="node" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import {
  HomeBrandShowcase,
  HomeCategorySidebar,
  HomeCountdown,
  HomeFlashSale,
  HomeHeroSlider,
  HomeProductCard,
  HomeProductSection,
  HomePromotionGrid,
  HomeQuickLinks,
} from '@/components/home'
import CustomerMobileNavigation from '@/components/customer-shell/CustomerMobileNavigation.vue'
import {
  featuredProducts,
  flashSaleProducts,
  homeBrands,
  homeCategories,
  homeHeroSlides,
  homePromotions,
  homeQuickLinks,
  recommendedProducts,
} from '@/data/home/homeDemoData'
import { createAppRouter } from '@/router'

const mountedWrappers: VueWrapper[] = []

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
}

function createTestRouter(): Router {
  return createAppRouter(createMemoryHistory())
}

async function mountHomeApp(): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createTestRouter()
  await router.push('/home')
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
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('customer home page', () => {
  it('renders HomePage inside CustomerLayout', async () => {
    const { wrapper } = await mountHomeApp()

    expect(wrapper.findAll('header')).toHaveLength(2)
    expect(wrapper.get('main').element.tagName).toBe('MAIN')
    expect(wrapper.get('footer').attributes('aria-label')).toBe('Chân trang Mizuki')
  })

  it('allows the router to visit /home', async () => {
    const { wrapper, router } = await mountHomeApp()

    expect(router.currentRoute.value.path).toBe('/home')
    expect(wrapper.get('h1').text()).toContain('Khởi động chu trình')
  })

  it('renders the desktop category sidebar structure', () => {
    const router = createTestRouter()
    const wrapper = mount(HomeCategorySidebar, {
      props: { categories: homeCategories },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Danh mục sản phẩm trang chủ')
    expect(wrapper.findAll('[data-home-category-item]')).toHaveLength(10)
  })

  it('renders the three-level category hierarchy', () => {
    const router = createTestRouter()
    const wrapper = mount(HomeCategorySidebar, {
      props: { categories: homeCategories },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('Chăm sóc da')
    expect(wrapper.text()).toContain('Làm sạch')
    expect(wrapper.text()).toContain('Sữa rửa mặt')
    expect(wrapper.text()).toContain('Tẩy trang')
  })

  it('keeps the category panel open across the hover bridge and closes after leaving', async () => {
    vi.useFakeTimers()
    const router = createTestRouter()
    const wrapper = mount(HomeCategorySidebar, {
      attachTo: document.body,
      props: { categories: homeCategories },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)
    const trigger = wrapper.get('button[aria-controls="home-category-panel-skincare"]')
    const panel = wrapper.get('#home-category-panel-skincare')

    await trigger.trigger('mouseenter')
    expect(trigger.attributes('aria-expanded')).toBe('true')

    await wrapper.get('nav').trigger('mouseleave')
    await panel.trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(200)
    expect(trigger.attributes('aria-expanded')).toBe('true')

    await panel.trigger('mouseleave')
    await vi.advanceTimersByTimeAsync(200)
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('supports focus, Escape, and outside dismissal for the category panel', async () => {
    const router = createTestRouter()
    const wrapper = mount(HomeCategorySidebar, {
      attachTo: document.body,
      props: { categories: homeCategories },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)
    const trigger = wrapper.get('button[aria-controls="home-category-panel-skincare"]')
    const triggerElement = trigger.element as HTMLElement

    triggerElement.focus()
    await nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('true')

    await trigger.trigger('keydown', { key: 'Escape' })
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(triggerElement)

    await trigger.trigger('click')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('renders two hero regions and pill indicators', () => {
    const wrapper = mount(HomeHeroSlider, { props: { slides: homeHeroSlides } })
    mountedWrappers.push(wrapper)

    expect(wrapper.findAll('article.home-hero-slide')).toHaveLength(2)
    expect(wrapper.findAll('button[aria-label^="Chuyển đến banner"]')).toHaveLength(3)
    expect(wrapper.findAll('button[aria-current="true"]')).toHaveLength(1)
    expect(wrapper.get('[data-hero-pagination]').classes()).toEqual(
      expect.arrayContaining(['left-1/2', '-translate-x-1/2']),
    )
    expect(wrapper.get('[data-hero-control="previous"]').classes()).toContain('left-2')
    expect(wrapper.get('[data-hero-control="next"]').classes()).toContain('right-2')
  })

  it('changes the active hero slide with next and previous controls', async () => {
    const wrapper = mount(HomeHeroSlider, { props: { slides: homeHeroSlides } })
    mountedWrappers.push(wrapper)
    const initialTitle = wrapper.get('h1').text()

    await wrapper.get('button[aria-label="Banner tiếp theo"]').trigger('click')
    expect(wrapper.get('h1').text()).not.toBe(initialTitle)

    await wrapper.get('button[aria-label="Banner trước"]').trigger('click')
    expect(wrapper.get('h1').text()).toBe(initialTitle)
    expect((wrapper.get('button[aria-label="Banner trước"]').element as HTMLButtonElement).tabIndex).toBe(
      0,
    )
  })

  it('renders all eight quick links without external navigation', () => {
    const router = createTestRouter()
    const wrapper = mount(HomeQuickLinks, {
      props: { links: homeQuickLinks },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.findAll('a')).toHaveLength(8)
    expect(wrapper.findAll('a').every((link) => link.attributes('href')?.startsWith('/home#'))).toBe(
      true,
    )
  })

  it('places the quick-link row in the hero workspace on the home page', async () => {
    const { wrapper } = await mountHomeApp()

    expect(wrapper.get('[data-home-quick-links-row]').classes()).toContain('lg:col-start-2')
    expect(wrapper.get('[data-home-quick-links-row]').findAll('a')).toHaveLength(8)
  })

  it('renders Flash Sale and a stable countdown format', () => {
    const wrapper = mount(HomeFlashSale, { props: { products: flashSaleProducts } })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('Flash Sale')
    expect(wrapper.get('[role="timer"]').text().replace(/\s+/g, '')).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(wrapper.get('[data-flash-sale]').classes()).toContain('bg-[#fff2ef]')
    expect(wrapper.findAll('[data-countdown-part]')).toHaveLength(3)
    expect(wrapper.get('[data-countdown-part]').classes()).toContain('bg-[#d94c40]')
  })

  it('counts down from a controlled local duration', async () => {
    vi.useFakeTimers()
    const wrapper = mount(HomeCountdown, { props: { initialSeconds: 2 } })
    mountedWrappers.push(wrapper)

    expect(wrapper.text().replace(/\s+/g, '')).toBe('00:00:02')
    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.text().replace(/\s+/g, '')).toBe('00:00:01')
  })

  it('renders product price, discount, and sold-out state', () => {
    const soldOutProduct = flashSaleProducts.find((product) => product.stockState === 'sold_out')
    expect(soldOutProduct).toBeDefined()
    if (!soldOutProduct) return

    const wrapper = mount(HomeProductCard, { props: { product: soldOutProduct } })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('₫')
    expect(wrapper.text()).toContain(`-${soldOutProduct.discountPercent}%`)
    expect(wrapper.text()).toContain('Bán hết')
    expect(wrapper.get('button[disabled]').attributes('aria-label')).toContain('đã bán hết')
    expect(wrapper.get('[data-discount-badge]').classes()).toContain('bg-[#d9463e]')
    expect(wrapper.get('[data-current-price]').classes()).toContain('text-[#cf3f36]')
    expect(wrapper.get('[data-rating-star]').classes()).toContain('fill-[#e3aa32]')
  })

  it('renders the bestseller badge with a high-contrast accent', () => {
    const bestseller = flashSaleProducts.find((product) => product.badge === 'Bán chạy')
    expect(bestseller).toBeDefined()
    if (!bestseller) return
    const wrapper = mount(HomeProductCard, { props: { product: bestseller } })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('[data-product-badge]').text()).toBe('Bán chạy')
    expect(wrapper.get('[data-product-badge]').classes()).toContain('bg-[#f1b94b]')
  })

  it('emits favorite with the selected product', async () => {
    const product = flashSaleProducts[0]
    expect(product).toBeDefined()
    if (!product) return
    const wrapper = mount(HomeProductCard, { props: { product } })
    mountedWrappers.push(wrapper)

    await wrapper.get(`button[aria-label="Yêu thích ${product.name}"]`).trigger('click')

    expect(wrapper.emitted('favorite')).toEqual([[product]])
  })

  it('renders all Flash Sale and featured products', () => {
    const flashWrapper = mount(HomeFlashSale, { props: { products: flashSaleProducts } })
    const featuredWrapper = mount(HomeProductSection, {
      props: { title: 'Sản phẩm nổi bật', products: featuredProducts },
    })
    mountedWrappers.push(flashWrapper, featuredWrapper)

    expect(flashWrapper.findAll('article[aria-labelledby^="home-product-"]')).toHaveLength(10)
    expect(featuredWrapper.findAll('article[aria-labelledby^="home-product-"]')).toHaveLength(8)
  })

  it('renders the brand gradient section and three promotion cards', () => {
    const brandWrapper = mount(HomeBrandShowcase, { props: { brands: homeBrands } })
    const promotionWrapper = mount(HomePromotionGrid, { props: { promotions: homePromotions } })
    mountedWrappers.push(brandWrapper, promotionWrapper)

    expect(brandWrapper.get('section').classes()).toContain('home-brand-showcase')
    expect(brandWrapper.text()).toContain('MIZUKI LAB')
    expect(promotionWrapper.findAll('article')).toHaveLength(3)
  })

  it('keeps the floating voucher visible on the home page', async () => {
    const { wrapper } = await mountHomeApp()

    const voucherLink = wrapper.get('a[aria-label="Nhận voucher Mizuki"]')
    expect(voucherLink.text()).toContain('Nhận voucher')
    expect(voucherLink.attributes('href')).toBe('/vouchers')
  })

  it('supports loading, empty, and recoverable error product states', async () => {
    const loadingWrapper = mount(HomeProductSection, {
      props: { title: 'Đang tải', products: recommendedProducts, loading: true },
    })
    const emptyWrapper = mount(HomeProductSection, {
      props: { title: 'Trống', products: [], empty: true },
    })
    const errorWrapper = mount(HomeProductSection, {
      props: { title: 'Có lỗi', products: [], error: 'Vui lòng thử lại.' },
    })
    mountedWrappers.push(loadingWrapper, emptyWrapper, errorWrapper)

    expect(loadingWrapper.findAll('[data-skeleton-item]')).toHaveLength(4)
    expect(emptyWrapper.text()).toContain('Chưa có sản phẩm phù hợp')
    expect(errorWrapper.text()).toContain('Không thể hiển thị sản phẩm')

    const retryButton = errorWrapper.findAll('button').find((button) => button.text().includes('Thử lại'))
    expect(retryButton).toBeDefined()
    await retryButton?.trigger('click')
    expect(errorWrapper.emitted('retry')).toHaveLength(1)
  })

  it('keeps mobile navigation icon-only with accessible names', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerMobileNavigation, {
      props: { activeKey: 'home' },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.findAll('nav [data-navigation-key]')).toHaveLength(5)
    expect(wrapper.findAll('nav [data-navigation-key]').every((item) => Boolean(item.attributes('aria-label')))).toBe(
      true,
    )
    expect(wrapper.findAll('nav [data-navigation-key]').every((item) => item.text() === '')).toBe(true)
  })

  it('provides accessible names for important home controls', () => {
    const heroWrapper = mount(HomeHeroSlider, { props: { slides: homeHeroSlides } })
    const product = flashSaleProducts[0]
    expect(product).toBeDefined()
    if (!product) return
    const productWrapper = mount(HomeProductCard, { props: { product } })
    mountedWrappers.push(heroWrapper, productWrapper)

    expect(heroWrapper.get('button[aria-label="Banner trước"]').attributes('aria-label')).toBe(
      'Banner trước',
    )
    expect(heroWrapper.get('button[aria-label="Banner tiếp theo"]').attributes('aria-label')).toBe(
      'Banner tiếp theo',
    )
    expect(
      productWrapper.get(`button[aria-label="Yêu thích ${product.name}"]`).attributes('aria-label'),
    ).toContain(product.name)
  })

  it('uses no external image URL in home demo data', () => {
    const serializedData = JSON.stringify({
      homeCategories,
      homeHeroSlides,
      homeQuickLinks,
      flashSaleProducts,
      featuredProducts,
      recommendedProducts,
      homeBrands,
      homePromotions,
    })

    expect(serializedData).not.toMatch(/https?:\/\//)
  })

  it('makes no network request during local home interactions', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const { wrapper } = await mountHomeApp()

    await wrapper.get('button[aria-label="Banner tiếp theo"]').trigger('click')
    const favoriteButton = wrapper.find('button[aria-label^="Yêu thích Gel làm sạch"]')
    await favoriteButton.trigger('click')
    expect(wrapper.get('a[aria-label="Nhận voucher Mizuki"]').attributes('href')).toBe('/vouchers')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
  })
})
