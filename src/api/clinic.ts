import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'
import type {
  ClinicBranch,
  ClinicListResponse,
  ClinicService,
  ClinicServiceListResponse,
  ClinicSlotsData,
  ClinicSlotsResponse,
} from '@/types/clinic'

export async function listClinics(): Promise<readonly ClinicBranch[]> {
  const response = await apiClient.get<ClinicListResponse>(ENDPOINTS.clinics)

  return response.data.data
}

export async function listClinicServices(
  branchId: number,
): Promise<readonly ClinicService[]> {
  const response = await apiClient.get<ClinicServiceListResponse>(
    ENDPOINTS.clinicServices(branchId),
  )

  return response.data.data
}

export async function listClinicSlots(
  branchId: number,
  serviceId: number,
  date: string,
): Promise<ClinicSlotsData> {
  const response = await apiClient.get<ClinicSlotsResponse>(
    ENDPOINTS.clinicSlots(branchId, serviceId),
    { params: { date } },
  )

  return response.data.data
}
