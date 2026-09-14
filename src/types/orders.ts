export type CustomerOrderDeliveryMethod = "delivery" | "pickup";
export type CustomerOrderPaymentMethod = "wallet" | "vnpay" | "cash";
export type CustomerOrderPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";
export type CustomerOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "refund_requested"
  | "refunded";
export type CustomerOrderTab =
  | "all"
  | "awaiting-confirmation"
  | "awaiting-pickup"
  | "shipping"
  | "completed"
  | "refund"
  | "cancelled";
export type CustomerOrderPresentationState =
  | "pending"
  | "processing"
  | "awaiting_pickup"
  | "shipping"
  | "completed"
  | "cancelled"
  | "refund_requested"
  | "refund_processing"
  | "refund_completed"
  | "refund_rejected";

export const CUSTOMER_ORDER_TABS: readonly {
  readonly id: CustomerOrderTab;
  readonly label: string;
}[] = [
  { id: "all", label: "Tất cả" },
  { id: "awaiting-confirmation", label: "Chờ xác nhận" },
  { id: "awaiting-pickup", label: "Chờ lấy hàng" },
  { id: "shipping", label: "Đang giao" },
  { id: "completed", label: "Hoàn thành" },
  { id: "refund", label: "Trả hàng/Hoàn tiền" },
  { id: "cancelled", label: "Đã hủy" },
] as const;

export const CUSTOMER_ORDER_STATUS_TAB: Readonly<
  Record<CustomerOrderStatus, CustomerOrderTab>
> = {
  pending: "awaiting-confirmation",
  confirmed: "awaiting-pickup",
  processing: "awaiting-confirmation",
  shipping: "shipping",
  delivered: "completed",
  cancelled: "cancelled",
  refund_requested: "refund",
  refunded: "refund",
};

export const CUSTOMER_ORDER_STATUS_LABEL: Readonly<
  Record<CustomerOrderStatus, string>
> = {
  pending: "Chờ xác nhận",
  processing: "Đang xử lý",
  confirmed: "Chờ lấy hàng",
  shipping: "Đang giao",
  delivered: "Hoàn thành",
  refund_requested: "Yêu cầu hoàn tiền",
  refunded: "Đã hoàn tiền",
  cancelled: "Đã hủy",
};

export type CustomerOrderAction =
  | "track"
  | "buy-again"
  | "review"
  | "detail"
  | "cancelled-detail";
export const CUSTOMER_ORDER_STATUS_ACTIONS: Readonly<
  Record<CustomerOrderStatus, readonly CustomerOrderAction[]>
> = {
  pending: ["track"],
  confirmed: ["track"],
  processing: ["track"],
  shipping: ["track"],
  delivered: ["buy-again", "review"],
  refund_requested: ["detail"],
  refunded: ["detail"],
  cancelled: ["cancelled-detail", "buy-again"],
};

export type CreateCustomerOrderRequest =
  | {
      readonly delivery_method: "delivery";
      readonly address_id: number;
      readonly shipping_quote_token: string;
      readonly payment_method: CustomerOrderPaymentMethod;
    }
  | {
      readonly delivery_method: "pickup";
      readonly payment_method: CustomerOrderPaymentMethod;
      readonly address_id?: never;
      readonly shipping_quote_token?: never;
    };

export interface CustomerOrderDto {
  readonly id: number;
  readonly order_number: string;
  readonly status: CustomerOrderStatus;
  readonly status_label: string;
  readonly delivery_method: CustomerOrderDeliveryMethod;
  readonly payment_method: CustomerOrderPaymentMethod;
  readonly payment_status?: CustomerOrderPaymentStatus | null;
  readonly payment_status_label?: string | null;
  readonly payment?: CustomerOrderPaymentDto | null;
  readonly total_amount: number | string;
}

export interface CustomerOrderPaymentDto {
  readonly id: number;
  readonly payment_number: string;
  readonly method: string;
  readonly status: CustomerOrderPaymentStatus;
  readonly status_label: string;
  readonly amount: number | string;
  readonly provider: string | null;
  readonly transaction_reference: string | null;
  readonly paid_at: string | null;
  readonly failed_at: string | null;
  readonly cancelled_at: string | null;
  readonly refunded_at: string | null;
}

export interface CreateCustomerOrderResponse {
  readonly success: boolean;
  readonly message: string;
  readonly data: CustomerOrderDto;
}
export interface CreatedCustomerOrder {
  readonly id: number;
  readonly orderNumber: string;
  readonly status: CustomerOrderStatus;
  readonly statusLabel: string;
  readonly deliveryMethod: CustomerOrderDeliveryMethod;
  readonly paymentMethod: CustomerOrderPaymentMethod;
  readonly paymentStatus: CustomerOrderPaymentStatus | null;
  readonly paymentStatusLabel: string | null;
  readonly totalAmount: number;
}

export interface CustomerOrderListItemDto extends CustomerOrderDto {
  readonly item_count: number;
  readonly subtotal: number | string;
  readonly discount_amount: number | string;
  readonly shipping_fee: number | string;
  readonly placed_at: string | null;
  readonly created_at: string | null;
}
export interface CustomerOrderListResponse {
  readonly success: boolean;
  readonly message: string;
  readonly data: readonly CustomerOrderListItemDto[];
  readonly meta: {
    readonly pagination: {
      readonly current_page: number;
      readonly per_page: number;
      readonly total: number;
      readonly last_page: number;
    };
  };
}

export interface CustomerOrderBranch {
  readonly id: number;
  readonly name: string;
  readonly address: string;
}
export interface CustomerOrderDeliveryAddress {
  readonly address_id: number | null;
  readonly recipient_name: string | null;
  readonly recipient_phone: string | null;
  readonly province_code: string | null;
  readonly ghn_district_id: number | null;
  readonly ghn_ward_code: string | null;
  readonly full_address: string | null;
}
export interface CustomerOrderShipmentDto {
  readonly provider: string | null;
  readonly tracking_code: string | null;
  readonly status: string | null;
  readonly status_label?: string | null;
  readonly shipping_fee: number | string;
  readonly expected_delivery_at: string | null;
  readonly shipped_at: string | null;
  readonly delivered_at: string | null;
  readonly cancelled_at: string | null;
  readonly current_location?: string | null;
}
export interface CustomerOrderReviewDto {
  readonly id: number;
  readonly rating: number;
  readonly title: string | null;
  readonly comment: string | null;
  readonly is_visible: boolean;
  readonly reviewed_at: string | null;
  readonly updated_at: string | null;
}
export interface CustomerOrderItemDto {
  readonly id: number;
  readonly product_variant_id: number;
  readonly product_name: string;
  readonly variant_name: string;
  readonly sku: string;
  readonly variant_attributes: Readonly<Record<string, unknown>> | null;
  readonly unit_price: number | string;
  readonly quantity: number;
  readonly line_total: number | string;
  readonly can_review: boolean;
  readonly review: CustomerOrderReviewDto | null;
  readonly brand_id?: number | null;
  readonly brand_name?: string | null;
  readonly brand_slug?: string | null;
  readonly brand?: {
    readonly id: number;
    readonly name: string;
    readonly slug?: string | null;
  } | null;
  readonly image_url?: string | null;
  readonly primary_image_url?: string | null;
  readonly original_unit_price?: number | string | null;
  readonly final_unit_price?: number | string | null;
}
export interface CustomerOrderPromotionDto {
  readonly id: number;
  readonly code: string | null;
  readonly name: string | null;
  readonly discount_amount: number | string;
}
export interface CustomerOrderCancellation {
  readonly reason_type: string | null;
  readonly reason: string | null;
  readonly cancelled_at: string | null;
  readonly requested_by?: string | null;
  readonly requester_name?: string | null;
  readonly requested_at?: string | null;
}

export type CustomerRefundStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "refunded";
export interface CustomerOrderRefundDto {
  readonly id: number;
  readonly refund_number: string;
  readonly status: CustomerRefundStatus;
  readonly status_label: string;

  readonly requested_amount: number | string;
  readonly approved_amount: number | string | null;

  readonly reason?: string | null;
  readonly review_note: string | null;

  readonly requested_at?: string | null;
  readonly accepted_at?: string | null;
  readonly reviewed_at: string | null;
  readonly rejected_at?: string | null;
  readonly refunded_at: string | null;

  readonly payment_destination?: "card" | "wallet" | null;
  readonly payment_destination_label?: string | null;

  readonly product_value?: number | string | null;
  readonly voucher_discount_amount?: number | string | null;
  readonly received_amount?: number | string | null;
}
export interface CustomerOrderDetailDto extends CustomerOrderDto {
  readonly branch: CustomerOrderBranch;
  readonly delivery_address: CustomerOrderDeliveryAddress | null;
  readonly shipment: CustomerOrderShipmentDto | null;
  readonly applied_promotion?: CustomerOrderPromotionDto | null;
  readonly items: readonly CustomerOrderItemDto[];
  readonly subtotal: number | string;
  readonly discount_amount: number | string;
  readonly shipping_fee: number | string;
  readonly product_discount_amount?: number | string | null;
  readonly voucher_discount_amount?: number | string | null;
  readonly shipping_discount_amount?: number | string | null;

  readonly pickup_customer?: {
    readonly name: string | null;
    readonly phone: string | null;
    readonly address: string | null;
  } | null;

  readonly cancellation_requested_by?: string | null;
  readonly cancellation_requested_at?: string | null;

  readonly available_actions?: {
    readonly can_cancel?: boolean;
    readonly can_request_refund?: boolean;
    readonly can_track?: boolean;
    readonly can_repurchase?: boolean;
    readonly can_retry_payment?: boolean;
  };
  readonly cancellation: CustomerOrderCancellation | null;
  readonly refund: CustomerOrderRefundDto | null;
  readonly placed_at: string | null;
  readonly cancelled_at: string | null;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}
export interface CustomerOrderDetailResponse {
  readonly success: boolean;
  readonly message: string;
  readonly data: CustomerOrderDetailDto;
}

export interface CustomerOrderItem {
  readonly id: number;
  readonly productVariantId: number;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
  readonly canReview: boolean;
  readonly review: CustomerOrderReviewDto | null;
  readonly brandId?: number | null;
  readonly brandName?: string | null;
  readonly brandSlug?: string | null;
  readonly imageUrl?: string | null;
  readonly originalPrice?: number | null;
  readonly promotionalPrice?: number | null;
  readonly finalUnitPrice?: number | null;
}
export interface CustomerOrderShipment {
  readonly provider: string | null;
  readonly trackingCode: string | null;
  readonly status: string | null;
  readonly statusLabel?: string | null;
  readonly shippingFee: number;
  readonly expectedDeliveryAt: string | null;
  readonly shippedAt: string | null;
  readonly deliveredAt: string | null;
  readonly cancelledAt: string | null;
  readonly currentLocation?: string | null;
}
export interface CustomerOrderRefund {
  readonly id: number;
  readonly refundNumber: string;
  readonly status: CustomerRefundStatus;
  readonly statusLabel: string;
  readonly requestedAmount: number;
  readonly approvedAmount: number | null;
  readonly reviewNote: string | null;
  readonly reviewedAt: string | null;
  readonly refundedAt: string | null;

  readonly requestedAt?: string | null;
  readonly acceptedAt?: string | null;
  readonly rejectedAt?: string | null;

  readonly reason?: string | null;
  readonly paymentDestination?: "card" | "wallet" | null;
  readonly paymentDestinationLabel?: string | null;
  readonly productValue?: number | null;
  readonly voucherDiscountAmount?: number | null;
  readonly receivedAmount?: number | null;
}
export interface CustomerOrderPayment {
  readonly id: number;
  readonly paymentNumber: string;
  readonly method: string;
  readonly status: CustomerOrderPaymentStatus;
  readonly statusLabel: string;
  readonly amount: number;
  readonly provider: string | null;
  readonly transactionReference: string | null;
  readonly paidAt: string | null;
  readonly failedAt: string | null;
  readonly cancelledAt: string | null;
  readonly refundedAt: string | null;
}
export interface CustomerOrder {
  readonly id: number;
  readonly orderNumber: string;
  readonly status: CustomerOrderStatus;
  readonly statusLabel: string;
  readonly deliveryMethod: CustomerOrderDeliveryMethod;
  readonly paymentMethod: CustomerOrderPaymentMethod;
  readonly paymentStatus: CustomerOrderPaymentStatus | null;
  readonly paymentStatusLabel: string | null;
  readonly payment: CustomerOrderPayment | null;
  readonly branch: CustomerOrderBranch;
  readonly deliveryAddress: CustomerOrderDeliveryAddress | null;
  readonly shipment: CustomerOrderShipment | null;
  readonly items: readonly CustomerOrderItem[];
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly shippingFee: number;
  readonly totalAmount: number;
  readonly productDiscountAmount?: number | null;
  readonly voucherDiscountAmount?: number | null;
  readonly shippingDiscountAmount?: number | null;
  readonly promotionCode?: string | null;
  readonly cancellation: CustomerOrderCancellation | null;
  readonly refund: CustomerOrderRefund | null;
  readonly placedAt: string | null;
  readonly cancelledAt: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly cancellationRequestedBy?: string | null;
  readonly pickupCustomerName?: string | null;
  readonly pickupCustomerPhone?: string | null;
  readonly pickupCustomerAddress?: string | null;
  readonly cancellationRequestedAt?: string | null;
  readonly paidAt?: string | null;
  readonly availableActions?: {
    readonly canCancel?: boolean;
    readonly canRequestRefund?: boolean;
    readonly canTrack?: boolean;
    readonly canRepurchase?: boolean;
    readonly canRetryPayment?: boolean;
  };
  readonly previewId?: string;
}
export interface CustomerOrderPage {
  readonly orders: readonly CustomerOrder[];
  readonly currentPage: number;
  readonly lastPage: number;
  readonly total: number;
}

export function orderBelongsToTab(
  order: CustomerOrder,
  tab: CustomerOrderTab,
): boolean {
  if (tab === "all") return true;
  return currentCustomerOrderTab(order) === tab;
}

export function currentCustomerOrderTab(
  order: CustomerOrder,
): Exclude<CustomerOrderTab, "all"> {
  const presentationState = resolveCustomerOrderPresentationState(order);
  if (presentationState.startsWith("refund_")) return "refund";
  if (presentationState === "pending" || presentationState === "processing")
    return "awaiting-confirmation";
  if (presentationState === "awaiting_pickup") return "awaiting-pickup";
  if (presentationState === "shipping") return "shipping";
  if (presentationState === "completed") return "completed";
  return "cancelled";
}

export function resolveCustomerOrderPresentationState(
  order: Pick<CustomerOrder, "status" | "refund">,
): CustomerOrderPresentationState {
  if (order.refund?.status === "rejected") return "refund_rejected";
  if (order.refund?.status === "refunded" || order.status === "refunded")
    return "refund_completed";
  if (order.refund?.status === "approved") return "refund_processing";
  if (
    order.refund?.status === "requested" ||
    order.status === "refund_requested"
  )
    return "refund_requested";
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "delivered") return "completed";
  if (order.status === "shipping") return "shipping";
  if (order.status === "confirmed") return "awaiting_pickup";
  return order.status;
}

export function customerOrderPreviewEnabled(
  isDevelopment: boolean,
  previewQuery: unknown,
): boolean {
  return isDevelopment && previewQuery === "1";
}

const CUSTOMER_ORDER_PAYMENT_STATUS_LABEL: Readonly<
  Record<CustomerOrderPaymentStatus, string>
> = {
  pending: "Chờ thanh toán",
  paid: "Đã thu tiền",
  failed: "Thanh toán thất bại",
  cancelled: "Đã hủy thanh toán",
  refunded: "Đã hoàn tiền",
};

export function customerOrderPaymentStatusLabel(
  status: CustomerOrderPaymentStatus | null,
  backendLabel?: string | null,
): string | null {
  const authoritativeLabel = backendLabel?.trim();
  if (authoritativeLabel) return authoritativeLabel;
  return status ? CUSTOMER_ORDER_PAYMENT_STATUS_LABEL[status] : null;
}

export function isCustomerOrderPaid(
  order: Pick<CustomerOrder, "paymentStatus">,
): boolean {
  return order.paymentStatus === "paid";
}
