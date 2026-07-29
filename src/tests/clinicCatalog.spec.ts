import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, type Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import type { ClinicBranch, ClinicService, ClinicSlotsData } from '@/types/clinic'

const apiMocks = vi.hoisted(() => ({
  listClinics: vi.fn(),
  listClinicServices: vi.fn(),
  listClinicSlots: vi.fn(),
}))

vi.mock('@/api/clinic', () => apiMocks)

const branch: ClinicBranch = {
  id: 2,
  code: 'CLINIC-CT',
  name: 'Mizuki Clinic Cần Thơ Dev',
  branch_type: 'hybrid',
  phone: '02920000000',
  address: 'Cần Thơ',
  province_code: 'CT',
  business_hours: [],
}

const service: ClinicService = {
  id: 10,
  category: 'skin_care',
  name: 'Mesoderm Trị Mụn',
  slug: 'hasaki-clinic-16374',
  short_description: 'Chăm sóc da theo nhu cầu',
  description: null,
  image_url: null,
  duration_minutes: 54,
  price: 400000,
  is_available: true,
  capacity: 1,
}

const slots: ClinicSlotsData = {
  branch,
  service,
  date: '2026-08-03',
  timezone: 'Asia/Ho_Chi_Minh',
  slots: [
    {
      start_at: '2026-08-03T09:00:00+07:00',
      end_at: '2026-08-03T09:54:00+07:00',
      available: true,
      remaining_capacity: 1,
    },
    {
      start_at: '2026-08-03T09:30:00+07:00',
      end_at: '2026-08-03T10:24:00+07:00',
      available: false,
      remaining_capacity: 0,
    },
  ],
}

const wrappers: VueWrapper[] = []
const queryClients: QueryClient[] = []

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
}

interface MountedClinicPage {
  readonly wrapper: VueWrapper
  readonly router: Router
}

async function mountClinicPage(): Promise<MountedClinicPage> {
  const router = createAppRouter(createMemoryHistory())
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  })
  queryClients.push(queryClient)

  await router.push('/skin-care')
  await router.isReady()

  const wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
    },
  })
  wrappers.push(wrapper)
  await flushPromises()

  return { wrapper, router }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  apiMocks.listClinics.mockReset().mockResolvedValue([branch])
  apiMocks.listClinicServices.mockReset().mockResolvedValue([service])
  apiMocks.listClinicSlots.mockReset().mockResolvedValue(slots)
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  queryClients.splice(0).forEach((client) => client.clear())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('public skin-care catalog', () => {
  it('renders the route and clinic loading state', async () => {
    apiMocks.listClinics.mockReturnValue(new Promise(() => undefined))
    const { wrapper, router } = await mountClinicPage()

    expect(router.currentRoute.value.name).toBe('skin-care')
    expect(wrapper.get('h1').text()).toBe('Dịch vụ chăm sóc da tại Mizuki')
    expect(wrapper.text()).toContain('Đang tải cơ sở chăm sóc da')
  })

  it('renders branches and fetches services after branch selection', async () => {
    const { wrapper } = await mountClinicPage()

    expect(wrapper.get('[data-testid="clinic-branch-select"]').text()).toContain(branch.name)
    expect(apiMocks.listClinicServices).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="clinic-branch-select"]').setValue('2')
    await flushPromises()

    expect(apiMocks.listClinicServices).toHaveBeenCalledWith(2)
    expect(wrapper.text()).toContain(branch.address)
    expect(wrapper.get('[data-testid="service-card-10"]').text()).toContain(service.name)
    expect(wrapper.get('[data-testid="service-card-10"]').text()).toContain('400.000 ₫')
  })

  it('fetches slots after service and date selection and disables unavailable slots', async () => {
    const { wrapper } = await mountClinicPage()
    await wrapper.get('[data-testid="clinic-branch-select"]').setValue('2')
    await flushPromises()
    await wrapper.get('[data-testid="service-card-10"]').trigger('click')
    await wrapper.get('[data-testid="clinic-date-input"]').setValue('2026-08-03')
    await flushPromises()

    expect(apiMocks.listClinicSlots).toHaveBeenLastCalledWith(2, 10, '2026-08-03')
    const slotButtons = wrapper.findAll('button[data-testid^="slot-"]')
    expect(slotButtons).toHaveLength(2)
    expect(slotButtons[0]?.attributes('disabled')).toBeUndefined()
    expect(slotButtons[1]?.attributes('disabled')).toBeDefined()
  })

  it('shows the empty service state', async () => {
    apiMocks.listClinicServices.mockResolvedValue([])
    const { wrapper } = await mountClinicPage()
    await wrapper.get('[data-testid="clinic-branch-select"]').setValue('2')
    await flushPromises()

    expect(wrapper.text()).toContain('Cơ sở chưa có dịch vụ chăm sóc da')
  })

  it('shows normalized API errors', async () => {
    apiMocks.listClinics.mockRejectedValue(new Error('Không thể kết nối đến máy chủ.'))
    const { wrapper } = await mountClinicPage()

    expect(wrapper.get('[role="alert"]').text()).toContain('Chưa thể tải cơ sở chăm sóc da')
    expect(wrapper.get('[role="alert"]').text()).toContain('Không thể kết nối đến máy chủ.')
  })
})
