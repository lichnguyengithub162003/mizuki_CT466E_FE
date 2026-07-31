import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import LoginPage from '@/pages/auth/LoginPage.vue'
import GoogleOAuthCallbackPage from '@/pages/auth/GoogleOAuthCallbackPage.vue'
import { useAuthStore } from '@/stores/auth'
import { createAppRouter } from '@/router'
import { ROUTE_NAMES } from '@/constants/routes'
import {
  GOOGLE_OAUTH_ERROR_MESSAGES,
  getGoogleOAuthErrorMessage,
} from '@/constants/googleOAuth'
import { isSafeAuthRedirect, resolveSafeAuthRedirect } from '@/utils/auth/safeAuthRedirect'
import type { AuthenticatedUser } from '@/types/auth'

const authApiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  getGoogleRedirectUrl: vi.fn(),
  requestPasswordReset: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  resetPassword: vi.fn(),
  initializeAuthCsrf: vi.fn(),
}))

const navigationMocks = vi.hoisted(() => ({ assignBrowserLocation: vi.fn() }))

vi.mock('@/api/auth/authApi', () => authApiMocks)
vi.mock('@/utils/auth/browserNavigation', () => navigationMocks)

const customer: AuthenticatedUser = {
  id: 7,
  name: 'Mizuki Customer',
  email: 'customer@example.com',
  phone: null,
  avatar: null,
  role: 'customer',
  role_label: 'Khách hàng',
  branch_id: null,
  email_verified_at: '2026-08-01T00:00:00Z',
  created_at: '2026-08-01T00:00:00Z',
}

function createLoginRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: ROUTE_NAMES.login, component: LoginPage },
      { path: '/home', component: { template: '<main>Home</main>' } },
      { path: '/checkout', component: { template: '<main>Checkout</main>' } },
      { path: '/register', component: { template: '<main>Register</main>' } },
      { path: '/forgot-password', component: { template: '<main>Forgot</main>' } },
    ],
  })
}

async function mountLogin(location = '/login'): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createLoginRouter()
  await router.push(location)
  await router.isReady()
  const wrapper = mount(LoginPage, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  })
  return { wrapper, router }
}

function googleButton(wrapper: VueWrapper) {
  const button = wrapper.findAll('button').find((item) => item.text().includes('Google'))
  if (!button) throw new Error('Google button not found')
  return button
}

function createCallbackRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/google/callback', name: ROUTE_NAMES.googleCallback, component: GoogleOAuthCallbackPage },
      { path: '/login', name: ROUTE_NAMES.login, component: { template: '<main>Login</main>' } },
      { path: '/home', component: { template: '<main>Home</main>' } },
      { path: '/checkout', component: { template: '<main>Checkout</main>' } },
    ],
  })
}

async function mountCallback(location: string) {
  const router = createCallbackRouter()
  const replaceSpy = vi.spyOn(router, 'replace')
  const pinia = createPinia()
  const store = useAuthStore(pinia)
  store.clearSession()
  await router.push(location)
  await router.isReady()
  mount(GoogleOAuthCallbackPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return { router, store, replaceSpy }
}

describe('Google OAuth browser redirect integration', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.clearAllMocks()
    authApiMocks.getGoogleRedirectUrl.mockResolvedValue(
      'https://accounts.google.com/o/oauth2/auth?state=opaque',
    )
    authApiMocks.getCurrentUser.mockResolvedValue(customer)
    authApiMocks.logout.mockResolvedValue(undefined)
  })

  it('gets the backend redirect URL, forwards a safe intended path, and navigates once', async () => {
    const { wrapper } = await mountLogin('/login?redirect=/checkout')
    await googleButton(wrapper).trigger('click')
    await flushPromises()

    expect(authApiMocks.getGoogleRedirectUrl).toHaveBeenCalledWith('/checkout')
    expect(navigationMocks.assignBrowserLocation).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/auth?state=opaque',
    )
  })

  it('disables Google login and prevents duplicate redirect requests while pending', async () => {
    let resolveRedirect: ((value: string) => void) | undefined
    authApiMocks.getGoogleRedirectUrl.mockReturnValue(
      new Promise<string>((resolve) => { resolveRedirect = resolve }),
    )
    const { wrapper } = await mountLogin()
    const button = googleButton(wrapper)

    await button.trigger('click')
    await button.trigger('click')

    expect(authApiMocks.getGoogleRedirectUrl).toHaveBeenCalledOnce()
    expect(button.attributes('disabled')).toBeDefined()
    resolveRedirect?.('https://accounts.google.com/oauth')
    await flushPromises()
  })

  it('shows a safe API error instead of navigating when redirect initialization fails', async () => {
    authApiMocks.getGoogleRedirectUrl.mockRejectedValue({
      name: 'ApplicationError',
      kind: 'http',
      message: 'Không thể bắt đầu đăng nhập Google.',
    })
    const { wrapper } = await mountLogin()
    await googleButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Không thể bắt đầu đăng nhập Google.')
    expect(navigationMocks.assignBrowserLocation).not.toHaveBeenCalled()
  })

  it('maps every backend OAuth error code and removes it from the address bar', async () => {
    for (const [code, message] of Object.entries(GOOGLE_OAUTH_ERROR_MESSAGES)) {
      expect(getGoogleOAuthErrorMessage(code)).toBe(message)
    }
    expect(getGoogleOAuthErrorMessage('unexpected_code')).toBe(
      GOOGLE_OAUTH_ERROR_MESSAGES.google_auth_failed,
    )

    const { wrapper, router } = await mountLogin('/login?oauth_error=google_cancelled')
    await flushPromises()
    expect(wrapper.text()).toContain(GOOGLE_OAUTH_ERROR_MESSAGES.google_cancelled)
    expect(router.currentRoute.value.query.oauth_error).toBeUndefined()
  })

  it('restores the cookie session on callback and replaces history with the safe destination', async () => {
    const { router, store, replaceSpy } = await mountCallback(
      '/auth/google/callback?status=success&redirect=/checkout&token=ignored',
    )

    expect(authApiMocks.getCurrentUser).toHaveBeenCalledOnce()
    expect(store.user).toEqual(customer)
    expect(router.currentRoute.value.path).toBe('/checkout')
    expect(replaceSpy).toHaveBeenCalledWith('/checkout')
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it('replaces a successful callback without an intended route with customer home', async () => {
    const { router, replaceSpy } = await mountCallback('/auth/google/callback?status=success')
    expect(router.currentRoute.value.path).toBe('/home')
    expect(replaceSpy).toHaveBeenCalledWith('/home')
  })

  it('falls back home for unsafe callback redirects and rejects failed restoration', async () => {
    const first = await mountCallback(
      '/auth/google/callback?status=success&redirect=https://evil.example',
    )
    expect(first.router.currentRoute.value.path).toBe('/home')

    authApiMocks.getCurrentUser.mockRejectedValue({
      name: 'ApplicationError',
      kind: 'unauthorized',
      message: 'Unauthenticated',
    })
    const second = await mountCallback('/auth/google/callback?status=success')
    expect(second.router.currentRoute.value.name).toBe(ROUTE_NAMES.login)
    expect(second.router.currentRoute.value.query.oauth_error).toBe('google_auth_failed')
  })

  it('signs out a non-customer callback session and returns a staff-safe error', async () => {
    authApiMocks.getCurrentUser.mockResolvedValue({ ...customer, role: 'branch_manager' })
    const { router, store } = await mountCallback('/auth/google/callback?status=success')

    expect(authApiMocks.logout).toHaveBeenCalledOnce()
    expect(store.user).toBeNull()
    expect(router.currentRoute.value.query.oauth_error).toBe('google_staff_account')
  })

  it('registers the callback outside guest-only guards', () => {
    const router = createAppRouter(createMemoryHistory())
    const callback = router.getRoutes().find((route) => route.name === ROUTE_NAMES.googleCallback)
    expect(callback).toBeDefined()
    expect(callback?.meta.guestOnly).toBeUndefined()
  })
})

describe('safe OAuth redirect policy', () => {
  it('accepts one-slash local paths and rejects external, encoded, auth, and control paths', () => {
    expect(resolveSafeAuthRedirect('/products?sort=new')).toBe('/products?sort=new')
    expect(isSafeAuthRedirect('//evil.example')).toBe(false)
    expect(isSafeAuthRedirect('https://evil.example')).toBe(false)
    expect(isSafeAuthRedirect('/%2F%2Fevil.example')).toBe(false)
    expect(isSafeAuthRedirect('/\\evil.example')).toBe(false)
    expect(isSafeAuthRedirect('/home%0ASet-Cookie:test')).toBe(false)
    expect(isSafeAuthRedirect('/login')).toBe(false)
    expect(isSafeAuthRedirect('/auth/google/callback')).toBe(false)
    expect(resolveSafeAuthRedirect('/login')).toBe('/home')
  })
})
