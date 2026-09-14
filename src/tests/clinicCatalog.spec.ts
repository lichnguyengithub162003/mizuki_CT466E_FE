import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, type Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { pinia } from '@/stores/pinia'
import { useAuthStore } from '@/stores/auth'
import type { ClinicBranch, ClinicCatalogService, ClinicSlotsData, CustomerAppointment } from '@/types/clinic'

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

const branch: ClinicBranch = {
  id: 2,
  code: 'CLINIC-CT',
  name: 'Mizuki Clinic Cần Thơ',
  branch_type: 'hybrid',
  phone: '02920000000',
  address: '18 Nguyễn Thị Sáu, Cần Thơ',
  province_code: 'CT',
  business_hours: [],
}

const service: ClinicCatalogService = {
  id: 10,
  category: 'skin_care',
  name: 'Mesoderm Trị Mụn',
  slug: 'mesoderm-tri-mun',
  short_description: 'Chăm sóc da theo nhu cầu',
  description: null,
  image_url: 'https://cdn.example.com/clinic.jpg',
  duration_minutes: 60,
  price: 400000,
  is_available: true,
  capacity: 3,
  branch_ids: [2],
}

const slots: ClinicSlotsData = {
  branch,
  service,
  date: '2026-08-29',
  timezone: 'Asia/Ho_Chi_Minh',
  slots: [
    { start_at: '2026-08-29T09:00:00+07:00', end_at: '2026-08-29T10:00:00+07:00', available: true, remaining_capacity: 2 },
    { start_at: '2026-08-29T09:30:00+07:00', end_at: '2026-08-29T10:30:00+07:00', available: false, remaining_capacity: 0 },
  ],
}

const createdAppointment: CustomerAppointment = {
  id: 31,
  appointment_number: 'APT-260828-QATEST0001',
  status: 'pending',
  status_label: 'Chờ xác nhận',
  branch: { id: branch.id, code: branch.code, name: branch.name, branch_type: branch.branch_type },
  service: { id: service.id, name: service.name, slug: service.slug, price: service.price, duration_minutes: service.duration_minutes },
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

const wrappers: VueWrapper[] = []
const queryClients: QueryClient[] = []

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
}

async function mountRoute(path: string): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createAppRouter(createMemoryHistory())
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  queryClients.push(queryClient)
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [router, [VueQueryPlugin, { queryClient }]] },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  apiMocks.listClinics.mockReset().mockResolvedValue([branch])
  apiMocks.listClinicServices.mockReset().mockResolvedValue([service])
  apiMocks.listClinicCatalogServices.mockReset().mockResolvedValue([service])
  apiMocks.listClinicSlots.mockReset().mockResolvedValue(slots)
  apiMocks.createCustomerAppointment.mockReset()
  apiMocks.listCustomerAppointments.mockReset()
  apiMocks.getCustomerAppointment.mockReset()
  apiMocks.cancelCustomerAppointment.mockReset()
  useAuthStore(pinia).resetForTesting()
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  queryClients.splice(0).forEach((client) => client.clear())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('customer clinic catalog and booking', () => {
  it('shows the service catalog immediately without a branch selector or booking form', async () => {
    const { wrapper } = await mountRoute('/skin-care')

    expect(wrapper.get('h1').text()).toBe('Dịch vụ chăm sóc da')
    expect(wrapper.get('[data-testid="clinic-service-catalog"]').text()).toContain(service.name)
    expect(wrapper.text()).toContain('Clinic Mizuki hiện có tại')
    expect(wrapper.text()).toContain(branch.name)
    expect(wrapper.find('[data-testid="clinic-branch-select"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="booking-confirmation"]').exists()).toBe(false)
  })

  it('navigates from an authoritative service card to the dedicated booking route', async () => {
    const { wrapper, router } = await mountRoute('/skin-care')
    await wrapper.get('[data-testid="service-card-10"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('skin-care-booking'))
    expect(router.currentRoute.value.query.service).toBe('10')
  })

  it('uses an intentional fallback when a service image is missing', async () => {
    apiMocks.listClinicCatalogServices.mockResolvedValue([{ ...service, image_url: 'data:image/gif;base64,transparent-pixel' }])
    const { wrapper } = await mountRoute('/skin-care')

    expect(wrapper.get('[data-testid="clinic-image-placeholder"]').text()).toContain('Mizuki Clinic')
    expect(wrapper.find('[data-testid="service-card-10"] img').exists()).toBe(false)
  })

  it('reveals a large authoritative catalog progressively', async () => {
    apiMocks.listClinicCatalogServices.mockResolvedValue(Array.from({ length: 13 }, (_, index) => ({ ...service, id: index + 1, name: `Dịch vụ ${index + 1}` })))
    const { wrapper } = await mountRoute('/skin-care')

    expect(wrapper.findAll('button[data-testid^="service-card-"]')).toHaveLength(12)
    const loadMore = wrapper.findAll('button').find((button) => button.text() === 'Xem thêm dịch vụ')
    await loadMore?.trigger('click')
    expect(wrapper.findAll('button[data-testid^="service-card-"]')).toHaveLength(13)
  })

  it('refetches the selected service for its clinic and renders authoritative full slots', async () => {
    const { wrapper } = await mountRoute('/skin-care/booking?service=10')
    await wrapper.get('[data-testid="booking-branch-2"]').trigger('click')
    await flushPromises()

    expect(apiMocks.listClinicServices).toHaveBeenCalledWith(2)
    expect(apiMocks.listClinicSlots).toHaveBeenCalledWith(2, 10, expect.any(String))
    const slotButtons = wrapper.findAll('button[data-testid^="slot-"]')
    expect(slotButtons).toHaveLength(2)
    expect(slotButtons[0]?.text()).toContain('2 chỗ')
    expect(slotButtons[1]?.text()).toContain('Hết chỗ')
    expect(slotButtons[1]?.attributes('disabled')).toBeDefined()
  })

  it('submits the exact authenticated appointment payload without payment fields', async () => {
    useAuthStore(pinia).$patch({ user: {
      id: 12, name: 'Nguyễn Minh An', email: 'an@example.com', phone: '0912345678', avatar: null,
      role: 'customer', role_label: 'Khách hàng', branch_id: null, email_verified_at: null,
      created_at: '2026-08-01T00:00:00Z',
    } })
    apiMocks.createCustomerAppointment.mockResolvedValue(createdAppointment)
    const { wrapper } = await mountRoute('/skin-care/booking?service=10')
    await wrapper.get('[data-testid="booking-branch-2"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="clinic-date-input"]').setValue('2026-08-29')
    await flushPromises()
    await wrapper.findAll('button[data-testid^="slot-"]')[0]?.trigger('click')
    await wrapper.get('textarea').setValue('Da nhạy cảm')
    await wrapper.get('[data-testid="booking-confirmation"] button').trigger('click')
    await flushPromises()

    expect(apiMocks.createCustomerAppointment).toHaveBeenCalledWith({
      branch_id: 2,
      service_id: 10,
      appointment_date: '2026-08-29',
      start_time: '09:00',
      customer_note: 'Da nhạy cảm',
    })
    expect(apiMocks.createCustomerAppointment.mock.calls[0]?.[0]).not.toHaveProperty('payment_method')
    expect(wrapper.get('[data-testid="booking-success"]').text()).toContain(createdAppointment.appointment_number)
  })

  it('renders catalog empty state without inventing services', async () => {
    apiMocks.listClinicCatalogServices.mockResolvedValue([])
    const { wrapper } = await mountRoute('/skin-care')
    expect(wrapper.text()).toContain('Chưa có dịch vụ chăm sóc da')
    expect(wrapper.find('[data-testid="clinic-service-catalog"]').exists()).toBe(false)
  })

  it('renders a retryable catalog error', async () => {
    apiMocks.listClinicCatalogServices.mockRejectedValue(new Error('Không thể kết nối đến máy chủ.'))
    const { wrapper } = await mountRoute('/skin-care')
    expect(wrapper.get('[role="alert"]').text()).toContain('Chưa thể tải dịch vụ chăm sóc da')
  })
})
