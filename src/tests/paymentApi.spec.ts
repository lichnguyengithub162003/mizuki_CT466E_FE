import { afterEach, describe, expect, it, vi } from 'vitest'
import { createVnPayPaymentUrl, getCustomerOrderPayment, verifyVnPayReturn } from '@/api/paymentApi'

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/clients', () => ({ apiClient: client }))

afterEach(() => { client.get.mockReset(); client.post.mockReset() })

describe('VNPay API contracts', () => {
  it('creates or retries a URL on the existing order', async () => {
    client.post.mockResolvedValue({ data: { data: {
      payment_url: 'https://sandbox.vnpayment.vn/pay?signed=1', expires_at: '2026-08-28T12:15:00Z', payment_number: 'PAY-901',
    } } })
    await expect(createVnPayPaymentUrl(901)).resolves.toEqual({
      paymentUrl: 'https://sandbox.vnpayment.vn/pay?signed=1', expiresAt: '2026-08-28T12:15:00Z', paymentNumber: 'PAY-901',
    })
    expect(client.post).toHaveBeenCalledWith('/customer/orders/901/payment/vnpay')
  })

  it('forwards return parameters to backend verification and adapts only the verified response', async () => {
    client.get.mockResolvedValue({ data: { data: {
      payment_number: 'PAY-AUTH', status: 'paid', order_number: 'MZ-AUTH', amount: 475000, response_code: '00',
    } } })
    const result = await verifyVnPayReturn('?vnp_TxnRef=PAY-UNTRUSTED&vnp_ResponseCode=24')
    expect(result).toEqual({ paymentNumber: 'PAY-AUTH', reportedStatus: 'paid', orderNumber: 'MZ-AUTH', amount: 475000 })
    expect(client.get.mock.calls[0]?.[0]).toBe('/payments/vnpay/return')
    expect(client.get.mock.calls[0]?.[1]?.params).toBeInstanceOf(URLSearchParams)
  })

  it('reads authoritative payment status independently from order status', async () => {
    client.get.mockResolvedValue({ data: { data: {
      payment_number: 'PAY-901', method: 'vnpay', status: 'paid', status_label: 'Đã thanh toán', amount: 475000,
      paid_at: '2026-08-28T12:01:00Z', provider: 'vnpay', provider_transaction_id: '14567890',
    } } })
    await expect(getCustomerOrderPayment(901)).resolves.toMatchObject({ status: 'paid', statusLabel: 'Đã thanh toán' })
    expect(client.get).toHaveBeenCalledWith('/customer/orders/901/payment')
  })
})
