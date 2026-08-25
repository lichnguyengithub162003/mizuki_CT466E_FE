import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'
import type {
  CreateCustomerOrderRequest,
  CreateCustomerOrderResponse,
  CreatedCustomerOrder,
} from '@/types/orders'

export async function createCustomerOrder(
  payload: CreateCustomerOrderRequest,
  idempotencyKey: string,
): Promise<CreatedCustomerOrder> {
  const response = await apiClient.post<CreateCustomerOrderResponse>(
    ENDPOINTS.customerOrders,
    payload,
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    },
  )
  const order = response.data.data
  const totalAmount = typeof order.total_amount === 'number'
    ? order.total_amount
    : Number(order.total_amount)

  if (!Number.isFinite(totalAmount)) {
    throw new Error('Phản hồi tạo đơn hàng không có tổng tiền hợp lệ.')
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    statusLabel: order.status_label,
    deliveryMethod: order.delivery_method,
    paymentMethod: order.payment_method,
    totalAmount,
  }
}
