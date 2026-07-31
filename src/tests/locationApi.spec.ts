import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  listLocationDistricts,
  listLocationProvinces,
  listLocationWards,
} from '@/api/locations/locationApi'
import type {
  LocationDistrict,
  LocationProvince,
  LocationWard,
} from '@/api/locations/locationTypes'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/api/clients', () => ({
  apiClient: { get: clientMocks.get },
}))

const province: LocationProvince = {
  ghn_province_id: 91,
  name: 'Cần Thơ',
}

const district: LocationDistrict = {
  ghn_district_id: 1442,
  name: 'Ninh Kiều',
}

const ward: LocationWard = {
  ghn_ward_code: '21012',
  name: 'Xuân Khánh',
}

afterEach(() => {
  clientMocks.get.mockReset()
})

describe('location API', () => {
  it('unwraps the confirmed Mizuki envelopes and preserves GHN identifiers', async () => {
    clientMocks.get
      .mockResolvedValueOnce({
        data: { success: true, data: [province], message: '', meta: [] },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: [district], message: '', meta: [] },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: [ward], message: '', meta: [] },
      })

    await expect(listLocationProvinces()).resolves.toEqual([province])
    await expect(listLocationDistricts(91)).resolves.toEqual([district])
    await expect(listLocationWards(1442)).resolves.toEqual([ward])

    expect(clientMocks.get).toHaveBeenNthCalledWith(1, '/locations/provinces')
    expect(clientMocks.get).toHaveBeenNthCalledWith(
      2,
      '/locations/provinces/91/districts',
    )
    expect(clientMocks.get).toHaveBeenNthCalledWith(
      3,
      '/locations/districts/1442/wards',
    )
  })
})
