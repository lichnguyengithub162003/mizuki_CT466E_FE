import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import ProductBrandSlider from '@/components/products/ProductBrandSlider.vue'
import ProductCategoryProductSlider from '@/components/products/ProductCategoryProductSlider.vue'
import ProductListingGrid from '@/components/products/ProductListingGrid.vue'
import ProductSuggestions from '@/components/products/ProductSuggestions.vue'
import {
  productBrandPromotions,
  productCategorySummary,
  productListingProducts,
  suggestedProducts,
} from '@/data/products/productListingDemoData'
import { createAppRouter } from '@/router'
import type { ProductCategoryBrand } from '@/types/products'

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

async function mountProductListing(): Promise<MountedProductListing> {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/products')
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
    const productLinks = wrapper.findAll('a[href="/products"]')
    expect(productLinks.length).toBeGreaterThanOrEqual(2)
    expect(productLinks.some((link) => link.attributes('aria-current') === 'page')).toBe(true)
  })

  it('renders a compact category summary with its result count', async () => {
    const { wrapper } = await mountProductListing()
    const summary = wrapper.get('[data-category-summary]')

    expect(summary.find('[data-visible-label="Chăm sóc da"]').exists()).toBe(true)
    expect(summary.get('[data-category-result-count]').text()).toContain('20 sản phẩm minh họa')
    expect(summary.findAll('[data-quick-category-filter]')).toHaveLength(6)
    expect(summary.find('[data-category-product-slider]').exists()).toBe(true)
    expect(summary.findAll('[data-category-preview-product]')).toHaveLength(4)
  })

  it('renders featured categories with Spa & chăm sóc da terminology', async () => {
    const { wrapper } = await mountProductListing()

    expect(wrapper.get('#featured-category-heading').text()).toBe('Danh mục nổi bật')
    expect(wrapper.findAll('[data-featured-category]')).toHaveLength(8)
    expect(wrapper.get('[data-featured-category="spa-skin-care"]').text()).toContain('Spa & chăm sóc da')
    expect(wrapper.get('[data-featured-category="spa-skin-care"]').attributes('href')).toBe('/skin-care')
    expect(wrapper.text()).not.toContain('Clinic')
  })

  it('renders typed brand tiles with local visuals and wordmarks', async () => {
    const { wrapper } = await mountProductListing()
    const slider = wrapper.get('[data-brand-slider]')
    const renderedBrandNames = new Set<string>()

    expect(slider.attributes('data-group-size')).toBe('6')
    expect(slider.findAll('[data-brand-tile]')).toHaveLength(6)

    for (let slideIndex = 0; slideIndex < 2; slideIndex += 1) {
      for (const brandTile of slider.findAll('[data-brand-tile]')) {
        renderedBrandNames.add(brandTile.get('[data-brand-wordmark]').text())
        expect(brandTile.find('[data-brand-image-area]').exists()).toBe(true)
      }
      if (slideIndex < 1) {
        await slider.get('button[aria-label="Xem nhóm thương hiệu tiếp theo"]').trigger('click')
      }
    }

    expect([...renderedBrandNames]).toEqual(productBrandPromotions.map((brand) => brand.name))
    expect(wrapper.findAll('img[src^="http"]')).toHaveLength(0)
    expect(wrapper.find('[data-featured-promotion]').exists()).toBe(false)
    expect(slider.findAll('[data-brand-image-area]')).toHaveLength(6)
    expect(slider.findAll('[data-brand-image-placeholder]')).toHaveLength(6)
    expect(slider.find('[data-brand-product-image]').exists()).toBe(false)
  })

  it('changes brand slides with controls and active indicators', async () => {
    const { wrapper } = await mountProductListing()
    const slider = wrapper.get('[data-brand-slider]')

    expect(slider.attributes('data-active-slide')).toBe('0')
    expect(slider.find('[aria-current="true"]').attributes('aria-label')).toContain('1')

    await slider.get('button[aria-label="Xem nhóm thương hiệu tiếp theo"]').trigger('click')
    expect(slider.attributes('data-active-slide')).toBe('1')
    expect(slider.find('[aria-current="true"]').attributes('aria-label')).toContain('2')

    await slider.get('button[aria-label="Xem nhóm thương hiệu trước"]').trigger('click')
    expect(slider.attributes('data-active-slide')).toBe('0')
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

  it('renders desktop filters and filters the local product grid', async () => {
    const { wrapper } = await mountProductListing()
    const desktopFilters = wrapper.get('[data-testid="desktop-product-filters"]')

    expect(desktopFilters.text()).toContain('Danh mục')
    expect(desktopFilters.text()).toContain('Thương hiệu')
    expect(desktopFilters.text()).toContain('Khoảng giá')
    expect(desktopFilters.text()).toContain('Nhu cầu')

    const categoryCheckboxes = desktopFilters.findAll('input[type="checkbox"]')
    expect(categoryCheckboxes.length).toBeGreaterThan(0)
    await categoryCheckboxes[0]?.setValue(true)

    expect(wrapper.findAll('[data-listing-product]')).toHaveLength(3)
    expect(wrapper.text()).toContain('1 bộ lọc đang áp dụng')
  })

  it('opens, applies, resets, and closes the mobile filter dialog locally', async () => {
    const { wrapper } = await mountProductListing()

    await wrapper.get('[data-testid="mobile-filter-trigger"]').trigger('click')
    await nextTick()
    const dialog = document.body.querySelector('[role="dialog"][data-state="open"]')
    expect(dialog).not.toBeNull()

    const dialogCheckbox = dialog?.querySelector<HTMLInputElement>('input[type="checkbox"]')
    expect(dialogCheckbox).not.toBeNull()
    dialogCheckbox?.click()
    await nextTick()

    document.body.querySelector<HTMLButtonElement>('[data-testid="mobile-filter-apply"]')?.click()
    await nextTick()
    expect(document.body.querySelector('[role="dialog"][data-state="open"]')).toBeNull()
    expect(wrapper.text()).toContain('1 bộ lọc đang áp dụng')

    await wrapper.get('[data-testid="mobile-filter-trigger"]').trigger('click')
    await nextTick()
    document.body.querySelector<HTMLButtonElement>('[data-testid="mobile-filter-reset"]')?.click()
    document.body.querySelector<HTMLButtonElement>('[data-testid="mobile-filter-apply"]')?.click()
    await nextTick()
    expect(wrapper.text()).not.toContain('1 bộ lọc đang áp dụng')

    await wrapper.get('[data-testid="mobile-filter-trigger"]').trigger('click')
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(document.body.querySelector('[role="dialog"][data-state="open"]')).toBeNull()
  })

  it('sorts products with local state', async () => {
    const { wrapper } = await mountProductListing()

    await wrapper.get('[data-testid="product-sort"]').setValue('price-descending')
    const firstCard = wrapper.findAll('[data-listing-product]')[0]

    expect(firstCard?.text()).toContain(productListingProducts[19]?.name)
    expect(wrapper.get('[data-testid="product-sort"]').element).toHaveProperty(
      'value',
      'price-descending',
    )
  })

  it('renders twelve products then loads all twenty local samples', async () => {
    const { wrapper } = await mountProductListing()

    expect(wrapper.findAll('[data-listing-product]')).toHaveLength(12)
    await wrapper.get('[data-testid="load-more-products"]').trigger('click')
    expect(wrapper.findAll('[data-listing-product]')).toHaveLength(20)
    expect(wrapper.find('[data-testid="load-more-products"]').exists()).toBe(false)
  })

  it('renders compact suggestions in exactly one carousel row', async () => {
    const { wrapper } = await mountProductListing()

    expect(wrapper.get('#product-suggestion-heading').text()).toBe('Có thể bạn thích')
    expect(wrapper.findAll('[data-suggestion-row]')).toHaveLength(1)
    expect(wrapper.findAll('[data-suggested-product]')).toHaveLength(8)
    expect(wrapper.findAll('[data-compact-product-card]')).toHaveLength(8)
    expect(wrapper.get('[data-suggestion-row]').classes()).toContain('flex')
    expect(wrapper.get('[data-suggestion-row]').classes()).not.toContain('flex-wrap')
  })

  it('moves through compact suggestions with buttons and keyboard', async () => {
    const wrapper = mount(ProductSuggestions, {
      props: { products: suggestedProducts },
    })
    mountedWrappers.push(wrapper)
    const carousel = wrapper.get('[data-suggestion-carousel]')

    await wrapper.get('button[aria-label="Xem sản phẩm gợi ý tiếp theo"]').trigger('click')
    expect(carousel.attributes('data-active-index')).toBe('1')

    await wrapper.get('[data-suggestion-row]').trigger('keydown', { key: 'ArrowRight' })
    expect(carousel.attributes('data-active-index')).toBe('2')

    await wrapper.get('button[aria-label="Xem sản phẩm gợi ý trước"]').trigger('click')
    expect(carousel.attributes('data-active-index')).toBe('1')
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

  it('does not make network requests during listing interactions', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const { wrapper } = await mountProductListing()

    await wrapper.get('[data-testid="product-sort"]').setValue('newest')
    await wrapper.get('[data-testid="mobile-filter-trigger"]').trigger('click')
    await nextTick()
    document.body.querySelector<HTMLButtonElement>('[data-testid="mobile-filter-apply"]')?.click()
    await nextTick()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
  })
})

describe('category and brand slider motion contracts', () => {
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
