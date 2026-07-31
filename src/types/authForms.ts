import { z } from 'zod'

const normalizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Vui lòng nhập email.')
  .email('Email chưa đúng định dạng.')

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(8, 'Mật khẩu cần có ít nhất 8 ký tự.'),
  remember: z.boolean(),
})

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Họ và tên cần có ít nhất 2 ký tự.')
      .max(100, 'Họ và tên không được vượt quá 100 ký tự.'),
    email: normalizedEmail,
    password: z.string().min(8, 'Mật khẩu cần có ít nhất 8 ký tự.'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
    terms: z
      .boolean()
      .refine((accepted) => accepted, 'Bạn cần đồng ý với điều khoản sử dụng.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Mật khẩu xác nhận chưa khớp.',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: normalizedEmail,
})

export const verifyResetCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Mã xác thực phải gồm đúng 6 chữ số.'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Mật khẩu cần có ít nhất 8 ký tự.'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Mật khẩu xác nhận chưa khớp.',
    path: ['confirmPassword'],
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type VerifyResetCodeFormValues = z.infer<typeof verifyResetCodeSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
