/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import {
  CustomerAnnouncementBar,
  CustomerBranchSelector,
  CustomerCategoryHighlights,
  CustomerCategoryMenu,
  CustomerDesktopNavigation,
  CustomerFooter,
  CustomerHeader,
  CustomerHeroBanners,
  CustomerLogo,
  CustomerMobileHeader,
  CustomerMobileNavigation,
  CustomerSearch,
  CustomerVoucherFloat,
} from '@/components/customer-shell'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import { createAppRouter } from '@/router'
import { DEFAULT_CUSTOMER_BRANCH } from '@/types/customer-shell'

interface MountedCustomerApp {
  wrapper: VueWrapper
  router: Router
}

const mountedWrappers: VueWrapper[] = []
const customerShellCss = readFileSync('src/style.css', 'utf8')

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
}

function createTestRouter(): Router {
  return createAppRouter(createMemoryHistory())
}

async function mountCustomerApp(path = '/customer-shell'): Promise<MountedCustomerApp> {
  const router = createTestRouter()
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
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('customer shell foundation', () => {
  it('renders semantic header, main, and footer regions', async () => {
    const { wrapper } = await mountCustomerApp()

    expect(wrapper.findAll('header')).toHaveLength(2)
    expect(wrapper.get('main').element.tagName).toBe('MAIN')
    expect(wrapper.get('footer').attributes('aria-label')).toBe('Chân trang Mizuki')
  })

  it('renders the demo announcement copy', () => {
    const wrapper = mount(CustomerAnnouncementBar)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('Miễn phí giao hàng')
    expect(wrapper.text().replace(/\s+/g, ' ')).toContain('FREESHIP EXTRA')
    expect(wrapper.text()).toContain('nội dung demo')
    expect(wrapper.get('.customer-announcement-offer').text().replace(/\s+/g, ' ')).toBe(
      'FREESHIP EXTRA',
    )
    expect(wrapper.get('.customer-announcement-offer span:first-child').classes()).toContain(
      'text-[#40a66a]',
    )
    expect(wrapper.get('.customer-announcement-offer span:last-child').classes()).toContain(
      'text-[#b98122]',
    )
  })

  it('renders the MIZUKI wordmark without the previous leaf icon', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerLogo, { global: { plugins: [router] } })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toBe('MIZUKI')
    expect(wrapper.get('a').attributes('aria-label')).toBe('MIZUKI')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('keeps announcement content static and complete under reduced motion', () => {
    const reducedMotionCss = customerShellCss.slice(
      customerShellCss.indexOf('@media (prefers-reduced-motion: reduce)'),
    )

    expect(customerShellCss).toContain('@keyframes customer-announcement-scroll')
    expect(reducedMotionCss).toMatch(
      /\.customer-announcement-track\s*\{[^}]*animation:\s*none !important/,
    )
    expect(reducedMotionCss).toContain(".customer-announcement-sequence[aria-hidden='true']")
  })

  it('gives search an accessible label', () => {
    const wrapper = mount(CustomerSearch)
    mountedWrappers.push(wrapper)

    expect(wrapper.get('input').attributes('aria-label')).toBeUndefined()
    expect(wrapper.get('label').text()).toContain('Tìm kiếm sản phẩm và dịch vụ')
    expect(wrapper.get('label').attributes('for')).toBe(wrapper.get('input').attributes('id'))
  })

  it('emits a trimmed local search query on submit', async () => {
    const wrapper = mount(CustomerSearch)
    mountedWrappers.push(wrapper)

    await wrapper.get('input').setValue('  serum dưỡng ẩm  ')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([['serum dưỡng ẩm']])
  })

  it('shows exactly one custom clear action only when search has content', async () => {
    const wrapper = mount(CustomerSearch)
    mountedWrappers.push(wrapper)

    expect(wrapper.findAll('button[aria-label="Xóa nội dung tìm kiếm"]')).toHaveLength(0)

    await wrapper.get('input').setValue('serum')

    expect(wrapper.findAll('button[aria-label="Xóa nội dung tìm kiếm"]')).toHaveLength(1)
    expect(wrapper.get('input').classes()).toContain('customer-search-input')
  })

  it('renders the two-banner commerce hero', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerHeroBanners, { global: { plugins: [router] } })
    mountedWrappers.push(wrapper)

    expect(wrapper.findAll('article.customer-hero-banner')).toHaveLength(2)
    expect(wrapper.get('h1').text()).toContain('Chăm da dịu nhẹ')
    expect(wrapper.text()).not.toContain('Foundation demo')
  })

  it('renders category highlights with local background visuals', () => {
    const wrapper = mount(CustomerCategoryHighlights)
    mountedWrappers.push(wrapper)

    expect(wrapper.findAll('article')).toHaveLength(4)
    expect(wrapper.findAll('article').every((card) => Boolean(card.attributes('style')))).toBe(true)
    expect(wrapper.text()).toContain('Danh mục nổi bật')
  })

  it('renders the voucher floating utility', () => {
    const wrapper = mount(CustomerVoucherFloat)
    mountedWrappers.push(wrapper)

    expect(wrapper.get('button').text()).toContain('Nhận voucher')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Nhận voucher Mizuki')
  })

  it('shows the selected branch name', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerBranchSelector, {
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('button[aria-label^="Chọn chi nhánh"]').text()).toContain('Mizuki Cần Thơ')
  })

  it('exposes branch dialog expanded state', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerBranchSelector, {
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('button[aria-label^="Chọn chi nhánh"]').attributes('aria-expanded')).toBe(
      'false',
    )
  })

  it('opens the branch dialog', async () => {
    const { wrapper } = await mountCustomerApp()

    await wrapper.findAll('button[aria-label^="Chọn chi nhánh"]')[0]?.trigger('click')
    await nextTick()

    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.body.textContent).toContain('Chọn chi nhánh Mizuki')
  })

  it('renders an accessible branch search field', async () => {
    const { wrapper } = await mountCustomerApp()
    await wrapper.findAll('button[aria-label^="Chọn chi nhánh"]')[0]?.trigger('click')
    await nextTick()

    const input = document.querySelector<HTMLInputElement>('input[placeholder="Nhập tên hoặc khu vực chi nhánh"]')
    const label = input ? document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`) : null

    expect(input).not.toBeNull()
    expect(label?.textContent).toContain('Tìm chi nhánh')
  })

  it('filters branch options locally', async () => {
    const { wrapper } = await mountCustomerApp()
    await wrapper.findAll('button[aria-label^="Chọn chi nhánh"]')[0]?.trigger('click')
    await nextTick()
    const input = document.querySelector<HTMLInputElement>('input[placeholder="Nhập tên hoặc khu vực chi nhánh"]')

    expect(input).not.toBeNull()
    if (input) {
      input.value = 'Ninh Kiều'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await nextTick()

    const branchOptions = [...document.querySelectorAll<HTMLButtonElement>('button[role="listitem"]')]
    expect(branchOptions).toHaveLength(1)
    expect(branchOptions[0]?.textContent).toContain('Mizuki Ninh Kiều')
  })

  it('updates the selected branch in both responsive headers', async () => {
    const { wrapper } = await mountCustomerApp()
    await wrapper.findAll('button[aria-label^="Chọn chi nhánh"]')[0]?.trigger('click')
    await nextTick()
    const target = [...document.querySelectorAll<HTMLButtonElement>('button[role="listitem"]')].find(
      (button) => button.textContent?.includes('Mizuki Ninh Kiều'),
    )

    target?.click()
    await nextTick()

    expect(wrapper.findAll('button[aria-label^="Chọn chi nhánh"]').every(
      (button) => button.text().includes('Mizuki Ninh Kiều'),
    )).toBe(true)
  })

  it('closes the branch dialog with its close action', async () => {
    const { wrapper } = await mountCustomerApp()
    await wrapper.findAll('button[aria-label^="Chọn chi nhánh"]')[0]?.trigger('click')
    await nextTick()
    const closeButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Đóng chọn chi nhánh"]',
    )

    closeButton?.click()
    await nextTick()

    expect(document.querySelector('[role="dialog"]')?.getAttribute('data-state')).toBe('closed')
    expect(wrapper.findAll('button[aria-label^="Chọn chi nhánh"]')[0]?.attributes('aria-expanded')).toBe(
      'false',
    )
  })

  it('renders all seven desktop shopping navigation items', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerDesktopNavigation, {
      props: { activeKey: 'home' },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.findAll('nav a')).toHaveLength(7)
    expect(wrapper.text()).toContain('Khuyến mãi')
  })

  it('opens the compact desktop category menu', async () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerCategoryMenu, {
      attachTo: document.body,
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    await wrapper.get('button[aria-label="Mở danh mục sản phẩm"]').trigger('click')
    await nextTick()

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    expect(document.body.textContent).toContain('Danh mục sản phẩm')
  })

  it('renders the requested category hierarchy', async () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerCategoryMenu, {
      attachTo: document.body,
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    await wrapper.get('button[aria-label="Mở danh mục sản phẩm"]').trigger('click')
    await nextTick()

    expect(document.body.textContent).toContain('Chăm sóc da')
    expect(document.body.textContent).toContain('Làm sạch')
    expect(document.body.textContent).toContain('Sữa rửa mặt')
    expect(document.body.textContent).toContain('Tẩy trang')
    expect(document.body.textContent).toContain('Dưỡng da')
    expect(document.body.textContent).toContain('Serum')
    expect(document.body.textContent).toContain('Kem dưỡng')
    expect(document.body.textContent).toContain('Trang điểm mặt')
    expect(document.body.textContent).toContain('Trang điểm môi')
    expect(document.body.textContent).toContain('Dầu gội')
    expect(document.body.textContent).toContain('Dầu xả')
  })

  it('closes the category menu with Escape', async () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerCategoryMenu, {
      attachTo: document.body,
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    await wrapper.get('button[aria-label="Mở danh mục sản phẩm"]').trigger('click')
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })

  it('renders the compact mobile header', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerMobileHeader, {
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('header').attributes('aria-label')).toBe('Đầu trang khách hàng mobile')
    expect(wrapper.text()).toContain('Mizuki')
    expect(wrapper.get('input').attributes('placeholder')).toContain('Tìm sản phẩm')
  })

  it('renders exactly five mobile customer navigation items', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerMobileNavigation, {
      props: { activeKey: 'home' },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.findAll('nav a')).toHaveLength(5)
    expect(wrapper.findAll('nav a').map((item) => item.attributes('aria-label'))).toEqual([
      'Trang chủ',
      'Danh mục',
      'Yêu thích',
      'Giỏ hàng',
      'Tài khoản',
    ])
    expect(wrapper.findAll('nav a span').every((item) => item.text() === '')).toBe(true)
  })

  it('marks the active mobile customer item semantically', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerMobileNavigation, {
      props: { activeKey: 'cart' },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('a[aria-current="page"]').attributes('aria-label')).toBe('Giỏ hàng')
  })

  it('renders all footer foundation groups', () => {
    const wrapper = mount(CustomerFooter)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('Về Mizuki')
    expect(wrapper.text()).toContain('Hỗ trợ khách hàng')
    expect(wrapper.text()).toContain('Chính sách')
    expect(wrapper.text()).toContain('Liên hệ')
    expect(wrapper.text()).toContain('Phương thức thanh toán')
  })

  it('allows the router to visit the customer shell', async () => {
    const { wrapper, router } = await mountCustomerApp()

    expect(router.currentRoute.value.path).toBe('/customer-shell')
    expect(wrapper.get('h1').text()).toContain('Chăm da dịu nhẹ')
  })

  it('changes demo navigation without reloading the page', async () => {
    const { wrapper, router } = await mountCustomerApp()
    const desktopNavigation = wrapper.get('nav[aria-label="Điều hướng mua sắm"]')

    await desktopNavigation.get('a[href="/customer-shell?section=products"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/customer-shell')
    expect(router.currentRoute.value.query.section).toBe('products')
    expect(wrapper.get('h1').text()).toContain('Chăm da dịu nhẹ')
  })

  it('does not make a network request during local interactions', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const { wrapper } = await mountCustomerApp()

    await wrapper.get('input[id="customer-search-desktop"]').setValue('kem dưỡng')
    await wrapper.get('input[id="customer-search-desktop"]').trigger('keyup.enter')
    await wrapper.findAll('button[aria-label^="Chọn chi nhánh"]')[0]?.trigger('click')
    await wrapper.get('button[aria-label="Mở danh mục sản phẩm"]').trigger('click')
    await nextTick()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
  })

  it('gives important customer actions accessible names', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerHeader, {
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH, activeKey: 'home' },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.find('button[aria-label="Yêu thích"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label^="Giỏ hàng"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Tài khoản"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label^="Chọn chi nhánh"]').exists()).toBe(true)
  })

  it('reserves bottom space for mobile navigation', () => {
    const router = createTestRouter()
    const wrapper = mount(CustomerLayout, {
      slots: { default: '<p>Nội dung</p>' },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('main').classes()).toEqual(expect.arrayContaining(['pb-24', 'md:pb-0']))
  })
})
