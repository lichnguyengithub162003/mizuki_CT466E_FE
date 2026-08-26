import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'

interface ApiEnvelope<T> {
  readonly success: boolean
  readonly message: string
  readonly data: T
}

interface VnPayInitiationDto {
  readonly payment_url: string
  readonly expires_at: string
  readonly payment_number: string
}

interface VnPayReturnDto {
  readonly payment_number: string
  readonly status: string
  readonly order_number: string
  readonly amount: number | string
  readonly response_code: string
}

interface CustomerOrderPaymentDto {
  readonly payment_number: string
  readonly method: string
  readonly status: string
  readonly status_label: string
  readonly amount: number | string
  readonly paid_at: string | null
  readonly provider: string | null
  readonly provider_transaction_id: string | null
}

export interface VnPayInitiation {
  readonly paymentUrl: string
  readonly expiresAt: string
  readonly paymentNumber: string
}

export interface VerifiedVnPayReturn {
  readonly paymentNumber: string
  readonly status: string
  readonly orderNumber: string
  readonly amount: number
  readonly responseCode: string
}

export interface CustomerOrderPayment {
  readonly paymentNumber: string
  readonly method: string
  readonly status: string
  readonly statusLabel: string
  readonly amount: number
  readonly paidAt: string | null
  readonly provider: string | null
  readonly providerTransactionId: string | null
}

function finiteAmount(value: number | string, message: string): number {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) throw new Error(message)
  return amount
}

export async function initiateCustomerVnPayPayment(orderId: number): Promise<VnPayInitiation> {
  const response = await apiClient.post<ApiEnvelope<VnPayInitiationDto>>(
    ENDPOINTS.customerOrderVnPayPayment(orderId),
  )
  return {
    paymentUrl: response.data.data.payment_url,
    expiresAt: response.data.data.expires_at,
    paymentNumber: response.data.data.payment_number,
  }
}

export async function verifyVnPayReturn(rawSearch: string): Promise<VerifiedVnPayReturn> {
  const response = await apiClient.get<ApiEnvelope<VnPayReturnDto>>(
    `${ENDPOINTS.vnpayReturn}${rawSearch}`,
  )
  const data = response.data.data
  return {
    paymentNumber: data.payment_number,
    status: data.status,
    orderNumber: data.order_number,
    amount: finiteAmount(data.amount, 'Kết quả VNPay không có số tiền hợp lệ.'),
    responseCode: data.response_code,
  }
}

export async function getCustomerOrderPayment(orderId: number): Promise<CustomerOrderPayment> {
  const response = await apiClient.get<ApiEnvelope<CustomerOrderPaymentDto>>(
    ENDPOINTS.customerOrderPayment(orderId),
  )
  const data = response.data.data
  return {
    paymentNumber: data.payment_number,
    method: data.method,
    status: data.status,
    statusLabel: data.status_label,
    amount: finiteAmount(data.amount, 'Trạng thái thanh toán không có số tiền hợp lệ.'),
    paidAt: data.paid_at,
    provider: data.provider,
    providerTransactionId: data.provider_transaction_id,
  }
}

export function redirectToVnPay(paymentUrl: string): void {
  window.location.assign(paymentUrl)
}
