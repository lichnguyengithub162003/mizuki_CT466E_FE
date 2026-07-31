export const ENDPOINTS = {
  sanctumCsrfCookie: '/sanctum/csrf-cookie',
  authLogin: '/auth/login',
  authRegister: '/auth/register',
  authMe: '/auth/me',
  authLogout: '/auth/logout',
  authForgotPassword: '/auth/forgot-password',
  authVerifyResetCode: '/auth/forgot-password/verify',
  authResetPassword: '/auth/reset-password',
  authGoogleRedirect: '/auth/google/redirect',
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
