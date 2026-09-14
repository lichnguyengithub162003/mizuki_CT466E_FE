import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import {
  cancelCustomerAppointment,
  createCustomerAppointment,
  getCustomerAppointment,
  listClinics,
  listClinicCatalogServices,
  listClinicServices,
  listClinicSlots,
  listCustomerAppointments,
} from '@/api/clinic'
import type { ClinicBranch, CreateCustomerAppointmentRequest } from '@/types/clinic'

const CLINIC_STALE_TIME_MS = 5 * 60_000
const SLOT_STALE_TIME_MS = 30_000

export const clinicQueryKeys = {
  all: ['clinics'] as const,
  services: (branchId: number | null) => ['clinics', branchId, 'services'] as const,
  catalogServices: (branchIds: readonly number[]) => ['clinics', 'catalog-services', ...branchIds] as const,
  slots: (branchId: number | null, serviceId: number | null, date: string) =>
    ['clinics', branchId, 'services', serviceId, 'slots', date] as const,
  appointments: ['customer-appointments', 'list'] as const,
  appointment: (appointmentId: number | null) => ['customer-appointments', 'detail', appointmentId] as const,
}

export function useCustomerAppointmentsQuery() {
  return useInfiniteQuery({
    queryKey: clinicQueryKeys.appointments,
    queryFn: ({ pageParam }) => listCustomerAppointments(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.current_page < lastPage.pagination.last_page
      ? lastPage.pagination.current_page + 1
      : undefined,
  })
}

export function useCustomerAppointmentQuery(
  appointmentId: MaybeRefOrGetter<number | null>,
) {
  const resolvedAppointmentId = computed(() => toValue(appointmentId))
  return useQuery({
    queryKey: computed(() => clinicQueryKeys.appointment(resolvedAppointmentId.value)),
    queryFn: () => getCustomerAppointment(resolvedAppointmentId.value as number),
    enabled: computed(() => resolvedAppointmentId.value !== null),
  })
}

export function useCreateCustomerAppointmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCustomerAppointmentRequest) => createCustomerAppointment(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clinicQueryKeys.appointments })
    },
  })
}

export function useCancelCustomerAppointmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (appointmentId: number) => cancelCustomerAppointment(appointmentId),
    onSuccess: async (appointment) => {
      queryClient.setQueryData(clinicQueryKeys.appointment(appointment.id), appointment)
      await queryClient.invalidateQueries({ queryKey: clinicQueryKeys.appointments })
    },
  })
}

export function useClinicsQuery() {
  return useQuery({
    queryKey: clinicQueryKeys.all,
    queryFn: listClinics,
    staleTime: CLINIC_STALE_TIME_MS,
  })
}

export function useClinicServicesQuery(
  branchId: MaybeRefOrGetter<number | null>,
) {
  const resolvedBranchId = computed(() => toValue(branchId))

  return useQuery({
    queryKey: computed(() => clinicQueryKeys.services(resolvedBranchId.value)),
    queryFn: () => listClinicServices(resolvedBranchId.value as number),
    enabled: computed(() => resolvedBranchId.value !== null),
    staleTime: CLINIC_STALE_TIME_MS,
  })
}

export function useClinicCatalogServicesQuery(
  branches: MaybeRefOrGetter<readonly ClinicBranch[] | undefined>,
) {
  const branchIds = computed(() => (toValue(branches) ?? []).map((branch) => branch.id))

  return useQuery({
    queryKey: computed(() => clinicQueryKeys.catalogServices(branchIds.value)),
    queryFn: () => listClinicCatalogServices(branchIds.value),
    enabled: computed(() => branchIds.value.length > 0),
    staleTime: CLINIC_STALE_TIME_MS,
  })
}

export function useClinicSlotsQuery(
  branchId: MaybeRefOrGetter<number | null>,
  serviceId: MaybeRefOrGetter<number | null>,
  date: MaybeRefOrGetter<string>,
) {
  const resolvedBranchId = computed(() => toValue(branchId))
  const resolvedServiceId = computed(() => toValue(serviceId))
  const resolvedDate = computed(() => toValue(date))

  return useQuery({
    queryKey: computed(() => clinicQueryKeys.slots(
      resolvedBranchId.value,
      resolvedServiceId.value,
      resolvedDate.value,
    )),
    queryFn: () => listClinicSlots(
      resolvedBranchId.value as number,
      resolvedServiceId.value as number,
      resolvedDate.value,
    ),
    enabled: computed(() =>
      resolvedBranchId.value !== null
      && resolvedServiceId.value !== null
      && resolvedDate.value.length > 0,
    ),
    staleTime: SLOT_STALE_TIME_MS,
  })
}
