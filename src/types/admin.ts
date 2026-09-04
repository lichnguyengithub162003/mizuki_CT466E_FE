import type { ApplicationError } from '@/types/errors'

export type AdminRecord = Record<string, any> & { id: number }
export type AdminModule =
  | 'orders' | 'refunds' | 'appointments' | 'customers' | 'products'
  | 'categories' | 'brands' | 'inventory' | 'promotions' | 'reviews'
  | 'branches' | 'staff'

export interface AdminListParams {
  keyword?: string
  search?: string
  status?: string
  payment_status?: string
  delivery_method?: string
  branch_id?: number
  category_id?: number
  brand_id?: number
  technician_id?: number
  appointment_date?: string
  is_active?: boolean | 0 | 1
  is_visible?: boolean | 0 | 1
  visibility?: 'visible' | 'hidden'
  rating?: number
  type?: 'product' | 'service'
  low_stock?: boolean | 0 | 1
  shipping_only?: boolean | 0 | 1
  shipment_status?: string
  sort?: 'newest' | 'oldest'
  sort_by?: 'order_number' | 'total_amount' | 'status' | 'created_at'
  sort_direction?: 'asc' | 'desc'
  date_from?: string
  date_to?: string
  discount_type?: string
  page?: number
  per_page?: number
}

export interface AdminOrderListRecord extends AdminRecord {
  order_number: string
  status: string
  status_label: string
  customer: { id?: number | null; name?: string | null; email?: string | null; phone?: string | null }
  branch: { id: number; name: string; address?: string | null }
  delivery_method: 'delivery' | 'pickup'
  payment_method: string
  payment_status?: string | null
  payment_status_label?: string | null
  total_amount: number
  placed_at?: string | null
  created_at?: string | null
  items: Array<{ id: number; product_name: string; image_url?: string | null }>
}

export interface AdminOrderCounts {
  pending: number
  processing: number
  shipping: number
  refund: number
}

export interface AdminPagination {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface AdminPage<T = AdminRecord> {
  items: T[]
  pagination: AdminPagination
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'ApplicationError'
}
