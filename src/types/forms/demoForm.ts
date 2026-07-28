import { z } from 'zod'
import type { FormOption } from '@/types/forms'

const VIETNAM_PHONE_PATTERN = /^(?:\+84|0)\d{9,10}$/
const BRANCH_VALUES = ['can-tho', 'ninh-kieu', 'cai-rang'] as const

export const demoFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Họ và tên là bắt buộc.')
      .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
      .max(100, 'Họ và tên không được vượt quá 100 ký tự.'),
    email: z
      .string()
      .trim()
      .min(1, 'Email là bắt buộc.')
      .email('Email chưa đúng định dạng.'),
    phone: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || VIETNAM_PHONE_PATTERN.test(value),
        'Số điện thoại Việt Nam chưa đúng định dạng.',
      ),
    password: z
      .string()
      .min(1, 'Mật khẩu là bắt buộc.')
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
    branch: z
      .string()
      .min(1, 'Vui lòng chọn chi nhánh.')
      .refine(
        (value) => BRANCH_VALUES.some((branch) => branch === value),
        'Chi nhánh chưa hợp lệ.',
      ),
    contactMethod: z.enum(['email', 'phone'], {
      required_error: 'Vui lòng chọn phương thức liên hệ.',
    }),
    marketingConsent: z.boolean(),
    notes: z.string().max(500, 'Ghi chú không được vượt quá 500 ký tự.'),
  })
  .superRefine((values, context) => {
    if (values.confirmPassword !== values.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Mật khẩu xác nhận không khớp.',
      })
    }
  })

export type DemoFormValues = z.infer<typeof demoFormSchema>

export const demoFormInitialValues: DemoFormValues = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  branch: '',
  contactMethod: 'email',
  marketingConsent: false,
  notes: '',
}

export const branchOptions = [
  { value: 'can-tho', label: 'Mizuki Cần Thơ' },
  { value: 'ninh-kieu', label: 'Mizuki Ninh Kiều' },
  { value: 'cai-rang', label: 'Mizuki Cái Răng' },
] as const satisfies readonly FormOption[]

export const contactMethodOptions = [
  { value: 'email', label: 'Email', description: 'Nhận thông tin qua email.' },
  { value: 'phone', label: 'Điện thoại', description: 'Nhận cuộc gọi khi cần xác nhận.' },
] as const satisfies readonly FormOption[]

export const demoFormFieldNames = [
  'fullName',
  'email',
  'phone',
  'password',
  'confirmPassword',
  'branch',
  'contactMethod',
  'marketingConsent',
  'notes',
] as const satisfies readonly (keyof DemoFormValues)[]

export const demoFormFieldLabels: Readonly<Record<string, string>> = {
  fullName: 'Họ và tên',
  email: 'Email',
  phone: 'Số điện thoại',
  password: 'Mật khẩu',
  confirmPassword: 'Xác nhận mật khẩu',
  branch: 'Chi nhánh',
  contactMethod: 'Phương thức liên hệ',
  marketingConsent: 'Thông tin khuyến mãi',
  notes: 'Ghi chú',
}

