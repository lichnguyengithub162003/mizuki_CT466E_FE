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

vi.mock('@/api/auth/authApi', () => authApiMocks)

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

async function fillRegister(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('input[name="fullName"]').setValue('Nguyễn Văn A')
  await wrapper.get('input[name="email"]').setValue('  USER@EXAMPLE.COM ')
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
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('preserves onboarding and approved local auth visuals', async () => {
    const onboarding = await mountPage(OnboardingPage, '/onboarding')
    expect(onboarding.wrapper.findAll('[aria-label^="Xem bước"]')).toHaveLength(2)
    expect(onboarding.wrapper.get('[data-testid="onboarding-image"]').attributes('src')).toBe('/images/auth/onboarding-1.jpg')

    const login = await mountPage(LoginPage)
    expect(login.wrapper.get('[data-testid="auth-hero-image"]').attributes('src')).toBe('/images/auth/login-hero-mobile.jpg')
    expect(login.wrapper.find('[src^="http"]').exists()).toBe(false)
  })

  it('submits normalized login credentials and stores the authenticated user', async () => {
    const { wrapper, router } = await mountPage(LoginPage)
    await fillLogin(wrapper)
    await wrapper.get('[data-testid="login-form"]').trigger('submit')
    await vi.waitFor(() => expect(authApiMocks.login).toHaveBeenCalledWith({ email: 'customer@example.com', password: 'password' }))
    expect(useAuthStore().user).toEqual(user)
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('shows invalid credentials and maps backend field errors', async () => {
    authApiMocks.login.mockRejectedValue(applicationError('Thông tin đăng nhập không đúng!', {
      email: ['Email không hợp lệ.'],
    }))
    const { wrapper } = await mountPage(LoginPage)
    await fillLogin(wrapper)
    await wrapper.get('[data-testid="login-form"]').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Thông tin đăng nhập không đúng!'))
    expect(wrapper.text()).toContain('Email không hợp lệ.')
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

  it('registers with the exact backend payload and never sends phone', async () => {
    const { wrapper, router } = await mountPage(RegisterPage)
    expect(wrapper.find('input[name="phone"]').exists()).toBe(false)
    await fillRegister(wrapper)
    await wrapper.get('[data-testid="register-form"]').trigger('submit')
    await vi.waitFor(() => expect(authApiMocks.register).toHaveBeenCalledOnce())

    const payload = authApiMocks.register.mock.calls[0]?.[0]
    expect(payload).toEqual({
      name: 'Nguyễn Văn A',
      email: 'user@example.com',
      password: 'Password123!',
      password_confirmation: 'Password123!',
    })
    expect(payload).not.toHaveProperty('phone')
    expect(useAuthStore().user).toEqual(user)
    expect(router.currentRoute.value.path).toBe('/home')
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

  it('guards missing recovery state and exposes Google as an enabled semantic button', async () => {
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
  })

  it('normalizes auth email without persisting secrets', () => {
    expect(normalizeAuthEmail('  USER@EXAMPLE.COM ')).toBe('user@example.com')
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })
})
