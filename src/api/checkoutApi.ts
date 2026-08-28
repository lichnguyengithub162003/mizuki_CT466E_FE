import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'
import type { CheckoutPreview, CheckoutPreviewRequest, CheckoutPreviewResponse } from '@/types/checkout'

export async function getCheckoutPreview(payload: CheckoutPreviewRequest): Promise<CheckoutPreview> {
  const response = await apiClient.post<CheckoutPreviewResponse>(ENDPOINTS.customerCheckoutPreview, payload)
  const preview = response.data.data

  return {
    deliveryMethod: preview.delivery_method,
    branch: preview.branch,
    addressId: preview.address_id,
    promotion: preview.promotion,
    subtotal: preview.subtotal,
    discountAmount: preview.discount_amount,
    shippingFee: preview.shipping_fee,
    totalAmount: preview.total_amount,
    expectedDeliveryTime: preview.expected_delivery_time,
    wallet: preview.wallet,
    paymentMethods: preview.payment_methods,
    selectedPaymentMethod: preview.selected_payment_method,
  }
}
