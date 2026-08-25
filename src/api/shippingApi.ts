import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'
import type { CustomerShippingQuote } from '@/types/shipping'

interface CustomerShippingQuoteResponse {
  readonly success: boolean
  readonly message: string
  readonly data: {
    readonly shipping_fee: number | string
    readonly expected_delivery_time: string | null
    readonly expires_at: string
    readonly quote_token: string
  }
}

export async function getCustomerShippingQuote(
  addressId: number,
): Promise<CustomerShippingQuote> {
  const response = await apiClient.post<CustomerShippingQuoteResponse>(
    ENDPOINTS.customerShippingQuote,
    { address_id: addressId },
  )
  const quote = response.data.data

  return {
    shippingFee: typeof quote.shipping_fee === 'number'
      ? quote.shipping_fee
      : Number(quote.shipping_fee),
    expectedDeliveryTime: quote.expected_delivery_time,
    expiresAt: quote.expires_at,
    quoteToken: quote.quote_token,
  }
}
