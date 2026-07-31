import type { ApiResponse } from '@/types/api'

export interface LocationProvince {
  readonly ghn_province_id: number
  readonly name: string
}

export interface LocationDistrict {
  readonly ghn_district_id: number
  readonly name: string
}

export interface LocationWard {
  readonly ghn_ward_code: string
  readonly name: string
}

export type ProvinceListResponse = ApiResponse<readonly LocationProvince[]>
export type DistrictListResponse = ApiResponse<readonly LocationDistrict[]>
export type WardListResponse = ApiResponse<readonly LocationWard[]>
