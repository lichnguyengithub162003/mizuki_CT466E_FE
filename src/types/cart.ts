export interface CartBranch {
  readonly id: number
  readonly name: string
  readonly address: string
}

export interface CartProduct {
  readonly id: number
  readonly name: string
  readonly slug: string
  readonly imageUrl?: string
}

export interface CartVariant {
  readonly id: number
  readonly name: string
  readonly sku: string
  readonly effectivePrice: number
}

export interface CustomerCartItem {
  readonly id: number
  readonly product: CartProduct
  readonly variant: CartVariant
  readonly quantity: number
  readonly subtotal: number
  readonly availableQuantity: number
  readonly stockWarning: boolean
}

export interface CustomerCart {
  readonly id: number
  readonly branch?: CartBranch
  readonly items: readonly CustomerCartItem[]
  readonly totalQuantity: number
  readonly totalAmount: number
  readonly discountAmount: number
  readonly totalAfterDiscount: number
}
