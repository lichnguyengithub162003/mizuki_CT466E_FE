import { afterEach, describe, expect, it, vi } from 'vitest'
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
import type {
  ClinicBranch,
  ClinicService,
  ClinicSlotsData,
  CustomerAppointment,
} from '@/types/clinic'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/api/clients', () => ({
  apiClient: { get: clientMocks.get, post: clientMocks.post },
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

const appointment: CustomerAppointment = {
  id: 31,
  appointment_number: 'APT-260828-QATEST0001',
  status: 'pending',
  status_label: 'Chờ xác nhận',
  branch: { id: 2, code: 'CLINIC-CT', name: 'Mizuki Cần Thơ', branch_type: 'hybrid' },
  service: { id: 10, name: service.name, slug: service.slug, price: 450000, duration_minutes: 60 },
  technician: null,
  starts_at: '2026-08-29T09:00:00+07:00',
  ends_at: '2026-08-29T10:00:00+07:00',
  customer_note: 'Da nhạy cảm',
  staff_note: null,
  can_review: false,
  review: null,
  cancelled_at: null,
  completed_at: null,
  created_at: '2026-08-28T08:00:00+07:00',
  updated_at: '2026-08-28T08:00:00+07:00',
}

afterEach(() => {
  clientMocks.get.mockReset()
  clientMocks.post.mockReset()
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

  it('merges authoritative branch service responses into one catalog', async () => {
    const secondBranchService = { ...service, id: 11, name: 'Chăm sóc phục hồi' }
    clientMocks.get
      .mockResolvedValueOnce({ data: { data: [service] } })
      .mockResolvedValueOnce({ data: { data: [service, secondBranchService] } })

    await expect(listClinicCatalogServices([2, 3])).resolves.toEqual([
      { ...service, branch_ids: [2, 3] },
      { ...secondBranchService, branch_ids: [3] },
    ])
    expect(clientMocks.get).toHaveBeenNthCalledWith(1, '/clinics/2/services')
    expect(clientMocks.get).toHaveBeenNthCalledWith(2, '/clinics/3/services')
  })

  it('uses the verified customer appointment create, list, detail, and cancel contracts', async () => {
    const payload = {
      branch_id: 2,
      service_id: 10,
      appointment_date: '2026-08-29',
      start_time: '09:00',
      customer_note: 'Da nhạy cảm',
    }
    clientMocks.post
      .mockResolvedValueOnce({ data: { success: true, data: appointment } })
      .mockResolvedValueOnce({ data: { success: true, data: { ...appointment, status: 'cancelled' } } })
    clientMocks.get
      .mockResolvedValueOnce({ data: { success: true, data: [appointment], meta: { pagination: { current_page: 1, per_page: 15, total: 1, last_page: 1 } } } })
      .mockResolvedValueOnce({ data: { success: true, data: appointment } })

    await expect(createCustomerAppointment(payload)).resolves.toEqual(appointment)
    await expect(listCustomerAppointments(1, 15)).resolves.toEqual({
      appointments: [appointment],
      pagination: { current_page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    await expect(getCustomerAppointment(31)).resolves.toEqual(appointment)
    await expect(cancelCustomerAppointment(31)).resolves.toMatchObject({ id: 31, status: 'cancelled' })

    expect(clientMocks.post).toHaveBeenNthCalledWith(1, '/customer/appointments', payload)
    expect(clientMocks.get).toHaveBeenNthCalledWith(1, '/customer/appointments', { params: { page: 1, per_page: 15 } })
    expect(clientMocks.get).toHaveBeenNthCalledWith(2, '/customer/appointments/31')
    expect(clientMocks.post).toHaveBeenNthCalledWith(2, '/customer/appointments/31/cancel')
  })
})
