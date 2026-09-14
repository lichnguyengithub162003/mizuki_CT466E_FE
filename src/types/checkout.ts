import type {
  CreateCustomerOrderRequest,
  CustomerOrderPaymentMethod,
} from "@/types/orders";

export type CheckoutPreviewRequest = CreateCustomerOrderRequest;

export interface CheckoutPreviewDto {
  readonly delivery_method: "delivery" | "pickup";
  readonly branch: {
    readonly id: number;
    readonly name: string;
    readonly address: string;
  };
  readonly address_id: number | null;
  readonly promotion: {
    readonly id: number;
    readonly code: string | null;
    readonly name: string | null;
  } | null;
  readonly subtotal: number;
  readonly discount_amount: number;
  readonly shipping_fee: number;
  readonly total_amount: number;
  readonly expected_delivery_time: string | null;
  readonly wallet: {
    readonly balance: number;
    readonly payable: boolean;
    readonly shortfall: number;
  };
  readonly payment_methods: readonly {
    readonly value: CustomerOrderPaymentMethod;
    readonly label: string;
  }[];
  readonly selected_payment_method: CustomerOrderPaymentMethod;
}

export interface CheckoutPreviewResponse {
  readonly success: true;
  readonly message: string;
  readonly data: CheckoutPreviewDto;
  readonly meta: Readonly<Record<string, unknown>>;
}

export interface CheckoutPreview {
  readonly deliveryMethod: "delivery" | "pickup";
  readonly branch: CheckoutPreviewDto["branch"];
  readonly addressId: number | null;
  readonly promotion: CheckoutPreviewDto["promotion"];
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly shippingFee: number;
  readonly totalAmount: number;
  readonly expectedDeliveryTime: string | null;
  readonly wallet: CheckoutPreviewDto["wallet"];
  readonly paymentMethods: CheckoutPreviewDto["payment_methods"];
  readonly selectedPaymentMethod: CustomerOrderPaymentMethod;
}
