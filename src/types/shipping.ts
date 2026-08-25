export interface CustomerShippingQuote {
  readonly shippingFee: number
  readonly expectedDeliveryTime: string | null
  readonly expiresAt: string
  readonly quoteToken: string
}
