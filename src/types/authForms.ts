import { z } from 'zod'

const normalizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Vui lòng nhập email.')
  .email('Email chưa đúng định dạng.')

const canonicalVietnameseMobile = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập số điện thoại.')
  .regex(/^0(?:3|5|7|8|9)\d{8}$/, 'Số điện thoại chưa đúng định dạng Việt Nam.')

export const loginSchema = z
  .object({
    credentialMode: z.enum(['email', 'phone']),
    email: z.string(),
    phone: z.string(),
    password: z.string().min(8, 'Mật khẩu cần có ít nhất 8 ký tự.'),
    remember: z.boolean(),
  })
  .superRefine((values, context) => {
    const field = values.credentialMode
    const result = field === 'email'
      ? normalizedEmail.safeParse(values.email)
      : canonicalVietnameseMobile.safeParse(values.phone)

    if (result.success) return
    const message = result.error.issues[0]?.message
    if (!message) return

    context.addIssue({
      code: 'custom',
      message,
      path: [field],
    })
  })

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Họ và tên cần có ít nhất 2 ký tự.')
      .max(100, 'Họ và tên không được vượt quá 100 ký tự.'),
    email: normalizedEmail,
    phone: canonicalVietnameseMobile,
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
