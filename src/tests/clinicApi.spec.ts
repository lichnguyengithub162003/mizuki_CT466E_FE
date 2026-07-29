import { afterEach, describe, expect, it, vi } from 'vitest'
import { listClinics, listClinicServices, listClinicSlots } from '@/api/clinic'
import type {
  ClinicBranch,
  ClinicService,
  ClinicSlotsData,
} from '@/types/clinic'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/api/clients', () => ({
  apiClient: { get: clientMocks.get },
}))

const branch: ClinicBranch = {
  id: 2,
  code: 'CLINIC-CT',
  name: 'Mizuki Cần Thơ',
  branch_type: 'hybrid',
  phone: '02920000000',
  address: 'Cần Thơ',
  business_hours: [],
  province_code: 'CT',
}

const service: ClinicService = {
  id: 10,
  category: 'skin_care',
  name: 'Chăm sóc da chuyên sâu',
  slug: 'hasaki-clinic-10',
  short_description: 'Dịch vụ chăm sóc da',
  description: null,
  image_url: null,
  duration_minutes: 60,
  price: 450000,
  is_available: true,
  capacity: 1,
}

const slotsData: ClinicSlotsData = {
  branch,
  service,
  date: '2026-08-03',
  timezone: 'Asia/Ho_Chi_Minh',
  slots: [
    {
      start_at: '2026-08-03T09:00:00+07:00',
      end_at: '2026-08-03T10:00:00+07:00',
      available: true,
      remaining_capacity: 1,
    },
  ],
}

afterEach(() => {
  clientMocks.get.mockReset()
})

describe('clinic API', () => {
  it('maps clinic, service, and slot envelopes to endpoint data', async () => {
    clientMocks.get
      .mockResolvedValueOnce({
        data: { success: true, data: [branch], message: '', meta: {} },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: [service], message: '', meta: {} },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: slotsData, message: '', meta: {} },
      })

    await expect(listClinics()).resolves.toEqual([branch])
    await expect(listClinicServices(2)).resolves.toEqual([service])
    await expect(listClinicSlots(2, 10, '2026-08-03')).resolves.toEqual(slotsData)

    expect(clientMocks.get).toHaveBeenNthCalledWith(1, '/clinics')
    expect(clientMocks.get).toHaveBeenNthCalledWith(2, '/clinics/2/services')
    expect(clientMocks.get).toHaveBeenNthCalledWith(
      3,
      '/clinics/2/services/10/slots',
      { params: { date: '2026-08-03' } },
    )
  })
})
