import type { AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/clients'
import { createAdminCategory, getAdminCategories, updateAdminCategory } from '@/api/adminApi'
import type { AdminCategoryChildCreateRequest, AdminCategoryCreateRequest, AdminCategoryListParams, AdminCategoryMutation } from '@/types/adminCategory'

vi.mock('@/api/csrf', () => ({ ensureCsrfCookie: vi.fn().mockResolvedValue(undefined) }))

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

const legacyCreate: AdminCategoryCreateRequest = {
  name: 'Hoa mới', slug: 'hoa-moi', parent_id: null, description: null,
  sort_order: 0, is_active: true,
}

async function submittedCreate(payload: AdminCategoryCreateRequest): Promise<Record<string, unknown>> {
  const request = vi.spyOn(apiClient, 'request').mockResolvedValue({ data: { data: { id: 50 } } } as AxiosResponse)
  await createAdminCategory(payload)
  expect(request).toHaveBeenCalledWith(expect.objectContaining({ method: 'post' }))
  return request.mock.lastCall![0].data as Record<string, unknown>
}

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

describe('Admin Categories mutation HTTP transport', () => {
  it('keeps legacy single-category creation compatible', async () => {
    expect(await submittedCreate(legacyCreate)).toEqual(legacyCreate)
  })

  it('sends one atomic create request with only supported direct-child fields', async () => {
    const child = {
      name: 'Lan', slug: 'lan', description: null, sort_order: 2,
      status: 'draft', is_featured: true, image_upload_token: 'child-token',
      parent_id: 99, new_children: [{ name: 'Unsupported grandchild' }],
    } as unknown as AdminCategoryChildCreateRequest
    const data = await submittedCreate({
      ...legacyCreate, status: 'published', is_active: undefined,
      is_featured: false, image_upload_token: 'root-token',
      attach_existing_child_ids: [2, 3], new_children: [child],
    } as AdminCategoryCreateRequest)
    expect(data).toEqual({
      name: 'Hoa mới', slug: 'hoa-moi', parent_id: null, description: null, sort_order: 0,
      status: 'published', is_featured: false, image_upload_token: 'root-token',
      attach_existing_child_ids: [2, 3],
      new_children: [{
        name: 'Lan', slug: 'lan', description: null, sort_order: 2,
        status: 'draft', is_featured: true, image_upload_token: 'child-token',
      }],
    })
    expect(data).not.toHaveProperty('is_active')
  })

  it('never forwards conflicting legacy is_active alongside an explicit status', async () => {
    const data = await submittedCreate({ ...legacyCreate, status: 'hidden', is_active: true } as unknown as AdminCategoryCreateRequest)
    expect(data.status).toBe('hidden')
    expect(data).not.toHaveProperty('is_active')
  })

  it('passes Laravel nested validation errors through without remapping their keys', async () => {
    const error = {
      name: 'ApplicationError', kind: 'validation', message: 'Dữ liệu không hợp lệ',
      validationErrors: {
        'attach_existing_child_ids.0': ['Danh mục con không hợp lệ.'],
        'new_children.0.name': ['Tên là bắt buộc.'],
        'new_children.0.slug': ['Slug đã tồn tại.'],
        'new_children.0.image_upload_token': ['Ảnh không hợp lệ.'],
        parent_id: ['Danh mục cha không hợp lệ.'],
        status: ['Trạng thái không hợp lệ.'],
      },
    }
    vi.spyOn(apiClient, 'request').mockRejectedValue(error)
    await expect(createAdminCategory(legacyCreate)).rejects.toBe(error)
  })

  it('leaves edit mutation payload and PATCH transport unchanged', async () => {
    const request = vi.spyOn(apiClient, 'request').mockResolvedValue({ data: { data: { id: 5 } } } as AxiosResponse)
    const payload: AdminCategoryMutation = { ...legacyCreate, image_url: null }
    await updateAdminCategory(5, payload)
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ method: 'patch', data: payload }))
  })
})
