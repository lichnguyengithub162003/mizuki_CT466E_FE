import { apiClient } from '@/api/clients'
import { resolveProductImage } from '@/api/productListingAdapter'
import type { CustomerCart } from '@/types/cart'

interface CartResponseDto {
  readonly success: boolean
  readonly message: string
  readonly data: CartDto
}

interface CartDto {
  readonly id: number
  readonly branch: { readonly id: number; readonly name: string; readonly address: string } | null
  readonly items: readonly {
    readonly id: number
    readonly product: { readonly id: number; readonly name: string; readonly slug: string; readonly primary_image_url: string | null }
    readonly variant: { readonly id: number; readonly name: string; readonly sku: string; readonly effective_price: number | string }
    readonly quantity: number
    readonly subtotal: number | string
    readonly available_quantity: number
    readonly stock_warning: boolean
  }[]
  readonly total_quantity: number
  readonly total_amount: number | string
  readonly discount_amount: number | string
  readonly total_after_discount: number | string
}

function numberValue(value: number | string): number { return typeof value === 'number' ? value : Number(value) }
function adaptCart(value: CartDto): CustomerCart {
  return {
    id: value.id, branch: value.branch ?? undefined,
    items: value.items.map((item) => ({
      id: item.id,
      product: { id: item.product.id, name: item.product.name, slug: item.product.slug, imageUrl: item.product.primary_image_url ? resolveProductImage(item.product.primary_image_url) : undefined },
      variant: { id: item.variant.id, name: item.variant.name, sku: item.variant.sku, effectivePrice: numberValue(item.variant.effective_price) },
      quantity: item.quantity, subtotal: numberValue(item.subtotal), availableQuantity: item.available_quantity, stockWarning: item.stock_warning,
    })),
    totalQuantity: value.total_quantity, totalAmount: numberValue(value.total_amount), discountAmount: numberValue(value.discount_amount), totalAfterDiscount: numberValue(value.total_after_discount),
  }
}

export async function getCustomerCart(): Promise<CustomerCart> {
  const response = await apiClient.get<CartResponseDto>('/customer/cart')
  return adaptCart(response.data.data)
}

export async function addCartItem(productVariantId: number, quantity: number): Promise<CustomerCart> {
  const response = await apiClient.post<CartResponseDto>('/customer/cart/items', {
    product_variant_id: productVariantId,
    quantity,
  })
  return adaptCart(response.data.data)
}

export async function updateCartItem(itemId: number, quantity: number): Promise<CustomerCart> {
  const response = await apiClient.patch<CartResponseDto>(`/customer/cart/items/${itemId}`, { quantity })
  return adaptCart(response.data.data)
}

export async function removeCartItem(itemId: number): Promise<CustomerCart> {
  const response = await apiClient.delete<CartResponseDto>(`/customer/cart/items/${itemId}`)
  return adaptCart(response.data.data)
}

export async function selectCartBranch(branchId: number): Promise<CustomerCart> {
  const response = await apiClient.patch<CartResponseDto>('/customer/cart/branch', { branch_id: branchId })
  return adaptCart(response.data.data)
}
