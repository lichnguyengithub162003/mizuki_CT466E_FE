import { apiClient } from "@/api/clients";
import { resolveProductImage } from "@/api/productListingAdapter";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  CreateCustomerOrderRequest,
  CreateCustomerOrderResponse,
  CreatedCustomerOrder,
  CustomerOrder,
  CustomerOrderDetailDto,
  CustomerOrderDetailResponse,
  CustomerOrderListResponse,
  CustomerOrderPage,
} from "@/types/orders";

function numberValue(value: number | string, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed))
    throw new Error(`Phản hồi đơn hàng không có ${field} hợp lệ.`);
  return parsed;
}

export function adaptCustomerOrder(
  value: CustomerOrderDetailDto,
): CustomerOrder {
  return {
    id: value.id,
    orderNumber: value.order_number,
    status: value.status,
    statusLabel: value.status_label,
    deliveryMethod: value.delivery_method,
    paymentMethod: value.payment_method,
    paymentStatus: value.payment_status ?? value.payment?.status ?? null,
    paymentStatusLabel:
      value.payment_status_label ?? value.payment?.status_label ?? null,
    payment: value.payment
      ? {
          id: value.payment.id,
          paymentNumber: value.payment.payment_number,
          method: value.payment.method,
          status: value.payment.status,
          statusLabel: value.payment.status_label,
          amount: numberValue(value.payment.amount, "số tiền thanh toán"),
          provider: value.payment.provider,
          transactionReference: value.payment.transaction_reference,
          paidAt: value.payment.paid_at,
          failedAt: value.payment.failed_at,
          cancelledAt: value.payment.cancelled_at,
          refundedAt: value.payment.refunded_at,
        }
      : null,
    branch: value.branch,
    deliveryAddress: value.delivery_address,
    shipment:
      value.shipment === null
        ? null
        : {
            provider: value.shipment.provider,
            trackingCode: value.shipment.tracking_code,
            status: value.shipment.status,
            statusLabel: value.shipment.status_label ?? null,
            shippingFee: numberValue(
              value.shipment.shipping_fee,
              "phí vận chuyển",
            ),
            expectedDeliveryAt: value.shipment.expected_delivery_at,
            shippedAt: value.shipment.shipped_at,
            deliveredAt: value.shipment.delivered_at,
            cancelledAt: value.shipment.cancelled_at,
            currentLocation: value.shipment.current_location ?? null,
          },
    items: value.items.map((item) => {
      const unitPrice = numberValue(item.unit_price, "đơn giá sản phẩm");
      const brandId = item.brand?.id ?? item.brand_id ?? null;
      const brandName = item.brand?.name ?? item.brand_name ?? null;
      const brandSlug = item.brand?.slug ?? item.brand_slug ?? null;
      const imageUrl = item.image_url ?? item.primary_image_url ?? null;
      return {
        id: item.id,
        productVariantId: item.product_variant_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice,
        lineTotal: numberValue(item.line_total, "thành tiền sản phẩm"),
        originalPrice:
          item.original_unit_price === null ||
          item.original_unit_price === undefined
            ? null
            : numberValue(item.original_unit_price, "giá gốc sản phẩm"),
        finalUnitPrice:
          item.final_unit_price === null || item.final_unit_price === undefined
            ? unitPrice
            : numberValue(item.final_unit_price, "đơn giá cuối sản phẩm"),
        brandId,
        brandName,
        brandSlug,
        imageUrl: imageUrl ? resolveProductImage(imageUrl) : null,
        canReview: item.can_review,
        review: item.review,
      };
    }),
    subtotal: numberValue(value.subtotal, "tạm tính"),
    discountAmount: numberValue(value.discount_amount, "giảm giá"),
    productDiscountAmount:
      value.product_discount_amount === null ||
      value.product_discount_amount === undefined
        ? null
        : numberValue(value.product_discount_amount, "giảm giá sản phẩm"),

    voucherDiscountAmount:
      value.voucher_discount_amount !== null &&
      value.voucher_discount_amount !== undefined
        ? numberValue(value.voucher_discount_amount, "giảm giá voucher")
        : value.applied_promotion
          ? numberValue(
              value.applied_promotion.discount_amount,
              "giảm giá voucher",
            )
          : null,

    shippingDiscountAmount:
      value.shipping_discount_amount === null ||
      value.shipping_discount_amount === undefined
        ? null
        : numberValue(value.shipping_discount_amount, "ưu đãi phí vận chuyển"),
    promotionCode: value.applied_promotion?.code ?? null,
    shippingFee: numberValue(value.shipping_fee, "phí vận chuyển"),
    totalAmount: numberValue(value.total_amount, "tổng tiền"),
    cancellation: value.cancellation,
    cancellationRequestedBy:
      value.cancellation?.requester_name ??
      value.cancellation?.requested_by ??
      value.cancellation_requested_by ??
      null,

    cancellationRequestedAt:
      value.cancellation?.requested_at ??
      value.cancellation_requested_at ??
      null,

    pickupCustomerName: value.pickup_customer?.name ?? null,
    pickupCustomerPhone: value.pickup_customer?.phone ?? null,
    pickupCustomerAddress: value.pickup_customer?.address ?? null,

    availableActions: value.available_actions
      ? {
          canCancel: value.available_actions.can_cancel,
          canRequestRefund: value.available_actions.can_request_refund,
          canTrack: value.available_actions.can_track,
          canRepurchase: value.available_actions.can_repurchase,
          canRetryPayment: value.available_actions.can_retry_payment,
        }
      : undefined,
    refund:
      value.refund === null
        ? null
        : {
            id: value.refund.id,
            refundNumber: value.refund.refund_number,
            status: value.refund.status,
            statusLabel: value.refund.status_label,
            requestedAmount: numberValue(
              value.refund.requested_amount,
              "số tiền yêu cầu hoàn",
            ),
            approvedAmount:
              value.refund.approved_amount === null
                ? null
                : numberValue(value.refund.approved_amount, "số tiền hoàn"),
            reviewNote: value.refund.review_note,
            reviewedAt: value.refund.reviewed_at,
            refundedAt: value.refund.refunded_at,
            requestedAt: value.refund.requested_at ?? null,
            acceptedAt: value.refund.accepted_at ?? null,
            rejectedAt: value.refund.rejected_at ?? null,

            reason: value.refund.reason ?? null,

            paymentDestination:
              value.refund.payment_destination === "wallet" ||
              value.refund.payment_destination === "card"
                ? value.refund.payment_destination
                : null,

            paymentDestinationLabel:
              value.refund.payment_destination_label ?? null,

            productValue:
              value.refund.product_value === null ||
              value.refund.product_value === undefined
                ? null
                : numberValue(
                    value.refund.product_value,
                    "giá trị sản phẩm hoàn",
                  ),

            voucherDiscountAmount:
              value.refund.voucher_discount_amount === null ||
              value.refund.voucher_discount_amount === undefined
                ? null
                : numberValue(
                    value.refund.voucher_discount_amount,
                    "voucher hoàn tiền",
                  ),

            receivedAmount:
              value.refund.received_amount === null ||
              value.refund.received_amount === undefined
                ? null
                : numberValue(
                    value.refund.received_amount,
                    "số tiền thực nhận",
                  ),
          },
    placedAt: value.placed_at,
    cancelledAt: value.cancelled_at,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    paidAt: value.payment?.paid_at ?? null,
  };
}

export async function getCustomerOrder(
  orderId: number,
): Promise<CustomerOrder> {
  const response = await apiClient.get<CustomerOrderDetailResponse>(
    ENDPOINTS.customerOrder(orderId),
  );
  return adaptCustomerOrder(response.data.data);
}

export async function getCustomerOrders(
  page: number,
  perPage = 10,
): Promise<CustomerOrderPage> {
  const response = await apiClient.get<CustomerOrderListResponse>(
    ENDPOINTS.customerOrders,
    {
      params: { page, per_page: perPage },
    },
  );
  const pagination = response.data.meta.pagination;
  const orders = await Promise.all(
    response.data.data.map((order) => getCustomerOrder(order.id)),
  );
  return {
    orders,
    currentPage: pagination.current_page,
    lastPage: pagination.last_page,
    total: pagination.total,
  };
}

export async function createCustomerOrder(
  payload: CreateCustomerOrderRequest,
  idempotencyKey: string,
): Promise<CreatedCustomerOrder> {
  const response = await apiClient.post<CreateCustomerOrderResponse>(
    ENDPOINTS.customerOrders,
    payload,
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );
  const order = response.data.data;
  const totalAmount = numberValue(order.total_amount, "tổng tiền");

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    statusLabel: order.status_label,
    deliveryMethod: order.delivery_method,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status ?? order.payment?.status ?? null,
    paymentStatusLabel:
      order.payment_status_label ?? order.payment?.status_label ?? null,
    totalAmount,
  };
}
