import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCustomerOrderPayment,
  initiateCustomerVnPayPayment,
  verifyVnPayReturn,
} from '@/api/vnpayApi'

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/clients', () => ({ apiClient: client }))

afterEach(() => {
  client.get.mockReset()
  client.post.mockReset()
})

describe('VNPay API contracts', () => {
  it('initiates payment for the created order and preserves the backend URL', async () => {
    client.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Tạo URL thành công',
        data: {
          payment_url: 'https://pay.example.test/exact-backend-url?signature=server',
          expires_at: '2026-08-26T12:15:00+07:00',
          payment_number: 'PAY-20260826-ABC12345',
        },
      },
    })

    await expect(initiateCustomerVnPayPayment(901)).resolves.toEqual({
      paymentUrl: 'https://pay.example.test/exact-backend-url?signature=server',
      expiresAt: '2026-08-26T12:15:00+07:00',
      paymentNumber: 'PAY-20260826-ABC12345',
    })
    expect(client.post).toHaveBeenCalledWith('/customer/orders/901/payment/vnpay')
  })

  it('forwards the raw return query to backend verification without interpreting it', async () => {
    const rawSearch = '?vnp_TxnRef=PAY-1&vnp_SecureHash=signed-by-backend'
    client.get.mockResolvedValue({
      data: {
        success: true,
        message: 'Đã xác minh',
        data: {
          payment_number: 'PAY-1',
          status: 'paid',
          order_number: 'MZ-901',
          amount: '519000',
          response_code: '00',
        },
      },
    })

    await expect(verifyVnPayReturn(rawSearch)).resolves.toEqual({
      paymentNumber: 'PAY-1',
      status: 'paid',
      orderNumber: 'MZ-901',
      amount: 519_000,
      responseCode: '00',
    })
    expect(client.get).toHaveBeenCalledWith(`/payments/vnpay/return${rawSearch}`)
  })

  it('fetches authoritative payment status by order ID', async () => {
    client.get.mockResolvedValue({
      data: {
        success: true,
        message: 'Trạng thái thanh toán',
        data: {
          payment_number: 'PAY-1',
          method: 'vnpay',
          status: 'paid',
          status_label: 'Đã thanh toán',
          amount: 519_000,
          paid_at: '2026-08-26T05:05:00Z',
          provider: 'vnpay',
          provider_transaction_id: '14567890',
        },
      },
    })

    await expect(getCustomerOrderPayment(901)).resolves.toEqual({
      paymentNumber: 'PAY-1',
      method: 'vnpay',
      status: 'paid',
      statusLabel: 'Đã thanh toán',
      amount: 519_000,
      paidAt: '2026-08-26T05:05:00Z',
      provider: 'vnpay',
      providerTransactionId: '14567890',
    })
    expect(client.get).toHaveBeenCalledWith('/customer/orders/901/payment')
  })
})
