import type { AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/clients'
import { getAdminCategories } from '@/api/adminApi'
import type { AdminCategoryListParams } from '@/types/adminCategory'

const pagination = { current_page: 1, last_page: 1, per_page: 30, total: 0 }

async function serializedQuery(params: AdminCategoryListParams): Promise<URLSearchParams> {
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
    data: { data: [], meta: { pagination } },
  } as AxiosResponse)
  await getAdminCategories(params)
  const [url, config] = get.mock.lastCall!
  return new URL(apiClient.getUri({ url, ...config }), 'http://localhost').searchParams
}

afterEach(() => vi.restoreAllMocks())

describe('Admin Categories listing HTTP transport', () => {
  const base = { mode: 'flat', page: 1, per_page: 30, sort: 'sort_order', direction: 'asc' } as const

  it.each([
    [true, '1'],
    [false, '0'],
  ] as const)('serializes is_active=%s as Laravel boolean %s', async (value, expected) => {
    const query = await serializedQuery({ ...base, is_active: value })
    expect(query.get('is_active')).toBe(expected)
    expect(query.has('has_children')).toBe(false)
  })

  it.each([
    [true, '1'],
    [false, '0'],
  ] as const)('serializes has_children=%s as Laravel boolean %s', async (value, expected) => {
    const query = await serializedQuery({ ...base, has_children: value })
    expect(query.get('has_children')).toBe(expected)
    expect(query.has('is_active')).toBe(false)
  })

  it('keeps both false filters in a combined sorted and paginated request', async () => {
    const query = await serializedQuery({ ...base, is_active: false, has_children: false, sort: 'name', direction: 'desc', page: 2 })
    expect(Object.fromEntries(query)).toEqual({
      mode: 'flat', page: '2', per_page: '30', sort: 'name', direction: 'desc',
      is_active: '0', has_children: '0',
    })
  })

  it('omits both filters when cleared and preserves root listing parameters', async () => {
    const query = await serializedQuery({ mode: 'root', page: 1, per_page: 30, sort: 'sort_order', direction: 'asc' })
    expect(query.has('is_active')).toBe(false)
    expect(query.has('has_children')).toBe(false)
    expect(Object.fromEntries(query)).toEqual({ mode: 'root', page: '1', per_page: '30', sort: 'sort_order', direction: 'asc' })
  })
})
