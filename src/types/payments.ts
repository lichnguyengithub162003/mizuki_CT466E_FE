import type {
  CustomerOrderPaymentMethod,
  CustomerOrderPaymentStatus,
} from "@/types/orders";

export type PaymentStatus = CustomerOrderPaymentStatus;

export interface VnPayUrlResponse {
  readonly success: true;
  readonly message: string;
  readonly data: {
    readonly payment_url: string;
    readonly expires_at: string;
    readonly payment_number: string;
  };
  readonly meta: Readonly<Record<string, unknown>>;
}

export interface VnPayPaymentUrl {
  readonly paymentUrl: string;
  readonly expiresAt: string;
  readonly paymentNumber: string;
}

export interface VnPayReturnResponse {
  readonly success: true;
  readonly message: string;
  readonly data: {
    readonly payment_number: string;
    readonly status: PaymentStatus;
    readonly order_number: string;
    readonly amount: number;
    readonly response_code: string;
  };
  readonly meta: Readonly<Record<string, unknown>>;
}

export interface VerifiedVnPayReturn {
  readonly paymentNumber: string;
  readonly reportedStatus: PaymentStatus;
  readonly orderNumber: string;
  readonly amount: number;
}

export interface CustomerOrderPaymentResponse {
  readonly success: true;
  readonly message: string;
  readonly data: {
    readonly payment_number: string;
    readonly method: CustomerOrderPaymentMethod;
    readonly status: PaymentStatus;
    readonly status_label: string;
    readonly amount: number;
    readonly paid_at: string | null;
    readonly provider: string | null;
    readonly provider_transaction_id: string | null;
  };
  readonly meta: Readonly<Record<string, unknown>>;
}

export interface CustomerOrderPaymentState {
  readonly paymentNumber: string;
  readonly method: CustomerOrderPaymentMethod;
  readonly status: PaymentStatus;
  readonly statusLabel: string;
  readonly amount: number;
  readonly paidAt: string | null;
  readonly provider: string | null;
  readonly providerTransactionId: string | null;
}
