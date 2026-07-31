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

export type CheckoutScenario =
  | 'first-time'
  | 'existing'
  | 'loading'
  | 'empty'
  | 'error'
  | 'unavailable'
  | 'failure'

export type FulfillmentMethod = 'delivery' | 'pickup'
export type CheckoutViewState = 'success' | 'loading' | 'empty' | 'error'
export type CheckoutVoucherKind = 'order' | 'shipping'
export type CheckoutResultKind = 'success' | 'failure'

export interface CheckoutAddressDraft {
  readonly id?: string
  fullName: string
  phone: string
  ghn_province_id: number | null
  ghn_district_id: number | null
  ghn_ward_code: string
  provinceName: string
  districtName: string
  wardName: string
  detail: string
  type: 'home' | 'office'
  isDefault: boolean
}

export interface CheckoutAddress extends CheckoutAddressDraft {
  readonly id: string
  readonly phoneVerified: boolean
}

export interface CheckoutProduct {
  readonly id: string
  readonly product: ProductListingProduct
  readonly variantLabel: string
  readonly quantity: number
  readonly unitPrice: number
  readonly originalUnitPrice?: number
  readonly available: boolean
  readonly availabilityLabel: string
}

export interface CheckoutShippingOption {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly estimate: string
  readonly fee: number
}

export interface CheckoutBranch {
  readonly id: string
  readonly name: string
  readonly address: string
  readonly openingHours: string
  readonly available: boolean
  readonly availabilityLabel: string
}

export interface CheckoutVoucher {
  readonly id: string
  readonly code: string
  readonly kind: CheckoutVoucherKind
  readonly label: string
  readonly description: string
  readonly discountType: VoucherDiscountType
  readonly discountValue: number
  readonly maximumDiscount?: number
  readonly minimumOrder: number
  readonly expiryText: string
}

export interface CheckoutPaymentMethod {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly available: boolean
  readonly unavailableReason?: string
  readonly balance?: number
}

export interface CheckoutTotals {
  readonly selectedCount: number
  readonly subtotal: number
  readonly productDiscount: number
  readonly orderVoucherDiscount: number
  readonly shippingFee: number
  readonly shippingVoucherDiscount: number
  readonly total: number
  readonly savedAmount: number
}

export interface CheckoutScenarioData {
  readonly viewState: CheckoutViewState
  readonly addresses: readonly CheckoutAddress[]
  readonly products: readonly CheckoutProduct[]
  readonly result: CheckoutResultKind
}

export interface CheckoutOrderResult {
  readonly kind: CheckoutResultKind
  readonly orderNumber?: string
  readonly message: string
}
