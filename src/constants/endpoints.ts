export const ENDPOINTS = {
  sanctumCsrfCookie: '/sanctum/csrf-cookie',
  clinics: '/clinics',
  clinicServices: (branchId: number) => `/clinics/${branchId}/services`,
  clinicSlots: (branchId: number, serviceId: number) =>
    `/clinics/${branchId}/services/${serviceId}/slots`,
} as const
