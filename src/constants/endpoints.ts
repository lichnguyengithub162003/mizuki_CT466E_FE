export const ENDPOINTS = {
  sanctumCsrfCookie: '/sanctum/csrf-cookie',
  clinics: '/clinics',
  clinicServices: (branchId: number) => `/clinics/${branchId}/services`,
  clinicSlots: (branchId: number, serviceId: number) =>
    `/clinics/${branchId}/services/${serviceId}/slots`,
  locationProvinces: '/locations/provinces',
  locationDistricts: (provinceId: number) =>
    `/locations/provinces/${provinceId}/districts`,
  locationWards: (districtId: number) =>
    `/locations/districts/${districtId}/wards`,
} as const
