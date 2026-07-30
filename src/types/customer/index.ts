import type { ProductListingProduct } from '@/types/products'

export type FavoriteStockState = 'available' | 'low-stock' | 'sold-out' | 'discontinued'

export type CartStockState =
  | 'available'
  | 'sold-out'
  | 'variant-unavailable'
  | 'branch-unavailable'

export interface CustomerBranchAvailability {
  readonly branchId: string
  readonly branchName: string
  readonly available: boolean
  readonly label: string
}

export interface FavoriteProduct {
  readonly id: string
  readonly product: ProductListingProduct
  readonly stockState: FavoriteStockState
  readonly branchAvailability: CustomerBranchAvailability
  readonly favoriteDate?: string
  readonly recommendationProductId?: string
}

export interface CartVariant {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly available: boolean
}

export interface CartItem {
  readonly id: string
  readonly product: ProductListingProduct
  variant: CartVariant
  quantity: number
  readonly unitPrice: number
  readonly stockState: CartStockState
  readonly branchAvailability: CustomerBranchAvailability
  selected: boolean
  readonly unavailableReason?: string
}

export interface CartSummary {
  readonly subtotal: number
  readonly discount: number
  readonly shipping: number
  readonly total: number
  readonly selectedCount: number
}

export type VoucherDiscountType = 'fixed' | 'percentage'

export interface Voucher {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly discountType: VoucherDiscountType
  readonly discountValue: number
  readonly minimumOrder: number
  readonly applicable: boolean
}
