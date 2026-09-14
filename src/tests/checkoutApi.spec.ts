import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCheckoutPreview } from '@/api/checkoutApi'

const client = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/api/clients', () => ({ apiClient: client }))

afterEach(() => client.post.mockReset())

describe('checkout preview API', () => {
  it('posts pickup without shipping fields and adapts authoritative zero shipping totals', async () => {
    const payload = { delivery_method: 'pickup' as const, payment_method: 'wallet' as const }
    client.post.mockResolvedValue({ data: { success: true, message: 'ok', meta: {}, data: {
      delivery_method: 'pickup', branch: { id: 6, name: 'Mizuki Vĩnh Long', address: 'Vĩnh Long' }, address_id: null,
      promotion: null, subtotal: 500000, discount_amount: 25000, shipping_fee: 0, total_amount: 475000,
      expected_delivery_time: null, wallet: { balance: 825000, payable: true, shortfall: 0 },
      payment_methods: [{ value: 'cash', label: 'Tiền mặt' }, { value: 'wallet', label: 'Ví Mizuki' }, { value: 'vnpay', label: 'VNPay' }],
      selected_payment_method: 'wallet',
    } } })

    await expect(getCheckoutPreview(payload)).resolves.toMatchObject({
      deliveryMethod: 'pickup', addressId: null, shippingFee: 0, totalAmount: 475000,
      wallet: { balance: 825000, payable: true }, selectedPaymentMethod: 'wallet',
    })
    expect(client.post).toHaveBeenCalledWith('/customer/orders/preview', payload)
    expect(client.post.mock.calls[0]?.[1]).not.toHaveProperty('shipping_quote_token')
  })
})
