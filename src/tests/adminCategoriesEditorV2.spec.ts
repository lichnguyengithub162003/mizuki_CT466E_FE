import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminCategoryDetailPage from '@/pages/admin/AdminCategoryDetailPage.vue'
import AdminCategoryEditorPage from '@/pages/admin/AdminCategoryEditorPage.vue'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import type { AdminCategoryPage, AdminCategoryRecord } from '@/types/adminCategory'

const mocks = vi.hoisted(() => ({
  getAdminCategories: vi.fn(), getAdminCategory: vi.fn(), createAdminCategory: vi.fn(),
  updateAdminCategory: vi.fn(), uploadAdminImage: vi.fn(),
}))
const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
vi.mock('@/api/adminApi', async original => ({ ...(await original()), ...mocks }))

function category(id: number, overrides: Partial<AdminCategoryRecord> = {}): AdminCategoryRecord {
  return {
    id, parent_id: null, name: `Danh mục ${id}`, slug: `danh-muc-${id}`, description: null,
    image_url: null, image_rendition_url: null, sort_order: 0, status: 'published', is_active: true, is_featured: false,
    parent: null, children_count: 0, has_children: false, product_count: 0,
    ancestors: [], depth: 0, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-02T00:00:00Z',
    ...overrides,
  }
}
function page(items: AdminCategoryRecord[], current = 1, last = 1, total = items.length): AdminCategoryPage {
  return { items, pagination: { current_page: current, last_page: last, total, per_page: 30 } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function mountAt(path: string, component: typeof AdminCategoryEditorPage | typeof AdminCategoryDetailPage) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/admin/categories', component: { template: '<div />' } },
    { path: '/admin/categories/create', name: 'admin-category-create', component: AdminCategoryEditorPage },
    { path: '/admin/categories/:id/edit', name: 'admin-category-edit', component: AdminCategoryEditorPage },
    { path: '/admin/categories/:id', name: 'admin-category-detail', component: AdminCategoryDetailPage },
  ] })
  await router.push(path)
  const wrapper = mount(component, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}
const validation = (field: string, message: string) => ({
  name: 'ApplicationError', kind: 'validation', message: 'Dữ liệu không hợp lệ',
  validationErrors: { [field]: [message] }, cause: null,
})

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore(pinia).$patch({ user: { id: 2, name: 'QA', email: 'qa@example.test', phone: null, avatar: null, role: 'super_admin', role_label: 'super_admin', branch_id: null, email_verified_at: null, created_at: '' }, isInitialized: true })
  mocks.getAdminCategory.mockResolvedValue(category(5))
  mocks.getAdminCategories.mockResolvedValue(page([category(1)]))
  mocks.createAdminCategory.mockResolvedValue(category(50))
  mocks.updateAdminCategory.mockResolvedValue(category(5))
  mocks.uploadAdminImage.mockResolvedValue({ upload_token: 'token-123', preview_url: '/staged.webp', mime_type: 'image/webp', size: 3 })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:category-preview') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})
afterAll(() => {
  if (originalCreateObjectURL) Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL)
  else Reflect.deleteProperty(URL, 'createObjectURL')
  if (originalRevokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL)
  else Reflect.deleteProperty(URL, 'revokeObjectURL')
})

describe('Admin Categories V2 detail and mutations', () => {
  it('renders authoritative detail values, image fallback and edit link', async () => {
    mocks.getAdminCategory.mockResolvedValue(category(5, {
      name: 'Hoa lan', slug: 'hoa-lan', description: 'Mô tả thật',
      parent_id: 2, parent: { id: 2, name: 'Hoa', slug: 'hoa' },
      ancestors: [{ id: 2, name: 'Hoa', slug: 'hoa' }],
      children_count: 7, product_count: 12, sort_order: 4,
      image_rendition_url: '/lan.webp',
    }))
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.text()).toContain('Hoa / Hoa lan')
    expect(wrapper.text()).toContain('Mô tả thật')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.get('[data-testid="category-detail-image"] img').attributes('src')).toBe('/lan.webp')
    await wrapper.get('[data-testid="category-detail-image"] img').trigger('error')
    expect(wrapper.find('[data-testid="category-detail-image"] img').exists()).toBe(false)
    expect(wrapper.get('a[href="/admin/categories/5/edit"]').text()).toContain('Chỉnh sửa')
  })

  it('creates a category without fabricating an image or slug', async () => {
    const { wrapper, router } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    expect(wrapper.text()).toContain('Danh sách danh mục')
    expect(wrapper.text()).not.toContain('Thêm danh mục mới')
    expect(wrapper.text()).not.toContain('Tạo danh mục cùng các mục con trực tiếp')
    expect(wrapper.get('input[name="sort_order"]').element).toHaveProperty('value', '0')
    expect(wrapper.text()).toContain('Thứ tự sắp xếp')
    expect(wrapper.text()).toContain('Số nhỏ ưu tiên trước trong cùng cấp')
    await wrapper.get('input[name="name"]').setValue('Hoa mới')
    await wrapper.get('input[name="slug"]').setValue('hoa-moi')
    expect(wrapper.get('[data-testid="category-save"]').attributes('type')).toBe('submit')
    expect(wrapper.get('[data-testid="category-save"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.createAdminCategory).toHaveBeenCalledWith({
      name: 'Hoa mới', slug: 'hoa-moi', parent_id: null, description: null,
      sort_order: 0, status: 'published', is_featured: false,
    })
    expect(router.currentRoute.value.path).toBe('/admin/categories/50')
  })

  it('preserves the numeric sibling sort order in the atomic create payload', async () => {
    const { wrapper } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa')
    await wrapper.get('input[name="sort_order"]').setValue('4')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.createAdminCategory).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 4, status: 'published', is_featured: false }))
  })

  it('suggests a slug without overwriting a manually edited value and sends selected lifecycle fields', async () => {
    const { wrapper } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa Hồng')
    expect((wrapper.get('input[name="slug"]').element as HTMLInputElement).value).toBe('hoa-hong')
    await wrapper.get('input[name="slug"]').setValue('slug-rieng')
    await wrapper.get('input[name="name"]').setValue('Hoa Lan')
    expect((wrapper.get('input[name="slug"]').element as HTMLInputElement).value).toBe('slug-rieng')
    await wrapper.get('select[name="status"]').setValue('draft')
    await wrapper.get('input[name="is_featured"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.createAdminCategory).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft', is_featured: true, slug: 'slug-rieng' }))
  })

  it('creates a category with selected existing children and two new direct children in one mutation', async () => {
    mocks.getAdminCategories.mockResolvedValue(page([category(11), category(12)]))
    const { wrapper } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa')
    await wrapper.get('[data-testid="category-existing-trigger"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="category-existing-search"]').classes()).toContain('category-search-input')
    expect(wrapper.get('[data-testid="category-existing-search"]').attributes('placeholder')).toBe('Tìm theo tên hoặc slug')
    await wrapper.get('[data-testid="category-existing-11"]').trigger('click')
    await wrapper.get('[data-testid="category-child-add"]').trigger('click')
    await wrapper.get('[data-testid="category-child-add"]').trigger('click')
    await wrapper.get('input[name="new_children.0.name"]').setValue('Lan')
    await wrapper.get('input[name="new_children.1.name"]').setValue('Hồng')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.createAdminCategory).toHaveBeenCalledTimes(1)
    expect(mocks.createAdminCategory).toHaveBeenCalledWith(expect.objectContaining({
      attach_existing_child_ids: [11],
      new_children: [
        { name: 'Lan', slug: 'lan', status: 'published', is_featured: false, sort_order: 0 },
        { name: 'Hồng', slug: 'hong', status: 'published', is_featured: false, sort_order: 0 },
      ],
    }))
  })

  it('keeps child drafts when moving to level three and blocks an invalid submission', async () => {
    mocks.getAdminCategories.mockResolvedValue(page([category(8, { parent_id: 2, depth: 1, ancestors: [{ id: 2, name: 'Hoa', slug: 'hoa' }] })]))
    const { wrapper } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa mới')
    await wrapper.get('[data-testid="category-child-add"]').trigger('click')
    await wrapper.get('input[name="new_children.0.name"]').setValue('Lan')
    await wrapper.get('[data-testid="category-parent-trigger"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="category-parent-8"]').trigger('click')
    expect(wrapper.get('[data-testid="category-child-add"]').attributes('disabled')).toBeDefined()
    expect((wrapper.get('input[name="new_children.0.name"]').element as HTMLInputElement).value).toBe('Lan')
    await wrapper.get('form').trigger('submit')
    expect(mocks.createAdminCategory).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Danh mục cấp 3 không thể có danh mục con')
  })

  it('maps nested child validation errors without losing the draft', async () => {
    mocks.createAdminCategory.mockRejectedValue(validation('new_children.0.slug', 'Slug con đã tồn tại.'))
    const { wrapper } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa')
    await wrapper.get('[data-testid="category-child-add"]').trigger('click')
    await wrapper.get('input[name="new_children.0.name"]').setValue('Lan')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Slug con đã tồn tại.')
    expect((wrapper.get('input[name="new_children.0.name"]').element as HTMLInputElement).value).toBe('Lan')
  })

  it('hides the detail edit action for Branch Managers', async () => {
    useAuthStore(pinia).$patch({ user: { id: 3, name: 'Manager', email: 'manager@example.test', phone: null, avatar: null, role: 'branch_manager', role_label: 'branch_manager', branch_id: 1, email_verified_at: null, created_at: '' } })
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.find('a[href="/admin/categories/5/edit"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Danh mục 5')
  })

  it('keeps the editor open and shows backend create validation errors', async () => {
    mocks.createAdminCategory.mockRejectedValue(validation('slug', 'Slug đã tồn tại.'))
    const { wrapper, router } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa')
    await wrapper.get('input[name="slug"]').setValue('hoa')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Slug đã tồn tại.')
    expect(router.currentRoute.value.path).toBe('/admin/categories/create')
  })

  it('masks a server SQL error and retains the create draft', async () => {
    const raw = "SQLSTATE[42S22]: Unknown column 'status' in 'field list' (Connection: mysql, Database: mizuki_db)"
    mocks.createAdminCategory.mockRejectedValue({ name: 'ApplicationError', kind: 'server', status: 500, message: raw, cause: null })
    const { wrapper, router } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa mới')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Không thể lưu danh mục do lỗi hệ thống. Vui lòng thử lại sau.')
    expect(wrapper.text()).not.toContain('SQLSTATE')
    expect(wrapper.text()).not.toContain('mizuki_db')
    expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Hoa mới')
    expect(router.currentRoute.value.path).toBe('/admin/categories/create')
  })

  it('masks an HTTP 5xx error on legacy Edit without changing its form', async () => {
    mocks.updateAdminCategory.mockRejectedValue({ name: 'ApplicationError', kind: 'http', status: 500, message: 'SQLSTATE private details', cause: null })
    const { wrapper } = await mountAt('/admin/categories/5/edit', AdminCategoryEditorPage)
    expect(wrapper.text()).toContain('Chỉnh sửa danh mục')
    await wrapper.get('input[name="name"]').setValue('Tên đã sửa')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Không thể lưu danh mục do lỗi hệ thống. Vui lòng thử lại sau.')
    expect(wrapper.text()).not.toContain('SQLSTATE')
    expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Tên đã sửa')
  })

  it('preserves the existing image on edit when unchanged', async () => {
    mocks.getAdminCategory.mockResolvedValue(category(5, { image_url: '/original.webp' }))
    const { wrapper, router } = await mountAt('/admin/categories/5/edit', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Tên đã sửa')
    expect(wrapper.get('[data-testid="category-save"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.updateAdminCategory).toHaveBeenCalledWith('5', expect.objectContaining({ name: 'Tên đã sửa' }))
    const payload = mocks.updateAdminCategory.mock.calls[0]?.[1]
    expect(payload).not.toHaveProperty('image_url')
    expect(payload).not.toHaveProperty('image_upload_token')
    expect(router.currentRoute.value.path).toBe('/admin/categories/5')
  })

  it('preserves a draft status and featured flag when editing unrelated fields', async () => {
    mocks.getAdminCategory.mockResolvedValue(category(5, { status: 'draft', is_active: false, is_featured: true }))
    const { wrapper } = await mountAt('/admin/categories/5/edit', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Bản nháp đã sửa')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const payload = mocks.updateAdminCategory.mock.calls[0]?.[1]
    expect(payload).toMatchObject({ name: 'Bản nháp đã sửa', status: 'draft' })
    expect(payload).not.toHaveProperty('is_active')
    expect(payload).not.toHaveProperty('is_featured')
  })

  it('surfaces backend cycle rejection and excludes self from parent options', async () => {
    mocks.getAdminCategories.mockResolvedValue(page([category(5), category(8, { parent_id: 5 })]))
    mocks.updateAdminCategory.mockRejectedValue(validation('parent_id', 'Danh mục cha tạo thành quan hệ vòng'))
    const { wrapper } = await mountAt('/admin/categories/5/edit', AdminCategoryEditorPage)
    await wrapper.get('[data-testid="category-parent-trigger"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="category-parent-search"]').classes()).toContain('category-search-input')
    expect(wrapper.get('[data-testid="category-parent-search"]').attributes('placeholder')).toBe('Tìm theo tên hoặc slug')
    expect(wrapper.find('[data-testid="category-parent-5"]').exists()).toBe(false)
    await wrapper.get('[data-testid="category-parent-8"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('quan hệ vòng')
  })

  it('paginates the parent selector beyond 100 records and searches server-side', async () => {
    mocks.getAdminCategories.mockImplementation(async (params: { page: number; search?: string }) => {
      if (params.search) return page([category(121, { name: 'Danh mục sâu' })])
      const start = (params.page - 1) * 30 + 1
      return page(Array.from({ length: Math.min(30, 121 - start + 1) }, (_, index) => category(start + index)), params.page, 5, 121)
    })
    const { wrapper } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('[data-testid="category-parent-trigger"]').trigger('click')
    await flushPromises()
    for (let next = 2; next <= 5; next += 1) {
      await wrapper.get('[data-testid="category-parent-more"]').trigger('click')
      await flushPromises()
      expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'flat', page: next, per_page: 30, sort: 'name', direction: 'asc' })
    }
    expect(wrapper.get('[data-testid="category-parent-121"]').text()).toContain('Danh mục 121')
    await wrapper.get('[data-testid="category-parent-search"]').setValue('sâu')
    await new Promise(resolve => setTimeout(resolve, 350))
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'flat', page: 1, per_page: 30, sort: 'name', direction: 'asc', search: 'sâu' })
    expect(wrapper.get('[data-testid="category-parent-121"]').text()).toContain('Danh mục sâu')
  })

  it('promotes a successfully staged image token in the create mutation', async () => {
    const { wrapper } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['image'], 'category.webp', { type: 'image/webp' })] })
    await input.trigger('change')
    await flushPromises()
    expect(mocks.uploadAdminImage).toHaveBeenCalledTimes(1)
    expect(wrapper.get('fieldset img').attributes('src')).toBe('/staged.webp')
    await wrapper.get('input[name="name"]').setValue('Hoa')
    await wrapper.get('input[name="slug"]').setValue('hoa')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.createAdminCategory).toHaveBeenCalledWith(expect.objectContaining({ image_upload_token: 'token-123' }))
  })

  it('does not submit while image staging is pending or has failed', async () => {
    const pending = deferred<never>()
    mocks.uploadAdminImage.mockReturnValue(pending.promise)
    const { wrapper } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa')
    await wrapper.get('input[name="slug"]').setValue('hoa')
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['image'], 'category.png', { type: 'image/png' })] })
    await input.trigger('change')
    expect(wrapper.get('[data-testid="category-save"]').attributes('disabled')).toBeDefined()
    expect(mocks.createAdminCategory).not.toHaveBeenCalled()
  })

  it('shows a failed stage and does not claim the category image was saved', async () => {
    mocks.uploadAdminImage.mockRejectedValue(new Error('upload unavailable'))
    const { wrapper, router } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa')
    await wrapper.get('input[name="slug"]').setValue('hoa')
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['image'], 'category.png', { type: 'image/png' })] })
    await input.trigger('change')
    await flushPromises()
    expect(wrapper.text()).toContain('Không thể tải ảnh lên.')
    expect(wrapper.get('[data-testid="category-save"]').attributes('disabled')).toBeDefined()
    expect(mocks.createAdminCategory).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/admin/categories/create')
  })

  it('keeps a staged preview and the editor open when mutation fails', async () => {
    mocks.createAdminCategory.mockRejectedValue(new Error('save unavailable'))
    const { wrapper, router } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa')
    await wrapper.get('input[name="slug"]').setValue('hoa')
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['image'], 'category.webp', { type: 'image/webp' })] })
    await input.trigger('change')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Không thể lưu danh mục')
    expect(wrapper.get('fieldset img').attributes('src')).toBe('/staged.webp')
    expect(router.currentRoute.value.path).toBe('/admin/categories/create')
  })

  it('sends image_url null only when the existing image is explicitly removed', async () => {
    mocks.getAdminCategory.mockResolvedValue(category(5, { image_url: '/original.webp' }))
    const { wrapper } = await mountAt('/admin/categories/5/edit', AdminCategoryEditorPage)
    const remove = wrapper.findAll('button').find(button => button.text().includes('Bỏ ảnh'))
    expect(remove).toBeDefined()
    await remove!.trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.updateAdminCategory).toHaveBeenCalledWith('5', expect.objectContaining({ image_url: null }))
  })

  it('prevents a second mutation while the first save is in flight', async () => {
    const pending = deferred<AdminCategoryRecord>()
    mocks.createAdminCategory.mockReturnValue(pending.promise)
    const { wrapper } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa')
    await wrapper.get('input[name="slug"]').setValue('hoa')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect(mocks.createAdminCategory).toHaveBeenCalledTimes(1)
    const button = wrapper.get('[data-testid="category-save"]')
    expect(button.text()).toBe('Đang tạo danh mục...')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.get('svg').classes()).toContain('animate-spin')
    pending.resolve(category(50))
    await flushPromises()
  })

  it('restores the create button and keeps the draft after a failed pending request', async () => {
    const pending = deferred<AdminCategoryRecord>()
    mocks.createAdminCategory.mockReturnValue(pending.promise)
    const { wrapper } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
    await wrapper.get('input[name="name"]').setValue('Hoa')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[data-testid="category-save"]').text()).toBe('Đang tạo danh mục...')
    pending.reject(validation('slug', 'Slug đã tồn tại.'))
    await flushPromises()
    const button = wrapper.get('[data-testid="category-save"]')
    expect(button.text()).toBe('Tạo danh mục')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-busy')).toBe('false')
    expect(wrapper.text()).toContain('Slug đã tồn tại.')
    expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Hoa')
  })
})
