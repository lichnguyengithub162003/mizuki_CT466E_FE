import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCustomerOrder } from '@/api/orderApi'

const client = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/api/clients', () => ({ apiClient: client }))

afterEach(() => {
  client.post.mockReset()
})

describe('customer order API', () => {
  it('posts the exact delivery contract and adapts the authoritative response', async () => {
    const idempotencyKey = '11111111-1111-4111-8111-111111111111'
    const quoteToken = 'a'.repeat(64)
    const payload = {
      delivery_method: 'delivery' as const,
      address_id: 17,
      shipping_quote_token: quoteToken,
      payment_method: 'cash' as const,
    }
    client.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Đặt hàng thành công!',
        data: {
          id: 901,
          order_number: 'MZ-20260825-0901',
          status: 'pending',
          status_label: 'Chờ xác nhận',
          delivery_method: 'delivery',
          payment_method: 'cash',
          total_amount: '519000',
        },
      },
    })

    await expect(createCustomerOrder(payload, idempotencyKey)).resolves.toEqual({
      id: 901,
      orderNumber: 'MZ-20260825-0901',
      status: 'pending',
      statusLabel: 'Chờ xác nhận',
      deliveryMethod: 'delivery',
      paymentMethod: 'cash',
      totalAmount: 519_000,
    })
    expect(client.post).toHaveBeenCalledTimes(1)
    expect(client.post).toHaveBeenCalledWith('/customer/orders', payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    })
    expect(Object.keys(client.post.mock.calls[0]![1])).toEqual([
      'delivery_method',
      'address_id',
      'shipping_quote_token',
      'payment_method',
    ])
  })

  it('rejects an invalid authoritative total instead of inventing one', async () => {
    client.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Đặt hàng thành công!',
        data: {
          id: 901,
          order_number: 'MZ-20260825-0901',
          status: 'pending',
          status_label: 'Chờ xác nhận',
          delivery_method: 'delivery',
          payment_method: 'cash',
          total_amount: 'invalid',
        },
      },
    })

    await expect(createCustomerOrder({
      delivery_method: 'delivery',
      address_id: 17,
      shipping_quote_token: 'a'.repeat(64),
      payment_method: 'cash',
    }, '11111111-1111-4111-8111-111111111111')).rejects.toThrow('không có tổng tiền hợp lệ')
  })
})
