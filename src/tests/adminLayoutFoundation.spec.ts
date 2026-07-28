import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, type Router } from 'vue-router'
import { nextTick } from 'vue'
import App from '@/App.vue'
import AdminBottomNavigation from '@/components/layout/AdminBottomNavigation.vue'
import AdminTopNavigation from '@/components/layout/AdminTopNavigation.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { createAppRouter } from '@/router'

interface MountedAdminApp {
  wrapper: VueWrapper
  router: Router
}

const mountedWrappers: VueWrapper[] = []

async function mountAdminApp(path = '/admin-shell'): Promise<MountedAdminApp> {
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

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('responsive admin shell foundation', () => {
  it('renders semantic aside, header, and main regions', async () => {
    const { wrapper } = await mountAdminApp()

    expect(wrapper.get('aside').attributes('aria-label')).toBe('Thanh bên quản trị')
    expect(wrapper.get('header').attributes('aria-label')).toBe('Đầu trang quản trị')
    expect(wrapper.get('main').element.tagName).toBe('MAIN')
  })

  it('shows expanded sidebar navigation labels', async () => {
    const { wrapper } = await mountAdminApp()
    const desktopNavigation = wrapper.get('nav[aria-label="Điều hướng quản trị desktop"]')

    expect(desktopNavigation.text()).toContain('Tổng quan')
    expect(desktopNavigation.text()).toContain('Cài đặt')
  })

  it('collapses the sidebar into compact navigation', async () => {
    const { wrapper } = await mountAdminApp()

    await wrapper.get('button[aria-label="Thu gọn thanh bên"]').trigger('click')

    expect(wrapper.get('aside').classes()).toContain('w-20')
    expect(wrapper.get('button[aria-label="Mở rộng thanh bên"]').attributes('aria-expanded')).toBe('false')
  })

  it('keeps accessible navigation labels when collapsed', async () => {
    const { wrapper } = await mountAdminApp()
    await wrapper.get('button[aria-label="Thu gọn thanh bên"]').trigger('click')
    const navigation = wrapper.get('nav[aria-label="Điều hướng quản trị desktop"]')

    expect(navigation.get('a[aria-label="Tổng quan"]').attributes('href')).toBe('/admin-shell')
    expect(navigation.get('a[aria-label="Nhân viên"]').attributes('href')).toContain('section=staff')
  })

  it('marks the active navigation item semantically', async () => {
    const { wrapper } = await mountAdminApp('/admin-shell?section=orders')
    const desktopNavigation = wrapper.get('nav[aria-label="Điều hướng quản trị desktop"]')

    expect(desktopNavigation.get('a[aria-current="page"]').text()).toContain('Đơn hàng')
  })

  it('renders the tablet top navigation with its own label', () => {
    const router = createAppRouter(createMemoryHistory())
    const wrapper = mount(AdminTopNavigation, {
      props: { activeKey: 'overview' },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Điều hướng quản trị tablet')
    expect(wrapper.findAll('nav a')).toHaveLength(7)
  })

  it('renders five icon-only mobile entries with accessible labels and active state', () => {
    const router = createAppRouter(createMemoryHistory())
    const wrapper = mount(AdminBottomNavigation, {
      props: { activeKey: 'overview' },
      attachTo: document.body,
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)
    const navigation = wrapper.get('nav[aria-label="Điều hướng quản trị mobile"]')

    expect(navigation.findAll(':scope > div > *')).toHaveLength(5)
    expect(navigation.findAll('a')).toHaveLength(4)
    expect(navigation.findAll('button')).toHaveLength(1)
    expect(navigation.text().trim()).toBe('')
    expect(
      navigation.findAll('a, button').map((item) => item.attributes('aria-label')),
    ).toEqual(['Tổng quan', 'Đơn hàng', 'Sản phẩm', 'Tồn kho', 'Khác'])
    expect(navigation.get('a[aria-label="Tổng quan"]').attributes('aria-current')).toBe('page')
    expect(navigation.get('a[aria-label="Tổng quan"]').attributes('data-active')).toBe('true')
  })

  it('opens the mobile more menu', async () => {
    const { wrapper } = await mountAdminApp()

    await wrapper.get('button[aria-label="Khác"]').trigger('click')
    await nextTick()

    expect(document.body.textContent).toContain('Điều hướng khác')
    expect(wrapper.get('button[aria-label="Khác"]').attributes('aria-expanded')).toBe('true')
  })

  it('shows refunds, staff, and settings inside the more menu', async () => {
    const { wrapper } = await mountAdminApp()
    await wrapper.get('button[aria-label="Khác"]').trigger('click')
    await nextTick()

    const additionalNavigation = document.querySelector('nav[aria-label="Điều hướng quản trị bổ sung"]')
    expect(additionalNavigation?.textContent).toContain('Hoàn tiền')
    expect(additionalNavigation?.textContent).toContain('Nhân viên')
    expect(additionalNavigation?.textContent).toContain('Cài đặt')
  })

  it('closes the mobile more menu with its action', async () => {
    const { wrapper } = await mountAdminApp()
    await wrapper.get('button[aria-label="Khác"]').trigger('click')
    await nextTick()
    const closeButton = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Đóng menu',
    )

    expect(closeButton).toBeDefined()
    closeButton?.click()
    await nextTick()

    expect(wrapper.get('button[aria-label="Khác"]').attributes('aria-expanded')).toBe('false')
  })

  it('renders PageHeader title, description, eyebrow, and actions', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Tiêu đề trang', description: 'Mô tả trang.' },
      slots: { eyebrow: 'Khu vực', actions: '<button>Thao tác</button>' },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('h1').text()).toBe('Tiêu đề trang')
    expect(wrapper.text()).toContain('Mô tả trang.')
    expect(wrapper.text()).toContain('Khu vực')
    expect(wrapper.get('button').text()).toBe('Thao tác')
  })

  it('renders three clearly marked demo summary cards', async () => {
    const { wrapper } = await mountAdminApp()
    const grid = wrapper.get('[data-testid="admin-summary-grid"]')

    expect(grid.findAll('article')).toHaveLength(3)
    expect(grid.text()).toContain('Số liệu demo')
    expect(grid.findAll('svg[role="img"]')).toHaveLength(3)
  })

  it('renders the premium analytics, activity, and schedule regions', async () => {
    const { wrapper } = await mountAdminApp()

    expect(wrapper.text()).toContain('Nhịp vận hành')
    expect(wrapper.text()).toContain('Hoạt động gần đây')
    expect(wrapper.text()).toContain('Lịch vận hành')
    expect(wrapper.find('.admin-glass-panel').exists()).toBe(true)
  })

  it('allows the router to visit the admin shell', async () => {
    const { wrapper, router } = await mountAdminApp()

    expect(router.currentRoute.value.path).toBe('/admin-shell')
    expect(wrapper.get('h1').text()).toBe('Một nhịp vận hành thật nhẹ nhàng.')
  })

  it('changes demo navigation state without leaving the shell route', async () => {
    const { wrapper, router } = await mountAdminApp()
    const desktopNavigation = wrapper.get('nav[aria-label="Điều hướng quản trị desktop"]')

    await desktopNavigation.get('a[href="/admin-shell?section=orders"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin-shell')
    expect(router.currentRoute.value.query.section).toBe('orders')
    expect(wrapper.get('h1').text()).toBe('Một nhịp vận hành thật nhẹ nhàng.')
  })

  it('provides distinct labels for all responsive navigation regions', async () => {
    const { wrapper } = await mountAdminApp()

    expect(wrapper.find('nav[aria-label="Điều hướng quản trị desktop"]').exists()).toBe(true)
    expect(wrapper.find('nav[aria-label="Điều hướng quản trị tablet"]').exists()).toBe(true)
    expect(wrapper.find('nav[aria-label="Điều hướng quản trị mobile"]').exists()).toBe(true)
  })

  it('keeps the responsive breakpoint and bottom-content spacing contracts', async () => {
    const { wrapper } = await mountAdminApp()
    const sidebar = wrapper.get('aside[aria-label="Thanh bên quản trị"]')
    const tabletNavigation = wrapper.get('nav[aria-label="Điều hướng quản trị tablet"]')
    const mobileNavigation = wrapper.get('nav[aria-label="Điều hướng quản trị mobile"]')

    expect(sidebar.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:flex']))
    expect(tabletNavigation.element.parentElement?.parentElement?.className).toContain('md:block')
    expect(tabletNavigation.element.parentElement?.parentElement?.className).toContain('lg:hidden')
    expect(mobileNavigation.classes()).toContain('md:hidden')
    expect(wrapper.get('main').classes()).toEqual(expect.arrayContaining(['pb-24', 'md:pb-0']))
  })

  it('supports header and page-header slots in AdminLayout', () => {
    const router = createAppRouter(createMemoryHistory())
    const wrapper = mount(AdminLayout, {
      slots: {
        'header-actions': '<button data-test="header-action">Trợ giúp</button>',
        'page-header': '<div data-test="page-header">Page header</div>',
        default: '<p data-test="content">Nội dung</p>',
      },
      global: { plugins: [router] },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('[data-test="header-action"]').text()).toBe('Trợ giúp')
    expect(wrapper.get('[data-test="page-header"]').text()).toBe('Page header')
    expect(wrapper.get('[data-test="content"]').text()).toBe('Nội dung')
  })

  it('does not make a network request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')

    const { wrapper } = await mountAdminApp()
    await wrapper.get('button[aria-label="Thu gọn thanh bên"]').trigger('click')
    await wrapper.get('button[aria-label="Khác"]').trigger('click')
    await nextTick()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
  })
})
