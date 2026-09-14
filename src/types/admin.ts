import type { ApplicationError } from "@/types/errors";

export type AdminRecord = Record<string, any> & { id: number };
export type AdminRefundReturnStatus =
  | "not_required"
  | "awaiting_return"
  | "in_transit"
  | "received"
  | "restocked"
  | "not_restockable";
export type AdminRefundInspectionStatus =
  | "pending"
  | "accepted_restockable"
  | "accepted_not_restockable"
  | "rejected";
export type AdminRefundSettlementStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed";
export type AdminModule =
  | "orders"
  | "refunds"
  | "appointments"
  | "customers"
  | "products"
  | "categories"
  | "brands"
  | "inventory"
  | "promotions"
  | "reviews"
  | "branches"
  | "staff";

export interface AdminListParams {
  keyword?: string;
  search?: string;
  role?: "super_admin" | "branch_manager" | "cashier" | "sales_staff" | "technician";
  status?: string;
  payment_status?: string;
  delivery_method?: string;
  branch_id?: number;
  category_id?: number;
  brand_id?: number;
  technician_id?: number;
  appointment_date?: string;
  is_active?: boolean | 0 | 1;
  is_visible?: boolean | 0 | 1;
  visibility?: "visible" | "hidden";
  rating?: number;
  type?: "product" | "service";
  low_stock?: boolean | 0 | 1;
  shipping_only?: boolean | 0 | 1;
  shipment_status?: string;
  settlement_method?:
    | "wallet"
    | "vnpay"
    | "momo"
    | "zalopay"
    | "manual_external"
    | "no_payout"
    | "pending";
  destination?: "wallet" | "manual_external" | "no_payout" | "pending";
  return_status?: AdminRefundReturnStatus;
  return_inspection_status?:
    | "pending"
    | "accepted_restockable"
    | "accepted_not_restockable"
    | "rejected";
  sort?: "newest" | "oldest";
  sort_by?:
    | "status"
    | "created_at"
    | "order_number"
    | "total_amount"
    | "requested_amount"
    | "return_status"
    | "settlement_method"
    | "updated_at";
  sort_direction?: "asc" | "desc";
  date_from?: string;
  date_to?: string;
  discount_type?: string;
  page?: number;
  per_page?: number;
}

export type AdminStaffRole = NonNullable<AdminListParams["role"]>;
export type AdminStaffStatus = "working" | "left";

export interface AdminStaffListRecord extends AdminRecord {
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  avatar_rendition_url?: string | null;
  role: AdminStaffRole;
  role_label: string;
  job_title: string | null;
  branch: { id: number; code: string; name: string } | null;
  status: AdminStaffStatus;
  status_label: string;
}

export type AdminStaffWorkArea = "clinic" | "retail" | "management" | "system";

export interface AdminStaffAssignment {
  id: number;
  branch: { id: number; code: string; name: string } | null;
  role: AdminStaffRole;
  role_label: string;
  job_title: string | null;
  work_area: AdminStaffWorkArea | null;
  effective_from: string | null;
  effective_to: string | null;
  reason: string | null;
}

export interface AdminStaffLifecycleEvent {
  id: number;
  type: string;
  description: string | null;
  metadata: {
    before?: Partial<Record<"branch_id" | "role" | "job_title" | "work_area" | "employment_status", unknown>>;
    after?: Partial<Record<"branch_id" | "role" | "job_title" | "work_area" | "employment_status", unknown>>;
    from?: unknown;
    to?: unknown;
    reason?: string | null;
    state?: Record<string, unknown>;
  } | null;
  occurred_at: string | null;
  actor: { id: number; name: string } | null;
}

export interface AdminStaffDetailRecord extends AdminStaffListRecord {
  current_assignment: AdminStaffAssignment | null;
  employment_started_at: string | null;
  employment_ended_at: string | null;
  permissions: {
    change_assignment: boolean;
    change_employment_status: boolean;
    trash: boolean;
    restore: boolean;
  };
  allowed_actions: Array<"change_assignment" | "change_employment_status" | "trash" | "restore" | string>;
  history: {
    assignments: AdminStaffAssignment[];
    events: AdminStaffLifecycleEvent[];
  };
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminStaffAssignmentPayload {
  branch_id: number | null;
  role: AdminStaffRole;
  job_title: string | null;
  work_area: AdminStaffWorkArea;
  effective_from?: string;
  reason?: string | null;
}

export interface AdminStaffAssignmentBlocker {
  type: "appointments" | "pos_sessions" | string;
  count: number;
  message: string;
  action: string;
}

export interface AdminStaffAssignmentPreflight {
  can_transfer: boolean;
  blockers: AdminStaffAssignmentBlocker[];
}

export interface AdminOrderListRecord extends AdminRecord {
  order_number: string;
  status: string;
  status_label: string;
  customer: {
    id?: number | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  branch: { id: number; name: string; address?: string | null };
  delivery_method: "delivery" | "pickup";
  payment_method: string;
  payment_status?: string | null;
  payment_status_label?: string | null;
  total_amount: number;
  placed_at?: string | null;
  created_at?: string | null;
  items: Array<{ id: number; product_name: string; image_url?: string | null }>;
}

export interface AdminOrderCounts {
  pending: number;
  processing: number;
  shipping: number;
  refund: number;
}

export interface AdminRefundListRecord extends AdminRecord {
  refund_number: string;
  status: "requested" | "approved" | "rejected" | "refunded";
  status_label: string;
  next_action?: "wallet_payout" | "manual_settlement" | null;
  destination?: "pending" | "wallet" | "manual_external" | "no_payout" | null;
  settlement_method?: "wallet" | "manual_external" | "no_payout" | null;
  settlement: {
    method: string | null;
    method_label: string | null;
    destination: string | null;
    destination_label: string | null;
    status: AdminRefundSettlementStatus | null;
    status_label: string | null;
    reference: string | null;
  } | null;
  order: {
    id: number;
    order_number: string;
    status: string;
    total_amount: number;
  };
  customer: {
    id: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  branch: { id: number; name: string };
  requested_amount: number;
  approved_amount?: number | null;
  reason_type?: string | null;
  reason_type_label?: string | null;
  reason?: string | null;
  image_url?: string | null;
  item_count?: number;
  reviewed_at?: string | null;
  refunded_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  return: {
    required: boolean;
    status: AdminRefundReturnStatus;
    status_label: string;
    inspection_status: AdminRefundInspectionStatus | null;
    inspection_label: string | null;
    received_at?: string | null;
    restocked_at?: string | null;
    allowed_actions: Array<
      "return_receive" | "return_restock" | "return_not_restockable" | string
    >;
  };
}

export interface AdminRefundCounts {
  requested: number;
  approved_pending_payout: number;
  pending_action: number;
}

export interface AdminPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface AdminPage<T = AdminRecord> {
  items: T[];
  pagination: AdminPagination;
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "ApplicationError"
  );
}
