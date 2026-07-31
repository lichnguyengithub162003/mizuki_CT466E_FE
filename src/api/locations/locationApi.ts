import { apiClient } from '@/api/clients'
import type {
  DistrictListResponse,
  LocationDistrict,
  LocationProvince,
  LocationWard,
  ProvinceListResponse,
  WardListResponse,
} from '@/api/locations/locationTypes'
import { ENDPOINTS } from '@/constants/endpoints'

export async function listLocationProvinces(): Promise<readonly LocationProvince[]> {
  const response = await apiClient.get<ProvinceListResponse>(ENDPOINTS.locationProvinces)

  return response.data.data
}

export async function listLocationDistricts(
  provinceId: number,
): Promise<readonly LocationDistrict[]> {
  const response = await apiClient.get<DistrictListResponse>(
    ENDPOINTS.locationDistricts(provinceId),
  )

  return response.data.data
}

export async function listLocationWards(
  districtId: number,
): Promise<readonly LocationWard[]> {
  const response = await apiClient.get<WardListResponse>(
    ENDPOINTS.locationWards(districtId),
  )

  return response.data.data
}
