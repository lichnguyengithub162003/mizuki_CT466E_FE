import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CustomerAppointmentsPage from '@/pages/customer/CustomerAppointmentsPage.vue'
import CustomerAppointmentDetailPage from '@/pages/customer/CustomerAppointmentDetailPage.vue'
import type { CustomerAppointment } from '@/types/clinic'

const apiMocks = vi.hoisted(() => ({
  listClinics: vi.fn(),
  listClinicServices: vi.fn(),
  listClinicCatalogServices: vi.fn(),
  listClinicSlots: vi.fn(),
  createCustomerAppointment: vi.fn(),
  listCustomerAppointments: vi.fn(),
  getCustomerAppointment: vi.fn(),
  cancelCustomerAppointment: vi.fn(),
}))

vi.mock('@/api/clinic', () => apiMocks)

const appointment: CustomerAppointment = {
  id: 31,
  appointment_number: 'APT-260828-QATEST0001',
  status: 'pending',
  status_label: 'Chờ xác nhận',
  branch: { id: 2, code: 'CLINIC-CT', name: 'Mizuki Clinic Cần Thơ', branch_type: 'hybrid' },
  service: { id: 10, name: 'Chăm sóc da chuyên sâu', slug: 'cham-soc-da', price: 450000, duration_minutes: 60 },
  technician: { id: 8, name: 'Chuyên viên Minh Anh' },
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

const wrappers: VueWrapper[] = []
const clients: QueryClient[] = []

function queryClient(): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
  clients.push(client)
  return client
}

function router() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/appointments', name: 'customer-appointments', component: CustomerAppointmentsPage },
      { path: '/appointments/:id', name: 'customer-appointment-detail', component: CustomerAppointmentDetailPage },
      { path: '/skin-care', name: 'skin-care', component: { template: '<main>Clinic</main>' } },
    ],
  })
}

beforeEach(() => {
  apiMocks.listCustomerAppointments.mockReset().mockResolvedValue({
    appointments: [appointment],
    pagination: { current_page: 1, per_page: 15, total: 1, last_page: 1 },
  })
  apiMocks.getCustomerAppointment.mockReset().mockResolvedValue(appointment)
  apiMocks.cancelCustomerAppointment.mockReset().mockResolvedValue({ ...appointment, status: 'cancelled', status_label: 'Đã hủy', cancelled_at: '2026-08-28T09:00:00+07:00' })
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  clients.splice(0).forEach((client) => client.clear())
})

describe('customer appointments', () => {
  it('renders authoritative history fields and navigates to detail', async () => {
    const appRouter = router()
    await appRouter.push('/appointments')
    await appRouter.isReady()
    const wrapper = mount(CustomerAppointmentsPage, {
      global: {
        plugins: [appRouter, [VueQueryPlugin, { queryClient: queryClient() }]],
        stubs: { CustomerLayout: { template: '<div><slot /></div>' } },
      },
    })
    wrappers.push(wrapper)
    await flushPromises()

    expect(wrapper.get('[data-testid="appointment-list"]').text()).toContain('Chăm sóc da chuyên sâu')
    expect(wrapper.text()).toContain('Mizuki Clinic Cần Thơ')
    expect(wrapper.text()).toContain('Chuyên viên Minh Anh')
    expect(wrapper.text()).toContain('Chờ xác nhận')
    expect(wrapper.text()).toContain('Chi phí dự kiến')
    await wrapper.get('[data-testid="appointment-list"] article button').trigger('click')
    await flushPromises()
    expect(appRouter.currentRoute.value.path).toBe('/appointments/31')
  })

  it('confirms cancellation once and replaces the detail with the authoritative cancelled response', async () => {
    const appRouter = router()
    await appRouter.push('/appointments/31')
    await appRouter.isReady()
    const wrapper = mount(CustomerAppointmentDetailPage, {
      global: {
        plugins: [appRouter, [VueQueryPlugin, { queryClient: queryClient() }]],
        stubs: { CustomerLayout: { template: '<div><slot /></div>' } },
      },
    })
    wrappers.push(wrapper)
    await flushPromises()

    expect(wrapper.text()).toContain('Chăm sóc da chuyên sâu')
    expect(wrapper.text()).toContain('Da nhạy cảm')
    expect(wrapper.text()).toContain('Thanh toán tại quầy sau khi hoàn thành dịch vụ.')
    expect(wrapper.text()).not.toContain('Phương thức thanh toán')
    const cancelButton = wrapper.findAll('button').find((button) => button.text() === 'Hủy lịch hẹn')
    expect(cancelButton).toBeDefined()
    await cancelButton!.trigger('click')
    await wrapper.get('[data-testid="cancel-confirmation"] button:last-child').trigger('click')
    await flushPromises()

    expect(apiMocks.cancelCustomerAppointment).toHaveBeenCalledOnce()
    expect(apiMocks.cancelCustomerAppointment).toHaveBeenCalledWith(31)
    expect(wrapper.text()).toContain('Đã hủy')
    expect(wrapper.text()).not.toContain('Xác nhận hủy')
  })
})
