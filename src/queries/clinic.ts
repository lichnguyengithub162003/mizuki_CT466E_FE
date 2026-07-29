import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { listClinics, listClinicServices, listClinicSlots } from '@/api/clinic'

const CLINIC_STALE_TIME_MS = 5 * 60_000
const SLOT_STALE_TIME_MS = 30_000

export const clinicQueryKeys = {
  all: ['clinics'] as const,
  services: (branchId: number | null) => ['clinics', branchId, 'services'] as const,
  slots: (branchId: number | null, serviceId: number | null, date: string) =>
    ['clinics', branchId, 'services', serviceId, 'slots', date] as const,
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
