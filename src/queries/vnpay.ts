import { useMutation } from '@tanstack/vue-query'
import {
  getCustomerOrderPayment,
  initiateCustomerVnPayPayment,
  verifyVnPayReturn,
} from '@/api/vnpayApi'

const VNPAY_CONTEXT_STORAGE_KEY = 'mizuki:vnpay:payment-context'

export interface VnPayPaymentContext {
  readonly orderId: number
  readonly orderNumber: string
  readonly paymentNumber: string
  readonly expiresAt: string
}

export function saveVnPayPaymentContext(context: VnPayPaymentContext): void {
  window.sessionStorage.setItem(VNPAY_CONTEXT_STORAGE_KEY, JSON.stringify(context))
}

export function loadVnPayPaymentContext(): VnPayPaymentContext | null {
  try {
    const stored = window.sessionStorage.getItem(VNPAY_CONTEXT_STORAGE_KEY)
    if (!stored) return null
    const context = JSON.parse(stored) as Partial<VnPayPaymentContext>
    if (
      !Number.isInteger(context.orderId)
      || Number(context.orderId) <= 0
      || typeof context.orderNumber !== 'string'
      || typeof context.paymentNumber !== 'string'
      || typeof context.expiresAt !== 'string'
    ) return null
    return context as VnPayPaymentContext
  } catch {
    return null
  }
}

export function clearVnPayPaymentContext(): void {
  window.sessionStorage.removeItem(VNPAY_CONTEXT_STORAGE_KEY)
}

export function useInitiateVnPayPaymentMutation() {
  return useMutation({
    mutationFn: (orderId: number) => initiateCustomerVnPayPayment(orderId),
    retry: false,
  })
}

export function useVerifyVnPayReturnMutation() {
  return useMutation({
    mutationFn: (rawSearch: string) => verifyVnPayReturn(rawSearch),
    retry: false,
  })
}

export function useCustomerOrderPaymentMutation() {
  return useMutation({
    mutationFn: (orderId: number) => getCustomerOrderPayment(orderId),
    retry: false,
  })
}
