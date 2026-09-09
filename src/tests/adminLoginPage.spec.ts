/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, type Pinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import AdminLoginPage from '@/pages/admin/AdminLoginPage.vue'
import { useAuthStore } from '@/stores/auth'
import type { AuthenticatedUser } from '@/types/auth'

const authApiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  staffLogin: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))

vi.mock('@/api/auth/authApi', () => authApiMocks)

const REMEMBERED_EMAIL_KEY = 'mizuki:admin-remembered-email'
const wrappers: VueWrapper[] = []
const adminUser: AuthenticatedUser = {
  id: 7,
  name: 'Mizuki Super Admin',
  email: 'superadmin@mizuki.local',
  phone: null,
  avatar: null,
  role: 'super_admin',
  role_label: 'Quản trị viên',
  branch_id: null,
  email_verified_at: '2026-09-01T00:00:00Z',
  created_at: '2026-08-01T00:00:00Z',
}

interface MountedLogin {
  wrapper: VueWrapper
  router: Router
  pinia: Pinia
}

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/login', name: 'admin-login', component: AdminLoginPage },
      { path: '/admin/orders', name: 'admin-orders', component: { template: '<main>Orders</main>' } },
      { path: '/admin/refunds', name: 'admin-refunds', component: { template: '<main>Refunds</main>' } },
      { path: '/forbidden', name: 'forbidden', component: { template: '<main>Forbidden</main>' } },
    ],
  })
}

async function mountLogin(path = '/admin/login'): Promise<MountedLogin> {
  const pinia = createPinia()
  const router = createTestRouter()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(AdminLoginPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  })
  wrappers.push(wrapper)
  return { wrapper, router, pinia }
}

async function fillCredentials(wrapper: VueWrapper, email = ' admin@mizuki.vn '): Promise<void> {
  await wrapper.get('#staff-email').setValue(email)
  await wrapper.get('#staff-password').setValue('secure-password')
}

beforeEach(() => {
  window.localStorage.clear()
  document.body.innerHTML = ''
  vi.clearAllMocks()
  authApiMocks.staffLogin.mockResolvedValue({ ...adminUser })
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Admin Login V2', () => {
  it('renders clean Vietnamese copy and the customer wordmark treatment', async () => {
    const { wrapper } = await mountLogin()
    const source = readFileSync('src/pages/admin/AdminLoginPage.vue', 'utf8')

    expect(wrapper.get('[data-testid="admin-login-wordmark"]').text()).toBe('MIZUKI')
    expect(wrapper.get('[data-testid="admin-login-wordmark"]').classes()).toContain('customer-wordmark')
    const portalIdentity = wrapper.get('[data-testid="admin-portal-identity"]')
    expect(portalIdentity.text()).toBe('Admin Portal')
    expect(portalIdentity.classes()).toEqual(expect.arrayContaining(['items-center', 'gap-2']))
    expect(portalIdentity.get('[data-testid="admin-portal-shield"]').classes()).toEqual(
      expect.arrayContaining(['size-3.5', 'text-primary-800']),
    )
    expect(portalIdentity.get('[aria-hidden="true"]').classes()).toEqual(
      expect.arrayContaining(['size-6', 'rounded-lg', 'bg-primary-50']),
    )
    expect(wrapper.get('h1').text()).toBe('Chào mừng trở lại')
    expect(wrapper.text()).toContain('Đăng nhập để tiếp tục quản lý Mizuki.')
    expect(wrapper.text()).not.toContain('MIZUKI STAFF')
    expect(source).not.toMatch(/Ã|Ä|Â|áº|á»/)
  })

  it('uses a spacious responsive two-panel composition', async () => {
    const { wrapper } = await mountLogin()
    const shell = wrapper.get('[data-testid="admin-login-shell"]')
    const formPanel = wrapper.get('[data-testid="admin-login-form-panel"]')
    const atmosphere = wrapper.get('[data-testid="admin-login-visual-panel"]')
    const source = readFileSync('src/pages/admin/AdminLoginPage.vue', 'utf8')

    expect(shell.classes()).toContain('admin-login-shell')
    expect(formPanel.element.parentElement).toBe(shell.element)
    expect(atmosphere.element.parentElement).toBe(shell.element)
    expect(source).toContain('width: min(100%, 70rem)')
    expect(source).toContain('height: min(42.5rem, calc(100svh - 3rem))')
    expect(source).toContain('grid-template-columns: 44% 56%')
    expect(source).toContain('@media (min-width: 1024px)')
    expect(source).toContain('max-width: 25.625rem')
    expect(atmosphere.text()).toContain('Bảo mật & riêng tư')
    expect(atmosphere.find('.rounded-full').exists()).toBe(false)
    expect(atmosphere.find('.admin-login-ghost-wordmark').exists()).toBe(false)
    expect(atmosphere.get('[data-testid="admin-login-visual-image"]').attributes('src')).toBe(
      '/images/auth/login-hero-desktop.jpg',
    )
    expect(atmosphere.get('[data-testid="admin-login-visual-image"]').classes()).toEqual(
      expect.arrayContaining(['object-cover', 'object-center']),
    )
    expect(source).toContain('.admin-login-image-overlay')
  })

  it('keeps inputs and the high-contrast CTA inside the controlled form column', async () => {
    const { wrapper } = await mountLogin()
    const formPanel = wrapper.get('[data-testid="admin-login-form-panel"]')
    const form = wrapper.get('[data-testid="admin-login-form"]')
    const submit = form.get('button[type="submit"]')

    expect(formPanel.get('.admin-login-form-content').element.contains(form.element)).toBe(true)
    expect(form.get('#staff-email').classes()).toContain('w-full')
    expect(form.get('#staff-password').classes()).toContain('w-full')
    expect(submit.classes()).toEqual(expect.arrayContaining(['w-full', 'bg-primary-800', '!text-white']))
    expect(submit.classes()).toEqual(expect.arrayContaining([
      'rounded-2xl', 'hover:-translate-y-px', 'active:translate-y-0',
      'disabled:translate-y-0', 'disabled:shadow-none', 'duration-150',
    ]))
  })

  it('uses premium neutral input, focus, and autofill treatments without left-side icons', async () => {
    const { wrapper } = await mountLogin()
    for (const selector of ['#staff-email', '#staff-password']) {
      const input = wrapper.get(selector)
      expect(input.classes()).toEqual(expect.arrayContaining([
        'admin-login-input', 'appearance-none', 'bg-white/[0.96]', 'ring-1', 'ring-inset',
        'ring-[rgba(31,78,61,0.12)]', 'hover:ring-primary-700/15',
        'hover:shadow-[0_2px_4px_rgba(15,23,42,0.045),0_6px_16px_rgba(15,23,42,0.03)]',
        'h-[3.25rem]', 'rounded-[1.0625rem]',
        'focus:outline-none', 'focus:ring-2', 'focus:ring-primary-600/30',
        'focus:shadow-[0_0_0_4px_rgba(52,122,87,0.065),0_4px_12px_rgba(15,23,42,0.025)]',
      ]))
      expect(input.classes().some((className) => className.includes('bg-surface-subtle'))).toBe(false)
      expect(input.classes().some((className) => className.startsWith('border-'))).toBe(false)
      expect(input.classes().some((className) => className.includes('ring-black'))).toBe(false)
    }
    const source = readFileSync('src/pages/admin/AdminLoginPage.vue', 'utf8')
    expect(source).toContain('.admin-login-input:-webkit-autofill')
    expect(source).toContain('.admin-login-input:-webkit-autofill:hover')
    expect(source).toContain('.admin-login-input:-webkit-autofill:focus')
    expect(source).toContain('.admin-login-input:-webkit-autofill:active')
    expect(source).toContain('-webkit-text-fill-color: #17231d')
    expect(source).toMatch(/-webkit-box-shadow:\s*\n\s*0 0 0 1000px .* inset/)
    expect(source).toContain('0 0 0 1px rgb(31 78 61 / 0.12) inset')
    expect(source).toContain('0 0 0 2px rgb(52 122 87 / 0.3) inset')
    expect(source).toContain('border-radius: 1.0625rem')
    expect(source).toContain('background-color 9999s ease-out 0s')
    expect(wrapper.get('#staff-email').classes()).toContain('px-4')
    expect(wrapper.get('#staff-password').classes()).toEqual(expect.arrayContaining(['pl-4', 'pr-12']))
    expect(wrapper.get('[data-testid="email-field"]').find('svg').exists()).toBe(false)
    expect(wrapper.get('[data-testid="password-field"]').findAll('svg')).toHaveLength(1)
    expect(wrapper.get('button[aria-label="Hiện mật khẩu"]').classes()).toContain('size-8')
  })

  it('renders the checkbox mark only when checked and supports label toggling', async () => {
    const { wrapper } = await mountLogin()
    const remember = wrapper.get('[data-testid="remember-email-checkbox"]')
    expect(remember.classes()).toEqual(expect.arrayContaining(['peer', 'sr-only']))
    expect(remember.element.nextElementSibling?.className).toContain('peer-focus-visible:ring-2')
    expect(remember.element.nextElementSibling?.className).toContain('size-[1.125rem]')
    expect(wrapper.find('[data-testid="remember-email-check"]').exists()).toBe(false)

    await wrapper.get('[data-testid="remember-email-label"]').trigger('click')
    expect((remember.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.find('[data-testid="remember-email-check"]').exists()).toBe(true)

    await wrapper.get('[data-testid="remember-email-label"]').trigger('click')
    expect((remember.element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.find('[data-testid="remember-email-check"]').exists()).toBe(false)
  })

  it('opens a semantic local recovery notice without navigation and closes it on click or Escape', async () => {
    const { wrapper, router } = await mountLogin()
    const forgot = wrapper.get('[data-testid="forgot-password-trigger"]')
    expect(forgot.element.tagName).toBe('BUTTON')
    expect(forgot.attributes('type')).toBe('button')
    expect(forgot.classes()).toContain('cursor-pointer')
    expect(forgot.classes()).not.toEqual(expect.arrayContaining(['cursor-help', 'cursor-not-allowed']))

    await forgot.trigger('click')
    expect(wrapper.get('[data-testid="forgot-password-notice"]').text()).toBe(
      'Khôi phục mật khẩu cho nhân viên đang được hoàn thiện.',
    )
    expect(forgot.attributes('aria-expanded')).toBe('true')
    expect(router.currentRoute.value.fullPath).toBe('/admin/login')

    await forgot.trigger('click')
    expect(wrapper.find('[data-testid="forgot-password-notice"]').exists()).toBe(false)
    await forgot.trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('[data-testid="forgot-password-notice"]').exists()).toBe(false)
  })

  it('renders accessible staff fields and only the approved utility actions', async () => {
    const { wrapper } = await mountLogin()
    const email = wrapper.get('#staff-email')
    const password = wrapper.get('#staff-password')

    expect(wrapper.get('label[for="staff-email"]').text()).toBe('Email')
    expect(email.attributes()).toMatchObject({ type: 'email', autocomplete: 'username' })
    expect(wrapper.get('label[for="staff-password"]').text()).toBe('Mật khẩu')
    expect(password.attributes()).toMatchObject({ type: 'password', autocomplete: 'current-password' })
    expect(wrapper.text()).toContain('Ghi nhớ email')
    const forgot = wrapper.get('[data-testid="forgot-password-trigger"]')
    expect(forgot.text()).toBe('Quên mật khẩu?')
    expect(wrapper.find('a[href*="forgot"]').exists()).toBe(false)
    expect(wrapper.findAll('button').some((button) => button.text().includes('Quên mật khẩu?'))).toBe(true)
    expect(wrapper.text()).not.toMatch(/Đăng ký|Tạo tài khoản|Google|Facebook|Apple login/i)
  })

  it('toggles password visibility with accessible labels', async () => {
    const { wrapper } = await mountLogin()
    const password = wrapper.get('#staff-password')

    await wrapper.get('button[aria-label="Hiện mật khẩu"]').trigger('click')
    expect(password.attributes('type')).toBe('text')
    await wrapper.get('button[aria-label="Ẩn mật khẩu"]').trigger('click')
    expect(password.attributes('type')).toBe('password')
  })

  it('stores only a remembered email, restores it, and removes it when unchecked', async () => {
    const first = await mountLogin()
    await first.wrapper.get('#staff-email').setValue(' remembered@mizuki.vn ')
    await first.wrapper.get('input[type="checkbox"]').setValue(true)
    await nextTick()

    expect(window.localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBe('remembered@mizuki.vn')
    expect([...Array(window.localStorage.length)].map((_, index) => window.localStorage.key(index))).toEqual([
      REMEMBERED_EMAIL_KEY,
    ])
    first.wrapper.unmount()
    wrappers.splice(wrappers.indexOf(first.wrapper), 1)
    document.body.innerHTML = ''

    const restored = await mountLogin()
    expect((restored.wrapper.get('#staff-email').element as HTMLInputElement).value).toBe('remembered@mizuki.vn')
    expect((restored.wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)
    await restored.wrapper.get('input[type="checkbox"]').setValue(false)
    await nextTick()
    expect(window.localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBeNull()
  })

  it('submits through the existing staff login behavior and preserves safe redirects', async () => {
    const { wrapper, router, pinia } = await mountLogin('/admin/login?redirect=/admin/refunds')
    await fillCredentials(wrapper)
    await wrapper.get('[data-testid="admin-login-form"]').trigger('submit')
    await flushPromises()

    expect(authApiMocks.staffLogin).toHaveBeenCalledWith({
      email: 'admin@mizuki.vn',
      password: 'secure-password',
    })
    expect(useAuthStore(pinia).user).toEqual(adminUser)
    expect(router.currentRoute.value.path).toBe('/admin/refunds')
  })

  it('shows a loading label and prevents duplicate submissions', async () => {
    let finishLogin: ((user: AuthenticatedUser) => void) | undefined
    authApiMocks.staffLogin.mockReturnValue(new Promise<AuthenticatedUser>((resolve) => {
      finishLogin = resolve
    }))
    const { wrapper } = await mountLogin()
    await fillCredentials(wrapper)
    const form = wrapper.get('[data-testid="admin-login-form"]')
    await form.trigger('submit')
    await form.trigger('submit')
    await nextTick()

    expect(authApiMocks.staffLogin).toHaveBeenCalledOnce()
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.text()).toContain('Đang đăng nhập...')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(submit.attributes('aria-busy')).toBe('true')
    finishLogin?.({ ...adminUser })
    await flushPromises()
  })

  it('presents API and fallback failures as compact accessible errors', async () => {
    authApiMocks.staffLogin.mockRejectedValueOnce({
      name: 'ApplicationError',
      kind: 'unauthorized',
      message: 'Thông tin đăng nhập không chính xác.',
      cause: null,
    })
    const { wrapper } = await mountLogin()
    await fillCredentials(wrapper)
    await wrapper.get('[data-testid="admin-login-form"]').trigger('submit')
    await flushPromises()

    const alert = wrapper.get('[data-testid="admin-login-error"]')
    expect(alert.attributes('role')).toBe('alert')
    expect(alert.text()).toBe('Thông tin đăng nhập không chính xác.')
    expect(alert.classes()).toEqual(expect.arrayContaining(['bg-rose-50', 'text-rose-700']))

    authApiMocks.staffLogin.mockRejectedValueOnce(new Error('Network unavailable'))
    await wrapper.get('[data-testid="admin-login-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-testid="admin-login-error"]').text()).toBe(
      'Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.',
    )
  })

  it('preserves the existing role guard for non-admin staff', async () => {
    authApiMocks.staffLogin.mockResolvedValue({ ...adminUser, role: 'cashier' })
    const { wrapper, router, pinia } = await mountLogin()
    await fillCredentials(wrapper)
    await wrapper.get('[data-testid="admin-login-form"]').trigger('submit')
    await flushPromises()

    expect(useAuthStore(pinia).user).toBeNull()
    expect(router.currentRoute.value.path).toBe('/forbidden')
  })
})
