import { apiClient } from '@/api/clients'
import { ensureCsrfCookie } from '@/api/csrf'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { AdminListParams, AdminModule, AdminOrderCounts, AdminPage, AdminRecord } from '@/types/admin'

const collections: Record<AdminModule, string> = {
  orders: ENDPOINTS.adminOrders,
  refunds: ENDPOINTS.adminRefunds,
  appointments: ENDPOINTS.adminAppointments,
  customers: ENDPOINTS.adminCustomers,
  products: ENDPOINTS.adminProducts,
  categories: ENDPOINTS.adminCategories,
  brands: ENDPOINTS.adminBrands,
  inventory: ENDPOINTS.adminInventory,
  promotions: ENDPOINTS.adminPromotions,
  reviews: ENDPOINTS.adminReviews,
  branches: ENDPOINTS.adminBranches,
  staff: ENDPOINTS.adminStaff,
}

const details: Partial<Record<AdminModule, (id: number | string) => string>> = {
  orders: ENDPOINTS.adminOrder,
  refunds: ENDPOINTS.adminRefund,
  appointments: ENDPOINTS.adminAppointment,
  customers: ENDPOINTS.adminCustomer,
  products: ENDPOINTS.adminProduct,
  categories: ENDPOINTS.adminCategory,
  brands: ENDPOINTS.adminBrand,
  promotions: ENDPOINTS.adminPromotion,
  reviews: ENDPOINTS.adminReview,
  branches: ENDPOINTS.adminBranch,
  staff: ENDPOINTS.adminStaffMember,
}

function compactParams(params: AdminListParams): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined))
}

function listParams(module: AdminModule, params: AdminListParams): Record<string, unknown> {
  const raw = { ...params } as Record<string, unknown>
  if (!['orders', 'refunds', 'appointments'].includes(module)) {
    raw.search = raw.keyword
    delete raw.keyword
    delete raw.status
  }
  if (module === 'reviews' && params.status) raw.visibility = params.status
  if (module === 'promotions') {
    delete raw.search
  }
  delete raw.payment_status
  delete raw.delivery_method
  return compactParams(raw as AdminListParams)
}

export async function getAdminList<T extends AdminRecord>(module: AdminModule, params: AdminListParams): Promise<AdminPage<T>> {
  const response = await apiClient.get<ApiResponse<T[]>>(collections[module], { params: listParams(module, params) })
  const meta = response.data.meta?.pagination as Partial<AdminPage<T>['pagination']> | undefined
  return {
    items: response.data.data,
    pagination: {
      current_page: meta?.current_page ?? params.page ?? 1,
      per_page: meta?.per_page ?? params.per_page ?? 15,
      total: meta?.total ?? response.data.data.length,
      last_page: meta?.last_page ?? 1,
    },
  }
}

export async function getAdminDetail<T extends AdminRecord>(module: AdminModule, id: number | string): Promise<T> {
  const endpoint = details[module]
  if (!endpoint) throw new Error(`Module ${module} has no detail endpoint`)
  const response = await apiClient.get<ApiResponse<T>>(endpoint(id))
  return response.data.data
}

export async function getAdminOrderCounts(): Promise<AdminOrderCounts> {
  const response = await apiClient.get<ApiResponse<AdminOrderCounts>>(ENDPOINTS.adminOrderCounts)
  return response.data.data
}

async function mutate<T>(method: 'post' | 'patch' | 'put' | 'delete', endpoint: string, payload?: unknown): Promise<T> {
  await ensureCsrfCookie()
  const response = await apiClient.request<ApiResponse<T>>({ method, url: endpoint, data: payload })
  return response.data.data
}

export function createAdminRecord<T>(module: Extract<AdminModule, 'customers' | 'products' | 'categories' | 'brands' | 'promotions' | 'staff'>, payload: unknown): Promise<T> {
  return mutate<T>('post', collections[module], payload)
}

export function updateAdminRecord<T>(module: Exclude<AdminModule, 'orders' | 'refunds' | 'appointments' | 'inventory'>, id: number | string, payload: unknown): Promise<T> {
  const endpoint = details[module]
  if (!endpoint) throw new Error(`Module ${module} has no update endpoint`)
  return mutate<T>('patch', endpoint(id), payload)
}

export function deletePromotion(id: number | string): Promise<unknown> {
  return mutate('delete', ENDPOINTS.adminPromotion(id))
}

export function deleteAdminCatalog(module: Extract<AdminModule, 'products' | 'categories' | 'brands'>, id: number | string): Promise<unknown> {
  const endpoint = details[module]
  if (!endpoint) throw new Error(`Module ${module} has no delete endpoint`)
  return mutate('delete', endpoint(id))
}

export function runOrderAction<T>(id: number | string, action: string): Promise<T> {
  const endpointAction = ({
    create_shipment: 'shipment',
    cancel_shipment: 'shipment/cancel',
    shipment_label: 'shipment/label',
    shipment_simulate_picked: 'shipment/simulate/picked',
    shipment_simulate_delivering: 'shipment/simulate/delivering',
    shipment_simulate_delivered: 'shipment/simulate/delivered',
    shipment_simulate_delivery_failed: 'shipment/simulate/delivery-fail',
    shipment_simulate_waiting_return: 'shipment/simulate/waiting-to-return',
    shipment_simulate_returned: 'shipment/simulate/returned',
    confirm_cod_payment: 'payment/cod/confirm',
  } as Record<string, string>)[action] ?? action
  return mutate<T>('post', ENDPOINTS.adminOrderAction(id, endpointAction))
}

export function runRefundAction<T>(id: number | string, action: string, payload?: unknown): Promise<T> {
  return mutate<T>('post', ENDPOINTS.adminRefundAction(id, action.replaceAll('_', '-')), payload)
}

export function runAppointmentAction<T>(id: number | string, action: string, payload?: unknown): Promise<T> {
  if (action === 'walk-in') return mutate<T>('post', `${ENDPOINTS.adminAppointments}/walk-in`, payload)
  return mutate<T>('post', ENDPOINTS.adminAppointmentAction(id, action.replaceAll('_', '-')), payload)
}

export function adjustInventory<T>(id: number | string, payload: { quantity_delta: number; reason: string }): Promise<T> {
  return mutate<T>('post', ENDPOINTS.adminInventoryAdjust(id), payload)
}

export async function getInventoryTransactions<T extends AdminRecord>(id: number | string, params: AdminListParams): Promise<AdminPage<T>> {
  const response = await apiClient.get<ApiResponse<T[]>>(ENDPOINTS.adminInventoryTransactions(id), { params: compactParams(params) })
  const meta = response.data.meta?.pagination as unknown as AdminPage<T>['pagination']
  return { items: response.data.data, pagination: meta ?? { current_page: 1, per_page: 15, total: response.data.data.length, last_page: 1 } }
}

export async function getDashboard<T>(params: Pick<AdminListParams, 'branch_id'> & { date_from?: string; date_to?: string }): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(ENDPOINTS.adminDashboard, { params: compactParams(params) })
  return response.data.data
}

export async function getPromotionUsage<T>(id: number | string): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(ENDPOINTS.adminPromotionUsage(id))
  return response.data.data
}

export interface AdminImageUploadResult {
  upload_token: string
  preview_url: string
  mime_type: string
  size: number
}

export async function uploadAdminImage(file: File): Promise<AdminImageUploadResult> {
  await ensureCsrfCookie()

  const payload = new FormData()
  payload.append('image', file)

  const response = await apiClient.post<ApiResponse<AdminImageUploadResult>>(
    ENDPOINTS.adminMediaImages,
    payload,
  )

  return response.data.data
}
