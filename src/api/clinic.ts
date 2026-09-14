import { apiClient } from '@/api/clients'
import { ENDPOINTS } from '@/constants/endpoints'
import type {
  ClinicBranch,
  ClinicCatalogService,
  ClinicListResponse,
  ClinicService,
  ClinicServiceListResponse,
  ClinicSlotsData,
  ClinicSlotsResponse,
  CreateCustomerAppointmentRequest,
  CustomerAppointment,
  CustomerAppointmentListResponse,
  CustomerAppointmentPage,
  CustomerAppointmentResponse,
  CustomerAppointmentStatus,
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

export async function listClinicCatalogServices(
  branchIds: readonly number[],
): Promise<readonly ClinicCatalogService[]> {
  const branchResults = await Promise.all(branchIds.map(async (branchId) => ({
    branchId,
    services: await listClinicServices(branchId),
  })))
  const catalog = new Map<number, ClinicCatalogService>()

  for (const { branchId, services } of branchResults) {
    for (const service of services) {
      const existing = catalog.get(service.id)
      catalog.set(service.id, {
        ...service,
        branch_ids: existing ? [...existing.branch_ids, branchId] : [branchId],
      })
    }
  }

  return [...catalog.values()]
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

export async function createCustomerAppointment(
  payload: CreateCustomerAppointmentRequest,
): Promise<CustomerAppointment> {
  const response = await apiClient.post<CustomerAppointmentResponse>(
    ENDPOINTS.customerAppointments,
    payload,
  )
  return response.data.data
}

export async function listCustomerAppointments(
  page = 1,
  perPage = 15,
  status?: CustomerAppointmentStatus,
): Promise<CustomerAppointmentPage> {
  const response = await apiClient.get<CustomerAppointmentListResponse>(
    ENDPOINTS.customerAppointments,
    { params: { page, per_page: perPage, ...(status ? { status } : {}) } },
  )
  return {
    appointments: response.data.data,
    pagination: response.data.meta.pagination,
  }
}

export async function getCustomerAppointment(appointmentId: number): Promise<CustomerAppointment> {
  const response = await apiClient.get<CustomerAppointmentResponse>(
    ENDPOINTS.customerAppointment(appointmentId),
  )
  return response.data.data
}

export async function cancelCustomerAppointment(appointmentId: number): Promise<CustomerAppointment> {
  const response = await apiClient.post<CustomerAppointmentResponse>(
    ENDPOINTS.customerAppointmentCancel(appointmentId),
  )
  return response.data.data
}
