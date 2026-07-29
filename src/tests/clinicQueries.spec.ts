import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useClinicServicesQuery,
  useClinicSlotsQuery,
} from '@/queries/clinic'

const apiMocks = vi.hoisted(() => ({
  listClinics: vi.fn(),
  listClinicServices: vi.fn(),
  listClinicSlots: vi.fn(),
}))

vi.mock('@/api/clinic', () => apiMocks)

const QueryHarness = defineComponent({
  setup() {
    const branchId = ref<number | null>(null)
    const serviceId = ref<number | null>(null)
    const date = ref('')

    useClinicServicesQuery(branchId)
    useClinicSlotsQuery(branchId, serviceId, date)

    return { branchId, serviceId, date }
  },
  template: `
    <button data-testid="branch" @click="branchId = 2">branch</button>
    <button data-testid="service" @click="serviceId = 10">service</button>
    <button data-testid="date" @click="date = '2026-08-03'">date</button>
  `,
})

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  })
}

beforeEach(() => {
  apiMocks.listClinicServices.mockReset().mockResolvedValue([])
  apiMocks.listClinicSlots.mockReset().mockResolvedValue({ slots: [] })
})

describe('clinic query enabling', () => {
  it('waits for branch before services and branch, service, and date before slots', async () => {
    const wrapper = mount(QueryHarness, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient: createQueryClient() }]],
      },
    })

    await flushPromises()
    expect(apiMocks.listClinicServices).not.toHaveBeenCalled()
    expect(apiMocks.listClinicSlots).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="branch"]').trigger('click')
    await flushPromises()
    expect(apiMocks.listClinicServices).toHaveBeenCalledWith(2)
    expect(apiMocks.listClinicSlots).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="service"]').trigger('click')
    await flushPromises()
    expect(apiMocks.listClinicSlots).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="date"]').trigger('click')
    await flushPromises()
    expect(apiMocks.listClinicSlots).toHaveBeenCalledWith(2, 10, '2026-08-03')
  })
})
