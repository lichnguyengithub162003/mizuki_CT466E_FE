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
