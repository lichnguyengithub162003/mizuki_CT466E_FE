import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import {
  listLocationDistricts,
  listLocationProvinces,
  listLocationWards,
} from '@/api/locations/locationApi'

const LOCATION_STALE_TIME_MS = 24 * 60 * 60_000

export const locationQueryKeys = {
  all: ['locations'] as const,
  provinces: () => ['locations', 'provinces'] as const,
  districts: (provinceId: number | null) =>
    ['locations', 'provinces', provinceId, 'districts'] as const,
  wards: (districtId: number | null) =>
    ['locations', 'districts', districtId, 'wards'] as const,
}

export function useLocationProvincesQuery(
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const resolvedEnabled = computed(() => toValue(enabled))

  return useQuery({
    queryKey: locationQueryKeys.provinces(),
    queryFn: listLocationProvinces,
    enabled: resolvedEnabled,
    staleTime: LOCATION_STALE_TIME_MS,
  })
}

export function useLocationDistrictsQuery(
  provinceId: MaybeRefOrGetter<number | null>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const resolvedProvinceId = computed(() => toValue(provinceId))
  const resolvedEnabled = computed(() => toValue(enabled))

  return useQuery({
    queryKey: computed(() => locationQueryKeys.districts(resolvedProvinceId.value)),
    queryFn: () => listLocationDistricts(resolvedProvinceId.value as number),
    enabled: computed(() =>
      resolvedEnabled.value && resolvedProvinceId.value !== null,
    ),
    staleTime: LOCATION_STALE_TIME_MS,
  })
}

export function useLocationWardsQuery(
  districtId: MaybeRefOrGetter<number | null>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const resolvedDistrictId = computed(() => toValue(districtId))
  const resolvedEnabled = computed(() => toValue(enabled))

  return useQuery({
    queryKey: computed(() => locationQueryKeys.wards(resolvedDistrictId.value)),
    queryFn: () => listLocationWards(resolvedDistrictId.value as number),
    enabled: computed(() =>
      resolvedEnabled.value && resolvedDistrictId.value !== null,
    ),
    staleTime: LOCATION_STALE_TIME_MS,
  })
}
