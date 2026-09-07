import type { ApiResponse } from '@/types/api'

export type ClinicBranchType = 'clinic' | 'hybrid'

export interface ClinicBusinessHour {
  readonly weekday: number
  readonly opens_at: string | null
  readonly closes_at: string | null
  readonly is_closed: boolean
}

export interface ClinicBranch {
  readonly id: number
  readonly code: string
  readonly name: string
  readonly branch_type: ClinicBranchType
  readonly phone: string | null
  readonly address: string
  readonly province_code: string | null
  readonly business_hours: readonly ClinicBusinessHour[]
}

export interface ClinicService {
  readonly id: number
  readonly category: string
  readonly name: string
  readonly slug: string
  readonly short_description: string | null
  readonly description: string | null
  readonly image_url: string | null
  readonly duration_minutes: number
  readonly price: number
  readonly is_available: boolean
  readonly capacity: number
}

export interface ClinicCatalogService extends ClinicService {
  readonly branch_ids: readonly number[]
}

export interface ClinicSlot {
  readonly start_at: string
  readonly end_at: string
  readonly available: boolean
  readonly remaining_capacity: number
}

export interface ClinicSlotsData {
  readonly branch: ClinicBranch
  readonly service: ClinicService
  readonly date: string
  readonly timezone: string
  readonly slots: readonly ClinicSlot[]
}

export type ClinicListResponse = ApiResponse<readonly ClinicBranch[]>
export type ClinicServiceListResponse = ApiResponse<readonly ClinicService[]>
export type ClinicSlotsResponse = ApiResponse<ClinicSlotsData>

export type CustomerAppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface CustomerAppointmentReview {
  readonly id: number
  readonly rating: number
  readonly title: string | null
  readonly comment: string | null
  readonly is_visible: boolean
  readonly reviewed_at: string | null
  readonly updated_at: string | null
}

export interface CustomerAppointment {
  readonly id: number
  readonly appointment_number: string
  readonly status: CustomerAppointmentStatus
  readonly status_label: string
  readonly branch: Pick<ClinicBranch, 'id' | 'name' | 'code' | 'branch_type'>
  readonly service: {
    readonly id: number
    readonly name: string
    readonly slug: string
    readonly price: number
    readonly duration_minutes: number
  }
  readonly technician: { readonly id: number; readonly name: string } | null
  readonly starts_at: string
  readonly ends_at: string
  readonly customer_note: string | null
  readonly staff_note: string | null
  readonly can_review: boolean
  readonly review: CustomerAppointmentReview | null
  readonly cancelled_at: string | null
  readonly completed_at: string | null
  readonly created_at: string | null
  readonly updated_at: string | null
}

export interface CreateCustomerAppointmentRequest {
  readonly branch_id: number
  readonly service_id: number
  readonly appointment_date: string
  readonly start_time: string
  readonly customer_note?: string | null
}

export interface AppointmentPagination {
  readonly current_page: number
  readonly per_page: number
  readonly total: number
  readonly last_page: number
}

export interface CustomerAppointmentPage {
  readonly appointments: readonly CustomerAppointment[]
  readonly pagination: AppointmentPagination
}

export type CustomerAppointmentResponse = ApiResponse<CustomerAppointment>
export interface CustomerAppointmentListResponse {
  readonly success?: boolean
  readonly data: readonly CustomerAppointment[]
  readonly message?: string
  readonly meta: { readonly pagination: AppointmentPagination }
}
