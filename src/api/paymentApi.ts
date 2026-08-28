import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'
import type {
  CustomerOrderPaymentResponse,
  CustomerOrderPaymentState,
  VerifiedVnPayReturn,
  VnPayPaymentUrl,
  VnPayReturnResponse,
  VnPayUrlResponse,
} from '@/types/payments'

export async function createVnPayPaymentUrl(orderId: number): Promise<VnPayPaymentUrl> {
  const response = await apiClient.post<VnPayUrlResponse>(ENDPOINTS.customerOrderVnPay(orderId))
  return {
    paymentUrl: response.data.data.payment_url,
    expiresAt: response.data.data.expires_at,
    paymentNumber: response.data.data.payment_number,
  }
}

export async function verifyVnPayReturn(search: string): Promise<VerifiedVnPayReturn> {
  const response = await apiClient.get<VnPayReturnResponse>(ENDPOINTS.vnPayReturn, {
    params: new URLSearchParams(search),
  })
  return {
    paymentNumber: response.data.data.payment_number,
    reportedStatus: response.data.data.status,
    orderNumber: response.data.data.order_number,
    amount: response.data.data.amount,
  }
}

export async function getCustomerOrderPayment(orderId: number): Promise<CustomerOrderPaymentState> {
  const response = await apiClient.get<CustomerOrderPaymentResponse>(ENDPOINTS.customerOrderPayment(orderId))
  const payment = response.data.data
  return {
    paymentNumber: payment.payment_number,
    method: payment.method,
    status: payment.status,
    statusLabel: payment.status_label,
    amount: payment.amount,
    paidAt: payment.paid_at,
    provider: payment.provider,
    providerTransactionId: payment.provider_transaction_id,
  }
}
