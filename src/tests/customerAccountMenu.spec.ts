/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import CustomerHeader from '@/components/customer-shell/CustomerHeader.vue'
import CustomerMobileHeader from '@/components/customer-shell/CustomerMobileHeader.vue'
import CustomerMobileNavigation from '@/components/customer-shell/CustomerMobileNavigation.vue'
import { DEFAULT_CUSTOMER_BRANCH } from '@/types/customer-shell'
import { pinia } from '@/stores/pinia'
import { useAuthStore } from '@/stores/auth'
import type { AppRole, AuthenticatedUser } from '@/types/auth'

const wrappers: VueWrapper[] = []

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
}

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', name: 'customer-home', component: { template: '<main>Home</main>' } },
      { path: '/login', name: 'login', component: { template: '<main>Login</main>' } },
      { path: '/register', name: 'register', component: { template: '<main>Register</main>' } },
      { path: '/favorites', name: 'favorites', component: { template: '<main>Favorites</main>' } },
      { path: '/cart', name: 'cart', component: { template: '<main>Cart</main>' } },
      { path: '/admin-shell', name: 'admin-shell', component: { template: '<main>Admin</main>' } },
      { path: '/:pathMatch(.*)*', component: { template: '<main>Fallback</main>' } },
    ],
  })
}

function user(role: AppRole = 'customer', avatar: string | null = null): AuthenticatedUser {
  return {
    id: 12,
    name: 'Nguyễn Minh An',
    email: 'an@example.com',
    phone: null,
    avatar,
    role,
    role_label: role === 'customer' ? 'Khách hàng' : 'Quản trị viên',
    branch_id: null,
    email_verified_at: '2026-08-01T00:00:00Z',
    created_at: '2026-08-01T00:00:00Z',
  }
}

async function mountHeader(router = createTestRouter()): Promise<{ wrapper: VueWrapper; router: Router }> {
  await router.push('/home')
  await router.isReady()
  const wrapper = mount(CustomerHeader, {
    attachTo: document.body,
    props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH, activeKey: 'home' },
    global: { plugins: [pinia, router] },
  })
  wrappers.push(wrapper)
  return { wrapper, router }
}

async function mountMobile(router = createTestRouter()): Promise<{ wrapper: VueWrapper; router: Router }> {
  await router.push('/home')
  await router.isReady()
  const wrapper = mount(CustomerMobileNavigation, {
    attachTo: document.body,
    props: { activeKey: 'home' },
    global: { plugins: [pinia, router] },
  })
  wrappers.push(wrapper)
  return { wrapper, router }
}

function bodyLink(label: string): HTMLAnchorElement | undefined {
  return Array.from(document.body.querySelectorAll('a')).find(
    (link) => link.textContent?.trim() === label,
  )
}

function bodyButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  )
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  useAuthStore(pinia).resetForTesting()
  document.body.innerHTML = ''
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('F3g.2a customer account menu', () => {
  it('opens an accessible guest desktop menu and navigates to login or registration', async () => {
    const { wrapper, router } = await mountHeader()
    const trigger = wrapper.get('[data-testid="desktop-account-trigger"]')

    expect(trigger.element.tagName).toBe('BUTTON')
    expect(trigger.attributes('aria-label')).toBe('Tài khoản')
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')
    await nextTick()

    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(bodyLink('Đăng nhập')?.getAttribute('href')).toBe('/login')
    expect(bodyLink('Tạo tài khoản')?.getAttribute('href')).toBe('/register')
    bodyLink('Đăng nhập')?.click()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/login')

    await router.push('/home')
    await trigger.trigger('click')
    await nextTick()
    bodyLink('Tạo tài khoản')?.click()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/register')
  })

  it('renders confirmed identity, initials, email, and disabled pending destinations', async () => {
    useAuthStore(pinia).$patch({ user: user() })
    const { wrapper } = await mountHeader()

    expect(wrapper.text()).toContain('Nguyễn Minh An')
    expect(wrapper.get('[data-testid="account-initials"]').text()).toBe('NA')
    await wrapper.get('[data-testid="desktop-account-trigger"]').trigger('click')
    await nextTick()

    expect(document.body.textContent).toContain('an@example.com')
    expect(document.body.textContent).toContain('Khách hàng')
    for (const label of ['Tài khoản của tôi', 'Địa chỉ nhận hàng', 'Đơn hàng của tôi']) {
      const item = Array.from(document.body.querySelectorAll('button')).find(
        (button) => button.textContent?.includes(label),
      )
      expect(item?.disabled).toBe(true)
      expect(bodyLink(label)).toBeUndefined()
    }
    expect(bodyLink('Khu vực quản trị')).toBeUndefined()
  })

  it('renders only a valid confirmed avatar and otherwise falls back to initials', async () => {
    const store = useAuthStore(pinia)
    store.$patch({ user: user('customer', 'https://cdn.example.com/avatar.jpg') })
    const { wrapper } = await mountHeader()
    expect(wrapper.get('[data-testid="account-avatar-image"]').attributes('src')).toBe(
      'https://cdn.example.com/avatar.jpg',
    )

    store.$patch({ user: user('customer', 'javascript:alert(1)') })
    await nextTick()
    expect(wrapper.find('[data-testid="account-avatar-image"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="account-initials"]').text()).toBe('NA')
  })

  it('shows the confirmed admin route only for allowed roles', async () => {
    const store = useAuthStore(pinia)
    for (const role of ['branch_manager', 'super_admin'] as const) {
      store.$patch({ user: user(role) })
      const { wrapper } = await mountHeader()
      await wrapper.get('[data-testid="desktop-account-trigger"]').trigger('click')
      await nextTick()
      expect(bodyLink('Khu vực quản trị')?.getAttribute('href')).toBe('/admin-shell')
      wrapper.unmount()
      wrappers.splice(wrappers.indexOf(wrapper), 1)
      document.body.innerHTML = ''
    }
  })

  it('uses a neutral restoring state, then reacts to restored store identity without requesting data', async () => {
    const store = useAuthStore(pinia)
    store.$patch({ user: null, isInitializing: true, isInitialized: false })
    const { wrapper } = await mountHeader()
    const trigger = wrapper.get('[data-testid="desktop-account-trigger"]')
    expect(trigger.attributes('aria-label')).toBe('Đang tải tài khoản')
    expect(trigger.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('Nguyễn Minh An')

    store.$patch({ user: user(), isInitializing: false, isInitialized: true })
    await nextTick()
    expect(wrapper.text()).toContain('Nguyễn Minh An')

    const source = [
      readFileSync('src/components/customer-shell/CustomerHeader.vue', 'utf8'),
      readFileSync('src/components/customer-shell/CustomerAccountControl.vue', 'utf8'),
      readFileSync('src/components/customer-shell/CustomerAccountMenuContent.vue', 'utf8'),
    ].join('\n')
    expect(source).not.toMatch(/axios|authApi|getCurrentUser|restoreSession\s*\(/)
  })

  it('prevents duplicate logout, closes the menu, updates guest state, and returns home', async () => {
    const store = useAuthStore(pinia)
    store.$patch({ user: user() })
    let finishLogout: (() => void) | undefined
    const logout = vi.spyOn(store, 'logout').mockImplementation(
      () => new Promise<void>((resolve) => {
        finishLogout = () => {
          store.clearSession()
          resolve()
        }
      }),
    )
    const router = createTestRouter()
    await router.push('/favorites')
    await router.isReady()
    const wrapper = mount(CustomerHeader, {
      attachTo: document.body,
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH, activeKey: 'favorites' },
      global: { plugins: [pinia, router] },
    })
    wrappers.push(wrapper)
    await wrapper.get('[data-testid="desktop-account-trigger"]').trigger('click')
    await nextTick()
    const logoutButton = bodyButton('Đăng xuất')
    logoutButton?.click()
    await nextTick()
    logoutButton?.click()

    expect(logout).toHaveBeenCalledOnce()
    expect(logoutButton?.disabled).toBe(true)
    finishLogout?.()
    await flushPromises()
    expect(store.user).toBeNull()
    expect(router.currentRoute.value.path).toBe('/home')
    expect(wrapper.get('[data-testid="desktop-account-trigger"]').attributes('aria-label')).toBe('Tài khoản')
  })

  it('preserves the authenticated state and exposes feedback when logout fails', async () => {
    const store = useAuthStore(pinia)
    store.$patch({ user: user() })
    vi.spyOn(store, 'logout').mockRejectedValue(new Error('Backend unavailable'))
    const { wrapper } = await mountHeader()
    await wrapper.get('[data-testid="desktop-account-trigger"]').trigger('click')
    await nextTick()
    bodyButton('Đăng xuất')?.click()
    await flushPromises()

    expect(store.user).toEqual(user())
    expect(document.body.textContent).toContain('Không thể đăng xuất. Vui lòng thử lại.')
    expect(bodyButton('Đăng xuất')?.disabled).toBe(false)
  })

  it('opens the account bottom sheet from the existing fifth mobile navigation item', async () => {
    useAuthStore(pinia).$patch({ user: user() })
    const { wrapper } = await mountMobile()
    const trigger = wrapper.get('[data-testid="mobile-account-trigger"]')

    expect(wrapper.findAll('nav a')).toHaveLength(4)
    expect(wrapper.findAll('nav [data-navigation-key]')).toHaveLength(5)
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    ;(trigger.element as HTMLButtonElement).focus()
    await trigger.trigger('click')
    await nextTick()
    expect(document.body.textContent).toContain('an@example.com')
    expect(document.body.textContent).toContain('Đơn hàng của tôi')
    expect(wrapper.find('[data-testid="customer-account-menu-content"]').exists()).toBe(false)

    const close = document.body.querySelector<HTMLButtonElement>('button[aria-label="Đóng menu tài khoản"]')
    close?.click()
    await flushPromises()
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger.element))
  })

  it('supports guest mobile auth links and mobile logout without a competing header account action', async () => {
    const { wrapper } = await mountMobile()
    await wrapper.get('[data-testid="mobile-account-trigger"]').trigger('click')
    await nextTick()
    expect(bodyLink('Đăng nhập')?.getAttribute('href')).toBe('/login')
    expect(bodyLink('Tạo tài khoản')?.getAttribute('href')).toBe('/register')
    wrapper.unmount()
    document.body.innerHTML = ''

    const store = useAuthStore(pinia)
    store.$patch({ user: user() })
    vi.spyOn(store, 'logout').mockImplementation(async () => store.clearSession())
    const mobile = await mountMobile()
    await mobile.wrapper.get('[data-testid="mobile-account-trigger"]').trigger('click')
    await nextTick()
    bodyButton('Đăng xuất')?.click()
    await flushPromises()
    expect(store.user).toBeNull()
    expect(mobile.router.currentRoute.value.path).toBe('/home')

    const mobileHeader = mount(CustomerMobileHeader, {
      props: { selectedBranch: DEFAULT_CUSTOMER_BRANCH },
      global: { plugins: [pinia, mobile.router] },
    })
    wrappers.push(mobileHeader)
    expect(mobileHeader.find('[data-testid="mobile-account-trigger"]').exists()).toBe(false)
  })
})
