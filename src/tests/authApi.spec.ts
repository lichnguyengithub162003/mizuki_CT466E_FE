import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ENDPOINTS } from '@/constants/endpoints'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  ensureCsrfCookie: vi.fn(),
}))

vi.mock('@/api/clients', () => ({
  apiClient: { get: apiMocks.get, post: apiMocks.post },
}))

vi.mock('@/api/csrf', () => ({ ensureCsrfCookie: apiMocks.ensureCsrfCookie }))

import {
  getCurrentUser,
  getGoogleRedirectUrl,
  initializeAuthCsrf,
  login,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetCode,
} from '@/api/auth/authApi'

const user = {
  id: 1,
  name: 'Customer',
  email: 'customer@example.com',
  phone: null,
  avatar: null,
  role: 'customer' as const,
  role_label: 'Khách hàng',
  branch_id: null,
  email_verified_at: null,
  created_at: '2026-07-31T00:00:00Z',
}

describe('auth API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.ensureCsrfCookie.mockResolvedValue(undefined)
  })

  it('initializes Sanctum CSRF explicitly', async () => {
    await initializeAuthCsrf()
    expect(apiMocks.ensureCsrfCookie).toHaveBeenCalledOnce()
  })

  it('initializes CSRF and posts the exact login payload', async () => {
    const payload = { email: 'customer@example.com', password: 'password' }
    apiMocks.post.mockResolvedValue({ data: { data: user } })
    await expect(login(payload)).resolves.toEqual(user)
    expect(apiMocks.ensureCsrfCookie).toHaveBeenCalledOnce()
    expect(apiMocks.post).toHaveBeenCalledWith(ENDPOINTS.authLogin, payload)
  })

  it('initializes CSRF and posts the exact phone login payload', async () => {
    const payload = { phone: '0368123456', password: 'password' }
    apiMocks.post.mockResolvedValue({ data: { data: user } })
    await expect(login(payload)).resolves.toEqual(user)
    expect(apiMocks.ensureCsrfCookie).toHaveBeenCalledOnce()
    expect(apiMocks.post).toHaveBeenCalledWith(ENDPOINTS.authLogin, payload)
    expect(payload).not.toHaveProperty('email')
  })

  it('posts registration with the exact required phone payload', async () => {
    const payload = {
      name: 'Nguyễn Văn A',
      email: 'user@example.com',
      phone: '0368123456',
      password: 'Password123!',
      password_confirmation: 'Password123!',
    }
    apiMocks.post.mockResolvedValue({ data: { data: user } })
    await register(payload)
    expect(apiMocks.post).toHaveBeenCalledWith(ENDPOINTS.authRegister, payload)
  })

  it('restores the cookie session through auth/me without bearer data', async () => {
    apiMocks.get.mockResolvedValue({ data: { data: user } })
    await expect(getCurrentUser()).resolves.toEqual(user)
    expect(apiMocks.get).toHaveBeenCalledWith(ENDPOINTS.authMe)
    expect(apiMocks.ensureCsrfCookie).not.toHaveBeenCalled()
  })

  it('requests the backend-owned Google redirect URL with an optional safe destination', async () => {
    const redirectUrl = 'https://accounts.google.com/o/oauth2/auth?state=opaque'
    apiMocks.get.mockResolvedValue({ data: { data: { redirect_url: redirectUrl } } })

    await expect(getGoogleRedirectUrl('/checkout')).resolves.toBe(redirectUrl)
    expect(apiMocks.get).toHaveBeenCalledWith(ENDPOINTS.authGoogleRedirect, {
      params: { redirect: '/checkout' },
    })
  })

  it('posts logout with CSRF', async () => {
    apiMocks.post.mockResolvedValue({ data: { data: null } })
    await logout()
    expect(apiMocks.post).toHaveBeenCalledWith(ENDPOINTS.authLogout, undefined)
    expect(apiMocks.ensureCsrfCookie).toHaveBeenCalledOnce()
  })

  it('uses the exact forgot, verify, and reset contracts', async () => {
    apiMocks.post
      .mockResolvedValueOnce({ data: { data: { resend_after: 60, expires_in: 300 } } })
      .mockResolvedValueOnce({ data: { data: { verification_token: 'token', expires_in: 600 } } })
      .mockResolvedValueOnce({ data: { data: null } })

    await requestPasswordReset({ email: 'user@example.com' })
    await verifyPasswordResetCode({ email: 'user@example.com', code: '654321' })
    await resetPassword({
      email: 'user@example.com',
      verification_token: 'token',
      password: 'NewPassword123!',
      password_confirmation: 'NewPassword123!',
    })

    expect(apiMocks.post).toHaveBeenNthCalledWith(1, ENDPOINTS.authForgotPassword, { email: 'user@example.com' })
    expect(apiMocks.post).toHaveBeenNthCalledWith(2, ENDPOINTS.authVerifyResetCode, { email: 'user@example.com', code: '654321' })
    expect(apiMocks.post).toHaveBeenNthCalledWith(3, ENDPOINTS.authResetPassword, {
      email: 'user@example.com',
      verification_token: 'token',
      password: 'NewPassword123!',
      password_confirmation: 'NewPassword123!',
    })
    expect(apiMocks.ensureCsrfCookie).toHaveBeenCalledTimes(3)
  })
})
