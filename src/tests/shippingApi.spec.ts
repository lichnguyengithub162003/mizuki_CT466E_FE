import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCustomerShippingQuote } from '@/api/shippingApi'

const client = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/api/clients', () => ({ apiClient: client }))

afterEach(() => {
  client.post.mockReset()
})

describe('customer shipping quote API', () => {
  it('posts the address id and preserves every quote field', async () => {
    client.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Đã tạo báo giá.',
        data: {
          shipping_fee: '42000',
          expected_delivery_time: '27/08/2026',
          expires_at: '2026-08-25T13:00:00Z',
          quote_token: 'quote-token-17',
        },
      },
    })

    await expect(getCustomerShippingQuote(17)).resolves.toEqual({
      shippingFee: 42_000,
      expectedDeliveryTime: '27/08/2026',
      expiresAt: '2026-08-25T13:00:00Z',
      quoteToken: 'quote-token-17',
    })
    expect(client.post).toHaveBeenCalledWith('/customer/shipping/quote', {
      address_id: 17,
    })
  })

  it('preserves a null expected delivery time from GHN', async () => {
    client.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Đã tạo báo giá.',
        data: {
          shipping_fee: 42_000,
          expected_delivery_time: null,
          expires_at: '2026-08-25T13:00:00Z',
          quote_token: 'a'.repeat(64),
        },
      },
    })

    await expect(getCustomerShippingQuote(17)).resolves.toEqual(expect.objectContaining({
      expectedDeliveryTime: null,
    }))
  })
})
