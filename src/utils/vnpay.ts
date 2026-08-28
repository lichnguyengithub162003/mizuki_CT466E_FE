export interface VnPayReturnContext {
  readonly orderId: number
  readonly orderNumber: string
  readonly paymentNumber: string
}

const VNPAY_RETURN_CONTEXT_PREFIX = 'mizuki:vnpay:return:'

export function persistVnPayReturnContext(context: VnPayReturnContext): void {
  window.sessionStorage.setItem(`${VNPAY_RETURN_CONTEXT_PREFIX}${context.paymentNumber}`, JSON.stringify(context))
}

export function readVnPayReturnContext(paymentNumber: string): VnPayReturnContext | null {
  try {
    const raw = window.sessionStorage.getItem(`${VNPAY_RETURN_CONTEXT_PREFIX}${paymentNumber}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<VnPayReturnContext>
    if (!Number.isInteger(parsed.orderId) || typeof parsed.orderNumber !== 'string' || parsed.paymentNumber !== paymentNumber) return null
    return { orderId: parsed.orderId!, orderNumber: parsed.orderNumber, paymentNumber }
  } catch {
    return null
  }
}

export function redirectToVnPay(paymentUrl: string): void {
  const url = new URL(paymentUrl)
  if (url.protocol !== 'https:') throw new Error('URL thanh toán VNPay không hợp lệ.')
  window.location.assign(url.toString())
}
