import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useLocationDistrictsQuery,
  useLocationProvincesQuery,
  useLocationWardsQuery,
} from '@/queries/locations/locationQueries'

const apiMocks = vi.hoisted(() => ({
  listLocationProvinces: vi.fn(),
  listLocationDistricts: vi.fn(),
  listLocationWards: vi.fn(),
}))

vi.mock('@/api/locations/locationApi', () => apiMocks)

const QueryHarness = defineComponent({
  setup() {
    const enabled = ref(false)
    const provinceId = ref<number | null>(null)
    const districtId = ref<number | null>(null)

    useLocationProvincesQuery(enabled)
    useLocationDistrictsQuery(provinceId, enabled)
    useLocationWardsQuery(districtId, enabled)

    return { enabled, provinceId, districtId }
  },
  template: `
    <button data-testid="enable" @click="enabled = true">enable</button>
    <button data-testid="province" @click="provinceId = 91">province</button>
    <button data-testid="district" @click="districtId = 1442">district</button>
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
  apiMocks.listLocationProvinces.mockReset().mockResolvedValue([])
  apiMocks.listLocationDistricts.mockReset().mockResolvedValue([])
  apiMocks.listLocationWards.mockReset().mockResolvedValue([])
})

describe('location dependent queries', () => {
  it('loads only after enablement and waits for the required parent identifier', async () => {
    const wrapper = mount(QueryHarness, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient: createQueryClient() }]],
      },
    })

    await flushPromises()
    expect(apiMocks.listLocationProvinces).not.toHaveBeenCalled()
    expect(apiMocks.listLocationDistricts).not.toHaveBeenCalled()
    expect(apiMocks.listLocationWards).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="enable"]').trigger('click')
    await flushPromises()
    expect(apiMocks.listLocationProvinces).toHaveBeenCalledTimes(1)
    expect(apiMocks.listLocationDistricts).not.toHaveBeenCalled()
    expect(apiMocks.listLocationWards).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="province"]').trigger('click')
    await flushPromises()
    expect(apiMocks.listLocationDistricts).toHaveBeenCalledWith(91)
    expect(apiMocks.listLocationWards).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="district"]').trigger('click')
    await flushPromises()
    expect(apiMocks.listLocationWards).toHaveBeenCalledWith(1442)
  })
})
