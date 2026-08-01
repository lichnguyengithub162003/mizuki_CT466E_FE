import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'

export interface BranchOpeningHour {
  weekday: number
  opens_at: string | null
  closes_at: string | null
  is_closed: boolean
}

export interface Branch {
  id: number
  code: string
  name: string
  address: string
  phone: string | null
  email: string | null
  is_active: boolean
  opening_hours: BranchOpeningHour[]
}

interface BranchesResponse {
  success: boolean
  data: Branch[]
  message?: string
}

function mapOpeningHour(value: BranchOpeningHour): BranchOpeningHour {
  return {
    weekday: value.weekday,
    opens_at: value.opens_at,
    closes_at: value.closes_at,
    is_closed: value.is_closed,
  }
}

function mapBranch(value: Branch): Branch {
  return {
    id: value.id,
    code: value.code,
    name: value.name,
    address: value.address,
    phone: value.phone,
    email: value.email,
    is_active: value.is_active,
    opening_hours: value.opening_hours.map(mapOpeningHour),
  }
}

export async function getBranches(): Promise<Branch[]> {
  const response = await apiClient.get<BranchesResponse>(ENDPOINTS.branches)
  return response.data.data.map(mapBranch)
}
