export const GOOGLE_OAUTH_ERROR_MESSAGES = {
  google_cancelled: 'Bạn đã hủy đăng nhập bằng Google.',
  google_invalid_callback: 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.',
  google_unverified_email: 'Tài khoản Google chưa xác minh địa chỉ email.',
  google_staff_account: 'Tài khoản nội bộ không thể đăng nhập tại khu vực khách hàng.',
  google_auth_failed: 'Không thể đăng nhập bằng Google. Vui lòng thử lại.',
} as const

export type GoogleOAuthErrorCode = keyof typeof GOOGLE_OAUTH_ERROR_MESSAGES

export function getGoogleOAuthErrorMessage(code: unknown): string {
  if (typeof code === 'string' && code in GOOGLE_OAUTH_ERROR_MESSAGES) {
    return GOOGLE_OAUTH_ERROR_MESSAGES[code as GoogleOAuthErrorCode]
  }

  return GOOGLE_OAUTH_ERROR_MESSAGES.google_auth_failed
}
