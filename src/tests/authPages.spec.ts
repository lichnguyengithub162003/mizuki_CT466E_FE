import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage.vue'
import LoginPage from '@/pages/auth/LoginPage.vue'
import OnboardingPage from '@/pages/auth/OnboardingPage.vue'
import RegisterPage from '@/pages/auth/RegisterPage.vue'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage.vue'
import VerifyResetCodePage from '@/pages/auth/VerifyResetCodePage.vue'
import { createAppRouter } from '@/router'
import { pinia as appPinia } from '@/stores/pinia'
import { useAuthStore } from '@/stores/auth'
import { normalizeAuthEmail, usePasswordRecovery } from '@/composables/auth/usePasswordRecovery'
import type { AuthenticatedUser } from '@/types/auth'
import type { ApplicationError } from '@/types/errors'

const authApiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  resetPassword: vi.fn(),
  initializeAuthCsrf: vi.fn(),
  getGoogleRedirectUrl: vi.fn(),
}))

const browserNavigationMocks = vi.hoisted(() => ({
  assignBrowserLocation: vi.fn(),
}))

vi.mock('@/api/auth/authApi', () => authApiMocks)
vi.mock('@/utils/auth/browserNavigation', () => browserNavigationMocks)

const user: AuthenticatedUser = {
  id: 1,
  name: 'Customer',
  email: 'customer@example.com',
  phone: null,
  avatar: null,
  role: 'customer',
  role_label: 'Khách hàng',
  branch_id: null,
  email_verified_at: null,
  created_at: '2026-07-31T00:00:00Z',
}

interface MountedAuthPage {
  readonly wrapper: VueWrapper
  readonly router: Router
}

function stubMatchMedia(initialMatches: boolean): {
  setMatches: (matches: boolean) => void
} {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const mediaQuery = {
    matches: initialMatches,
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    }),
  }

  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))

  return {
    setMatches(matches: boolean): void {
      mediaQuery.matches = matches
      const event = { matches, media: mediaQuery.media } as MediaQueryListEvent
      listeners.forEach((listener) => listener(event))
    },
  }
}

function applicationError(
  message: string,
  validationErrors?: Readonly<Record<string, readonly string[]>>,
  retryAfter?: number,
): ApplicationError {
  return {
    name: 'ApplicationError',
    kind: validationErrors ? 'validation' : 'http',
    message,
    validationErrors,
    retryAfter,
    cause: null,
  }
}

function createPageRouter(component: object, path = '/test'): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path, component },
      { path: '/home', component: { template: '<main>Trang chủ</main>' } },
      { path: '/onboarding', name: 'onboarding', component: OnboardingPage },
      { path: '/login', name: 'login', component: LoginPage },
      { path: '/register', name: 'register', component: RegisterPage },
      { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordPage },
      { path: '/verify-reset-code', name: 'verify-reset-code', component: VerifyResetCodePage },
      { path: '/reset-password', name: 'reset-password', component: ResetPasswordPage },
    ],
  })
}

async function mountPage(component: object, path = '/test'): Promise<MountedAuthPage> {
  const router = createPageRouter(component, path)
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  })
  return { wrapper, router }
}

async function fillLogin(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('input[name="email"]').setValue('  CUSTOMER@EXAMPLE.COM  ')
  await wrapper.get('input[name="password"]').setValue('password')
}

async function fillRegister(wrapper: VueWrapper, phone: string | null = '0368123456'): Promise<void> {
  await wrapper.get('input[name="fullName"]').setValue('Nguyễn Văn A')
  await wrapper.get('input[name="email"]').setValue('  USER@EXAMPLE.COM ')
  if (phone !== null) await wrapper.get('input[name="phone"]').setValue(phone)
  await wrapper.get('input[name="password"]').setValue('Password123!')
  await wrapper.get('input[name="confirmPassword"]').setValue('Password123!')
  await wrapper.get('[role="checkbox"]').trigger('click')
}

describe('F3g customer authentication integration', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
    usePasswordRecovery().clear()
    useAuthStore(appPinia).resetForTesting()
    vi.clearAllMocks()
    stubMatchMedia(true)
    authApiMocks.login.mockResolvedValue(user)
    authApiMocks.register.mockResolvedValue(user)
    authApiMocks.getCurrentUser.mockRejectedValue(applicationError('Bạn cần đăng nhập để tiếp tục'))
    authApiMocks.logout.mockResolvedValue(undefined)
    authApiMocks.requestPasswordReset.mockResolvedValue({ resend_after: 60, expires_in: 300 })
    authApiMocks.verifyPasswordResetCode.mockResolvedValue({
      verification_token: 'v'.repeat(64),
      expires_in: 600,
    })
    authApiMocks.resetPassword.mockResolvedValue(undefined)
    authApiMocks.getGoogleRedirectUrl.mockResolvedValue('https://accounts.google.com/o/oauth2/auth?state=opaque')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('preserves onboarding and approved local auth visuals', async () => {
    const onboarding = await mountPage(OnboardingPage, '/onboarding')
    expect(onboarding.wrapper.findAll('[aria-label^="Xem bước"]')).toHaveLength(2)
    expect(onboarding.wrapper.get('[data-testid="onboarding-image"]').attributes('src')).toBe('/images/auth/onboarding-1.jpg')
    expect(onboarding.wrapper.get('h1').text()).toBe('Chọn chăm sóc hợp với bạn.')
    expect(onboarding.wrapper.text()).toContain('MIZUKI EVERYDAY')

    const continueButton = onboarding.wrapper.findAll('button').find((button) => button.text().includes('Tiếp tục'))
    expect(continueButton).toBeDefined()
    await continueButton?.trigger('click')
    expect(onboarding.wrapper.get('[data-testid="onboarding-image"]').attributes('src')).toBe('/images/auth/onboarding-2.jpg')
    expect(onboarding.wrapper.get('h1').text()).toBe('Đặt lịch, chọn chi nhánh, thư giãn.')
    expect(onboarding.wrapper.text()).toContain('CHĂM SÓC GẦN BẠN')

    const startButton = onboarding.wrapper.findAll('button').find((button) => button.text().includes('Bắt đầu'))
    expect(startButton).toBeDefined()
    await startButton?.trigger('click')
    await flushPromises()
    expect(window.localStorage.getItem('mizuki:onboarding-seen')).toBe('true')
    expect(onboarding.router.currentRoute.value.path).toBe('/login')

    const login = await mountPage(LoginPage)
    expect(login.wrapper.get('[data-testid="auth-hero-image"]').attributes('src')).toBe('/images/auth/login-hero-mobile.jpg')
    expect(login.wrapper.find('[src^="http"]').exists()).toBe(false)
  })

  it('preserves onboarding skip and mobile-only routing behavior', async () => {
    const onboarding = await mountPage(OnboardingPage, '/onboarding')
    const skipButton = onboarding.wrapper.findAll('button').find((button) => button.text().includes('Bỏ qua'))
    expect(skipButton).toBeDefined()
    await skipButton?.trigger('click')
    await flushPromises()
    expect(window.localStorage.getItem('mizuki:onboarding-seen')).toBe('true')
    expect(onboarding.router.currentRoute.value.path).toBe('/login')

    window.localStorage.clear()
    stubMatchMedia(true)
    const mobileRouter = createAppRouter(createMemoryHistory())
    await mobileRouter.push('/login')
    expect(mobileRouter.currentRoute.value.path).toBe('/onboarding')

    window.localStorage.setItem('mizuki:onboarding-seen', 'true')
    await mobileRouter.push('/login')
    expect(mobileRouter.currentRoute.value.path).toBe('/login')

    stubMatchMedia(false)
    const desktopRouter = createAppRouter(createMemoryHistory())
    await desktopRouter.push('/login')
    expect(desktopRouter.currentRoute.value.path).toBe('/login')
    await desktopRouter.push('/onboarding')
    expect(desktopRouter.currentRoute.value.path).toBe('/login')

    vi.stubGlobal('matchMedia', undefined)
    const routerWithoutMatchMedia = createAppRouter(createMemoryHistory())
    window.localStorage.clear()
    await routerWithoutMatchMedia.push('/login')
    expect(routerWithoutMatchMedia.currentRoute.value.path).toBe('/login')
    await routerWithoutMatchMedia.push('/onboarding')
    expect(routerWithoutMatchMedia.currentRoute.value.path).toBe('/login')
  })

  it('leaves onboarding immediately when the viewport crosses the mobile breakpoint', async () => {
    const viewport = stubMatchMedia(true)
    const onboarding = await mountPage(OnboardingPage, '/onboarding')

    viewport.setMatches(false)
    await flushPromises()

    expect(onboarding.router.currentRoute.value.path).toBe('/login')
  })

  it('keeps floating labels accessible and responds to focus, values, and password visibility', async () => {
    const { wrapper } = await mountPage(LoginPage)
    const email = wrapper.get('input[name="email"]')
    const emailInput = email.element as HTMLInputElement
    const emailId = email.attributes('id')
    const emailLabel = wrapper.get(`label[for="${emailId}"]`)

    expect(emailId).toBeTruthy()
    expect(email.attributes('placeholder')).toBe(' ')
    expect(emailLabel.text()).toContain('Email')
    expect(email.element.nextElementSibling).toBe(emailLabel.element)
    expect(emailLabel.classes()).toContain('top-1/2')

    emailInput.focus()
    await email.trigger('focus')
    expect(document.activeElement).toBe(email.element)
    await email.setValue('customer@example.com')
    await email.trigger('blur')
    expect(emailInput.value).toBe('customer@example.com')

    const password = wrapper.get('input[name="password"]')
    expect(password.attributes('type')).toBe('password')
    await wrapper.get('button[aria-label="Hiện mật khẩu"]').trigger('click')
    expect(password.attributes('type')).toBe('text')
    expect(wrapper.get('button[aria-label="Ẩn mật khẩu"]')).toBeTruthy()
  })

  it('submits normalized login credentials and stores the authenticated user', async () => {
    const { wrapper, router } = await mountPage(LoginPage)
    await fillLogin(wrapper)
    await wrapper.get('[data-testid="login-form"]').trigger('submit')
    await vi.waitFor(() => expect(authApiMocks.login).toHaveBeenCalledWith({ email: 'customer@example.com', password: 'password' }))
    expect(authApiMocks.login.mock.calls[0]?.[0]).not.toHaveProperty('phone')
    expect(useAuthStore().user).toEqual(user)
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('switches credential modes below Google while preserving the password and clearing stale errors', async () => {
    authApiMocks.login.mockRejectedValueOnce(applicationError('Dữ liệu không hợp lệ', {
      email: ['Email không hợp lệ.'],
    }))
    const { wrapper } = await mountPage(LoginPage)
    await fillLogin(wrapper)
    await wrapper.get('[data-testid="login-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Email không hợp lệ.'))

    const google = wrapper.findAll('button').find((button) => button.text().includes('Google'))
    const toggle = wrapper.get('[data-testid="credential-mode-toggle"]')
    if (!google) throw new Error('Google button not found')
    expect(google.element.compareDocumentPosition(toggle.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(toggle.attributes('type')).toBe('button')
    expect(toggle.text()).toBe('Đăng nhập bằng số điện thoại')
    await toggle.trigger('click')

    expect(wrapper.get('input[name="email"]').isVisible()).toBe(false)
    const phone = wrapper.get('input[name="phone"]')
    expect(phone.isVisible()).toBe(true)
    expect(phone.attributes()).toMatchObject({ type: 'tel', inputmode: 'tel', autocomplete: 'tel' })
    expect((wrapper.get('input[name="password"]').element as HTMLInputElement).value).toBe('password')
    expect(wrapper.text()).not.toContain('Email không hợp lệ.')
    expect(wrapper.text()).not.toMatch(/OTP/i)
    expect(wrapper.get('a[href="/forgot-password"]').text()).toContain('Quên mật khẩu?')
    expect(toggle.text()).toBe('Đăng nhập bằng email')

    await toggle.trigger('click')
    expect(wrapper.get('input[name="phone"]').isVisible()).toBe(false)
    expect(wrapper.get('input[name="email"]').isVisible()).toBe(true)
    expect(wrapper.get('input[name="email"]').attributes('type')).toBe('email')
    expect((wrapper.get('input[name="password"]').element as HTMLInputElement).value).toBe('password')
  })

  it('submits the exact phone-only login payload', async () => {
    const { wrapper, router } = await mountPage(LoginPage)
    await wrapper.get('[data-testid="credential-mode-toggle"]').trigger('click')
    await wrapper.get('input[name="phone"]').setValue('0368123456')
    await wrapper.get('input[name="password"]').setValue('password')
    await wrapper.get('[data-testid="login-form"]').trigger('submit')

    await vi.waitFor(() => expect(authApiMocks.login).toHaveBeenCalledWith({
      phone: '0368123456',
      password: 'password',
    }))
    expect(authApiMocks.login.mock.calls[0]?.[0]).not.toHaveProperty('email')
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('shows invalid credentials and maps backend field errors', async () => {
    authApiMocks.login.mockRejectedValue(applicationError('Thông tin đăng nhập không đúng!', {
      email: ['Email không hợp lệ.'],
    }))
    const { wrapper } = await mountPage(LoginPage)
    await fillLogin(wrapper)
    await wrapper.get('[data-testid="login-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Email không hợp lệ.'))
    expect(wrapper.text()).toContain('Email không hợp lệ.')
    expect(wrapper.text()).not.toContain('Thông tin đăng nhập không đúng!')
    expect(wrapper.text()).not.toContain('Vui lòng kiểm tra lại thông tin')
  })

  it('prevents duplicate login while the request is pending', async () => {
    let resolveLogin: ((value: AuthenticatedUser) => void) | undefined
    authApiMocks.login.mockReturnValue(new Promise<AuthenticatedUser>((resolve) => { resolveLogin = resolve }))
    const { wrapper } = await mountPage(LoginPage)
    await fillLogin(wrapper)
    await wrapper.get('[data-testid="login-form"]').trigger('submit')
    await wrapper.get('[data-testid="login-form"]').trigger('submit')
    await vi.waitFor(() => expect(authApiMocks.login).toHaveBeenCalledTimes(1))
    resolveLogin?.(user)
    await flushPromises()
  })

  it('registers with the exact backend payload including canonical phone', async () => {
    const { wrapper, router } = await mountPage(RegisterPage)
    const phone = wrapper.get('input[name="phone"]')
    expect(phone.attributes()).toMatchObject({ type: 'tel', inputmode: 'tel', autocomplete: 'tel', required: '' })
    await fillRegister(wrapper)
    await wrapper.get('[data-testid="register-form"]').trigger('submit')
    await vi.waitFor(() => expect(authApiMocks.register).toHaveBeenCalledOnce())

    const payload = authApiMocks.register.mock.calls[0]?.[0]
    expect(payload).toEqual({
      name: 'Nguyễn Văn A',
      email: 'user@example.com',
      phone: '0368123456',
      password: 'Password123!',
      password_confirmation: 'Password123!',
    })
    expect(useAuthStore().user).toEqual(user)
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('disables every editable registration field while submission is pending', async () => {
    let resolveRegister: ((value: AuthenticatedUser) => void) | undefined
    authApiMocks.register.mockReturnValue(new Promise<AuthenticatedUser>((resolve) => { resolveRegister = resolve }))
    const { wrapper } = await mountPage(RegisterPage)
    await fillRegister(wrapper)
    await wrapper.get('[data-testid="register-form"]').trigger('submit')
    await vi.waitFor(() => expect(authApiMocks.register).toHaveBeenCalledOnce())

    for (const input of wrapper.findAll('[data-testid="register-form"] input')) {
      expect(input.attributes('disabled')).toBeDefined()
    }

    resolveRegister?.(user)
    await flushPromises()
  })

  it('requires a canonical Vietnamese mobile number for registration', async () => {
    const { wrapper } = await mountPage(RegisterPage)
    await fillRegister(wrapper, null)
    await wrapper.get('[data-testid="register-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Vui lòng nhập số điện thoại.'))
    expect(wrapper.text()).not.toContain('Vui lòng kiểm tra lại thông tin')
    expect(authApiMocks.register).not.toHaveBeenCalled()

    await wrapper.get('input[name="phone"]').setValue('0212345678')
    await wrapper.get('[data-testid="register-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Số điện thoại chưa đúng định dạng Việt Nam.'))
    expect(authApiMocks.register).not.toHaveBeenCalled()
  })

  it('maps backend registration phone errors to the phone field', async () => {
    authApiMocks.register.mockRejectedValue(applicationError('Dữ liệu không hợp lệ', {
      phone: ['Số điện thoại đã được sử dụng.'],
    }))
    const { wrapper } = await mountPage(RegisterPage)
    await fillRegister(wrapper)
    await wrapper.get('[data-testid="register-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Số điện thoại đã được sử dụng.'))
  })

  it('shows duplicate registration email returned by Laravel', async () => {
    authApiMocks.register.mockRejectedValue(applicationError('Dữ liệu không hợp lệ', {
      email: ['Email đã được sử dụng.'],
    }))
    const { wrapper } = await mountPage(RegisterPage)
    await fillRegister(wrapper)
    await wrapper.get('[data-testid="register-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Email đã được sử dụng.'))
  })

  it('requests recovery, stores only email/timing metadata, and navigates', async () => {
    const { wrapper, router } = await mountPage(ForgotPasswordPage, '/forgot-password')
    await wrapper.get('input[name="email"]').setValue('  USER@EXAMPLE.COM ')
    await wrapper.get('[data-testid="forgot-form"]').trigger('submit')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/verify-reset-code'))

    const recovery = usePasswordRecovery().state
    expect(authApiMocks.requestPasswordReset).toHaveBeenCalledWith({ email: 'user@example.com' })
    expect(recovery.email).toBe('user@example.com')
    expect(recovery.resendAvailableAt).toBeGreaterThan(Date.now() + 58_000)
    expect(recovery.verificationToken).toBe('')
  })

  it('keeps forgot-password in place and displays backend errors', async () => {
    authApiMocks.requestPasswordReset.mockRejectedValue(applicationError('Dữ liệu không hợp lệ', {
      email: ['Không tìm thấy email.'],
    }))
    const { wrapper, router } = await mountPage(ForgotPasswordPage, '/forgot-password')
    await wrapper.get('input[name="email"]').setValue('missing@example.com')
    await wrapper.get('[data-testid="forgot-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Không tìm thấy email.'))
    expect(router.currentRoute.value.path).toBe('/forgot-password')
  })

  it('submits exactly six digits and stores only the returned verification token', async () => {
    usePasswordRecovery().startRequest('user@example.com', 60, 300)
    const { wrapper, router } = await mountPage(VerifyResetCodePage, '/verify-reset-code')
    await wrapper.get('input[name="code"]').setValue('12a34b56')
    expect((wrapper.get('input[name="code"]').element as HTMLInputElement).value).toBe('123456')
    await wrapper.get('[data-testid="verify-code-form"]').trigger('submit')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/reset-password'))

    expect(authApiMocks.verifyPasswordResetCode).toHaveBeenCalledWith({ email: 'user@example.com', code: '123456' })
    expect(usePasswordRecovery().state.verificationToken).toBe('v'.repeat(64))
    expect(usePasswordRecovery().state).not.toHaveProperty('code')
  })

  it('relies on backend OTP validation and displays wrong or throttled OTP errors', async () => {
    authApiMocks.verifyPasswordResetCode.mockRejectedValue(applicationError('Mã xác thực không đúng!'))
    usePasswordRecovery().startRequest('user@example.com', 0, 300)
    const { wrapper } = await mountPage(VerifyResetCodePage, '/verify-reset-code')
    await wrapper.get('input[name="code"]').setValue('654321')
    await wrapper.get('[data-testid="verify-code-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Mã xác thực không đúng!'))
    expect((wrapper.get('input[name="code"]').element as HTMLInputElement).value).toBe('')
  })

  it('resends through the backend and resets countdown from its response', async () => {
    usePasswordRecovery().startRequest('user@example.com', 0, 300)
    const { wrapper } = await mountPage(VerifyResetCodePage, '/verify-reset-code')
    const resend = wrapper.findAll('button').find((button) => button.text().includes('Gửi lại mã'))
    await resend?.trigger('click')
    await flushPromises()
    expect(authApiMocks.requestPasswordReset).toHaveBeenCalledWith({ email: 'user@example.com' })
    expect(usePasswordRecovery().state.resendAvailableAt).toBeGreaterThan(Date.now() + 58_000)
  })

  it('sends reset payload, clears recovery state, and preserves the success screen', async () => {
    const recovery = usePasswordRecovery()
    recovery.startRequest('user@example.com', 60, 300)
    recovery.completeVerification('token-123', 600)
    const { wrapper } = await mountPage(ResetPasswordPage, '/reset-password')
    await wrapper.get('input[name="password"]').setValue('NewPassword123!')
    await wrapper.get('input[name="confirmPassword"]').setValue('NewPassword123!')
    await wrapper.get('[data-testid="reset-password-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="reset-success"]').exists()).toBe(true))

    expect(authApiMocks.resetPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      verification_token: 'token-123',
      password: 'NewPassword123!',
      password_confirmation: 'NewPassword123!',
    })
    expect(recovery.state.email).toBe('')
    expect(recovery.state.verificationToken).toBe('')
  })

  it('displays expired or reused verification-token errors', async () => {
    authApiMocks.resetPassword.mockRejectedValue(applicationError('Mã xác thực đã hết hạn hoặc đã được sử dụng.'))
    const recovery = usePasswordRecovery()
    recovery.startRequest('user@example.com', 60, 300)
    recovery.completeVerification('expired-token', 600)
    const { wrapper } = await mountPage(ResetPasswordPage, '/reset-password')
    await wrapper.get('input[name="password"]').setValue('NewPassword123!')
    await wrapper.get('input[name="confirmPassword"]').setValue('NewPassword123!')
    await wrapper.get('[data-testid="reset-password-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('đã hết hạn hoặc đã được sử dụng'))
  })

  it('guards missing recovery state and keeps Google login functional and unchanged', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/verify-reset-code')
    expect(router.currentRoute.value.path).toBe('/forgot-password')
    await router.push('/reset-password')
    expect(router.currentRoute.value.path).toBe('/forgot-password')

    const { wrapper } = await mountPage(LoginPage)
    const google = wrapper.findAll('button').find((button) => button.text().includes('Google'))
    expect(google).toBeDefined()
    if (!google) throw new Error('Google button not found')
    expect(google.element.tagName).toBe('BUTTON')
    expect(google.attributes('type')).toBe('button')
    expect(google.attributes('disabled')).toBeUndefined()
    await google.trigger('click')
    await vi.waitFor(() => expect(authApiMocks.getGoogleRedirectUrl).toHaveBeenCalledWith(undefined))
    expect(browserNavigationMocks.assignBrowserLocation).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/auth?state=opaque',
    )
    expect(wrapper.get('a[href="/forgot-password"]').text()).toContain('Quên mật khẩu?')
  })

  it('normalizes auth email without persisting secrets', () => {
    expect(normalizeAuthEmail('  USER@EXAMPLE.COM ')).toBe('user@example.com')
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })
})
