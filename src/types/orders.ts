export type CustomerOrderDeliveryMethod = 'delivery' | 'pickup'

export type CustomerOrderPaymentMethod = 'wallet' | 'vnpay' | 'cash'

export type CreateCustomerOrderRequest =
  | {
      readonly delivery_method: 'delivery'
      readonly address_id: number
      readonly shipping_quote_token: string
      readonly payment_method: CustomerOrderPaymentMethod
    }
  | {
      readonly delivery_method: 'pickup'
      readonly payment_method: CustomerOrderPaymentMethod
      readonly address_id?: never
      readonly shipping_quote_token?: never
    }

export interface CustomerOrderDto {
  readonly id: number
  readonly order_number: string
  readonly status: string
  readonly status_label: string
  readonly delivery_method: CustomerOrderDeliveryMethod
  readonly payment_method: CustomerOrderPaymentMethod
  readonly total_amount: number | string
}

export interface CreateCustomerOrderResponse {
  readonly success: boolean
  readonly message: string
  readonly data: CustomerOrderDto
}

export interface CreatedCustomerOrder {
  readonly id: number
  readonly orderNumber: string
  readonly status: string
  readonly statusLabel: string
  readonly deliveryMethod: CustomerOrderDeliveryMethod
  readonly paymentMethod: CustomerOrderPaymentMethod
  readonly totalAmount: number
}
