import { apiClient } from '@/api/clients'
import { ensureCsrfCookie } from '@/api/csrf'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  AuthenticatedUser,
  ForgotPasswordPayload,
  ForgotPasswordResult,
  GoogleRedirectResult,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyResetCodePayload,
  VerifyResetCodeResult,
} from '@/types/auth'

async function postWithCsrf<TResponse, TPayload>(
  endpoint: string,
  payload?: TPayload,
): Promise<ApiResponse<TResponse>> {
  await ensureCsrfCookie()
  const response = await apiClient.post<ApiResponse<TResponse>>(endpoint, payload)
  return response.data
}

export async function initializeAuthCsrf(): Promise<void> {
  await ensureCsrfCookie()
}

export async function login(payload: LoginPayload): Promise<AuthenticatedUser> {
  return (await postWithCsrf<AuthenticatedUser, LoginPayload>(ENDPOINTS.authLogin, payload)).data
}

export async function register(payload: RegisterPayload): Promise<AuthenticatedUser> {
  return (await postWithCsrf<AuthenticatedUser, RegisterPayload>(ENDPOINTS.authRegister, payload)).data
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  const response = await apiClient.get<ApiResponse<AuthenticatedUser>>(ENDPOINTS.authMe)
  return response.data.data
}

export async function logout(): Promise<void> {
  await postWithCsrf<null, undefined>(ENDPOINTS.authLogout)
}

export async function requestPasswordReset(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResult> {
  return (
    await postWithCsrf<ForgotPasswordResult, ForgotPasswordPayload>(
      ENDPOINTS.authForgotPassword,
      payload,
    )
  ).data
}

export async function verifyPasswordResetCode(
  payload: VerifyResetCodePayload,
): Promise<VerifyResetCodeResult> {
  return (
    await postWithCsrf<VerifyResetCodeResult, VerifyResetCodePayload>(
      ENDPOINTS.authVerifyResetCode,
      payload,
    )
  ).data
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await postWithCsrf<null, ResetPasswordPayload>(ENDPOINTS.authResetPassword, payload)
}

export async function getGoogleRedirectUrl(intendedPath?: string): Promise<string> {
  const response = await apiClient.get<ApiResponse<GoogleRedirectResult>>(
    ENDPOINTS.authGoogleRedirect,
    intendedPath ? { params: { redirect: intendedPath } } : undefined,
  )
  return response.data.data.redirect_url
}
