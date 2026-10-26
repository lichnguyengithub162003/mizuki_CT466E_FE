import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminCategoriesListPage from '@/pages/admin/AdminCategoriesListPage.vue'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import type { AdminCategoryPage, AdminCategoryRecord } from '@/types/adminCategory'

const mocks = vi.hoisted(() => ({ getAdminCategories: vi.fn(), getCurrentUser: vi.fn() }))
const defaultOrder = { sort: 'sort_order', direction: 'asc' }
vi.mock('@/api/adminApi', async (original) => ({ ...(await original()), getAdminCategories: mocks.getAdminCategories }))
vi.mock('@/api/auth/authApi', () => ({ getCurrentUser: mocks.getCurrentUser }))

function category(id: number, parentId: number | null = null, overrides: Partial<AdminCategoryRecord> = {}): AdminCategoryRecord {
  return {
    id, parent_id: parentId, name: `Danh mục ${id}`, slug: `danh-muc-${id}`, description: null,
    image_url: null, image_rendition_url: null, sort_order: id, status: 'published', is_active: true, is_featured: false,
    parent: parentId === null ? null : { id: parentId, name: `Danh mục ${parentId}`, slug: `danh-muc-${parentId}` },
    children_count: 0, has_children: false, product_count: id,
    ancestors: parentId === null ? [] : [{ id: parentId, name: `Danh mục ${parentId}`, slug: `danh-muc-${parentId}` }],
    depth: parentId === null ? 0 : 1, created_at: null, updated_at: null, ...overrides,
  }
}
function page(items: AdminCategoryRecord[], current = 1, last = 1, total = items.length): AdminCategoryPage {
  return { items, pagination: { current_page: current, last_page: last, per_page: 30, total } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

async function mountPage() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/admin/categories', component: AdminCategoriesListPage },
    { path: '/admin/categories/create', component: { template: '<div />' } },
    { path: '/admin/categories/:id', component: { template: '<div />' } },
  ] })
  await router.push('/admin/categories')
  const wrapper = mount(AdminCategoriesListPage, { global: { plugins: [router] } })
  await flushPromises()
  return Object.assign(wrapper, { router })
}
afterAll(() => { vi.unstubAllGlobals() })
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  vi.clearAllMocks()
  localStorage.removeItem('admin.categories.visibleColumns')
  mocks.getAdminCategories.mockResolvedValue(page([category(1)]))
  useAuthStore(pinia).resetForTesting()
})

describe('Admin Categories V2 foundation', () => {
  it('allows staff to read the category list but rejects customers and guests', async () => {
    const auth = useAuthStore(pinia)
    const guest = createAppRouter(createMemoryHistory())
    mocks.getCurrentUser.mockRejectedValue({ name: 'ApplicationError', kind: 'unauthorized' })
    await guest.push('/admin/categories')
    expect(guest.currentRoute.value.path).toBe('/admin/login')
    expect(guest.currentRoute.value.query.redirect).toBe('/admin/categories')

    for (const role of ['customer', 'cashier', 'sales_staff', 'technician', 'branch_manager', 'super_admin'] as const) {
      auth.$patch({ user: { id: 2, name: 'QA', email: 'qa@example.test', phone: null, avatar: null, role, role_label: role, branch_id: null, email_verified_at: null, created_at: '' }, isInitialized: true })
      const router = createAppRouter(createMemoryHistory())
      await router.push('/admin/categories')
      expect(router.currentRoute.value.path).toBe(role === 'customer' ? '/forbidden' : '/admin/categories')
      if (role !== 'customer') expect(router.currentRoute.value.name).toBe('admin-categories')
    }
  })

  it('loads only roots initially and renders aligned desktop and mobile hierarchy views', async () => {
    const wrapper = await mountPage()
    expect(mocks.getAdminCategories).toHaveBeenCalledTimes(1)
    expect(mocks.getAdminCategories).toHaveBeenCalledWith({ mode: 'root', page: 1, per_page: 30, ...defaultOrder })
    expect(wrapper.get('[data-testid="category-row-1"]').text()).toContain('Danh mục gốc')
    expect(wrapper.get('[data-testid="category-mobile-1"]').text()).toContain('Danh mục 1')
    expect(wrapper.get('[data-testid="categories-table-shell"]').classes()).toContain('md:flex')
    expect(wrapper.get('[data-testid="categories-scroll-region"]').classes()).toContain('overflow-auto')
  })

  it('loads children recursively beyond two levels and keeps ancestor context', async () => {
    mocks.getAdminCategories.mockImplementation(async (params: { mode: string; parent_id?: number }) => {
      if (params.mode === 'root') return page([category(1, null, { has_children: true, children_count: 1 })])
      if (params.parent_id === 1) return page([category(2, 1, { has_children: true, children_count: 1 })])
      return page([category(3, 2, { depth: 2, ancestors: [
        { id: 1, name: 'Danh mục 1', slug: 'danh-muc-1' }, { id: 2, name: 'Danh mục 2', slug: 'danh-muc-2' },
      ] })])
    })
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="category-expand-1"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenCalledWith({ mode: 'children', parent_id: 1, page: 1, per_page: 30, ...defaultOrder })
    await wrapper.get('[data-testid="category-expand-2"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenCalledWith({ mode: 'children', parent_id: 2, page: 1, per_page: 30, ...defaultOrder })
    expect(wrapper.get('[data-testid="category-row-3"]').text()).toContain('Danh mục 3')
    expect(wrapper.get('[data-testid="category-row-3"] [title]').attributes('title')).toBe('Danh mục 1 / Danh mục 2 / Danh mục 3')
  })

  it('keeps pagination independent for roots and each sibling set and deduplicates repeated rows', async () => {
    mocks.getAdminCategories.mockImplementation(async (params: { mode: string; parent_id?: number; page: number }) => {
      if (params.mode === 'root') return params.page === 1
        ? page([category(1, null, { has_children: true }), category(4, null, { has_children: true })], 1, 2, 3)
        : page([category(4, null, { has_children: true }), category(5)], 2, 2, 3)
      if (params.parent_id === 1) return params.page === 1
        ? page([category(2, 1)], 1, 2, 2)
        : page([category(2, 1), category(3, 1)], 2, 2, 2)
      return page([category(6, 4)], 1, 2, 2)
    })
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="category-expand-1"]').trigger('click')
    await wrapper.get('[data-testid="category-expand-4"]').trigger('click')
    await flushPromises()
    const childMore = wrapper.get('[data-testid="category-feedback-1"] button')
    await childMore.trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenCalledWith({ mode: 'children', parent_id: 1, page: 2, per_page: 30, ...defaultOrder })
    expect(mocks.getAdminCategories).not.toHaveBeenCalledWith({ mode: 'children', parent_id: 4, page: 2, per_page: 30, ...defaultOrder })
    await wrapper.get('[data-testid="category-feedback-root"] button').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenCalledWith({ mode: 'root', page: 2, per_page: 30, ...defaultOrder })
    expect(wrapper.findAll('[data-testid="category-row-2"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid="category-row-4"]')).toHaveLength(1)
  })

  it('collapses without losing cached children or issuing duplicate requests on reopening', async () => {
    const child = deferred<AdminCategoryPage>()
    mocks.getAdminCategories.mockImplementation((params: { mode: string }) => params.mode === 'root'
      ? Promise.resolve(page([category(1, null, { has_children: true })])) : child.promise)
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="category-expand-1"]').trigger('click')
    expect(wrapper.get('[data-testid="category-feedback-1"]').text()).toContain('Đang tải')
    await wrapper.get('[data-testid="category-expand-1"]').trigger('click')
    child.resolve(page([category(2, 1)]))
    await flushPromises()
    expect(wrapper.find('[data-testid="category-row-2"]').exists()).toBe(false)
    await wrapper.get('[data-testid="category-expand-1"]').trigger('click')
    expect(wrapper.find('[data-testid="category-row-2"]').exists()).toBe(true)
    expect(mocks.getAdminCategories).toHaveBeenCalledTimes(2)
  })

  it('ignores responses after navigation unmount and does not leak cached data into a new page', async () => {
    const pending = deferred<AdminCategoryPage>()
    mocks.getAdminCategories.mockReturnValueOnce(pending.promise)
    const first = await mountPage()
    first.unmount()
    pending.resolve(page([category(99)]))
    await flushPromises()
    const second = await mountPage()
    expect(second.find('[data-testid="category-row-99"]').exists()).toBe(false)
    expect(second.find('[data-testid="category-row-1"]').exists()).toBe(true)
  })

  it('shows truthful placeholders for absent or failed category images', async () => {
    mocks.getAdminCategories.mockResolvedValue(page([
      category(1), category(2, null, { image_rendition_url: '/category-2.webp' }),
    ]))
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="category-row-1"] [data-testid="category-image-fallback"]').exists()).toBe(true)
    const image = wrapper.get('[data-testid="category-row-2"] img')
    expect(image.attributes('src')).toBe('/category-2.webp')
    expect(image.attributes('loading')).toBe('lazy')
    await image.trigger('error')
    expect(wrapper.find('[data-testid="category-row-2"] img').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-row-2"] [data-testid="category-image-fallback"]').exists()).toBe(true)
  })

  it('handles root loading, failure with retry, and empty results', async () => {
    const pending = deferred<AdminCategoryPage>()
    mocks.getAdminCategories.mockReturnValueOnce(pending.promise)
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="categories-loading"]').exists()).toBe(true)
    pending.reject(new Error('private API error'))
    await flushPromises()
    expect(wrapper.get('[data-testid="categories-error"]').text()).toContain('Không thể tải danh mục')
    expect(wrapper.text()).not.toContain('private API error')
    mocks.getAdminCategories.mockResolvedValueOnce(page([]))
    await wrapper.get('[data-testid="categories-error"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="categories-empty"]').exists()).toBe(true)
  })

  it('keeps a failed child or next page retry scoped to its own parent', async () => {
    let childAttempts = 0
    let pageAttempts = 0
    mocks.getAdminCategories.mockImplementation(async (params: { mode: string; parent_id?: number; page: number }) => {
      if (params.mode === 'root') return page([category(1, null, { has_children: true }), category(4, null, { has_children: true })])
      if (params.parent_id === 4) return page([category(5, 4)])
      if (params.page === 1) {
        childAttempts += 1
        if (childAttempts === 1) throw new Error('child failure')
        return page([category(2, 1)], 1, 2, 2)
      }
      pageAttempts += 1
      if (pageAttempts === 1) throw new Error('page failure')
      return page([category(3, 1)], 2, 2, 2)
    })
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="category-expand-1"]').trigger('click')
    await wrapper.get('[data-testid="category-expand-4"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="category-feedback-1"]').text()).toContain('Không thể tải')
    await wrapper.get('[data-testid="category-feedback-1"] button').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="category-feedback-1"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="category-row-2"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="category-feedback-1"]').text()).toContain('Không thể tải thêm')
    await wrapper.get('[data-testid="category-feedback-1"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="category-row-3"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="category-row-5"]').exists()).toBe(true)
    expect(mocks.getAdminCategories).toHaveBeenCalledWith({ mode: 'children', parent_id: 1, page: 2, per_page: 30, ...defaultOrder })
  })
})

describe('Admin Categories V2 table controls', () => {
  it('searches names and slugs globally, including deep children, and shows authoritative ancestors', async () => {
    const deep = category(42, 8, {
      name: 'Lan rừng', slug: 'lan-rung', depth: 2,
      ancestors: [{ id: 1, name: 'Cây cảnh', slug: 'cay-canh' }, { id: 8, name: 'Hoa', slug: 'hoa' }],
    })
    mocks.getAdminCategories.mockImplementation(async (params: { mode: string }) => page(params.mode === 'flat' ? [deep] : [category(1)]))
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="categories-search"]').setValue('Lan rừng')
    await new Promise(resolve => setTimeout(resolve, 350))
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'flat', search: 'Lan rừng', page: 1, per_page: 30, ...defaultOrder })
    expect(wrapper.get('[data-testid="category-row-42"]').text()).toContain('Cây cảnh / Hoa')
    expect(wrapper.get('[data-testid="category-mobile-42"]').text()).toContain('Cây cảnh / Hoa')
    expect(wrapper.find('[data-testid="category-expand-42"]').exists()).toBe(false)
    await wrapper.get('[data-testid="categories-search"]').setValue('lan-rung')
    await new Promise(resolve => setTimeout(resolve, 350))
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'flat', search: 'lan-rung', page: 1, per_page: 30, ...defaultOrder })
    await wrapper.get('[aria-label="Xóa tìm kiếm"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'root', page: 1, per_page: 30, ...defaultOrder })
  })

  it('sends boolean status and structure filters, then resets to the root hierarchy', async () => {
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="categories-filter-trigger"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLInputElement>('[data-testid="category-status-false"]')!.click()
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'flat', is_active: false, page: 1, per_page: 30, ...defaultOrder })
    document.querySelector<HTMLInputElement>('[data-testid="category-structure-true"]')!.click()
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'flat', is_active: false, has_children: true, page: 1, per_page: 30, ...defaultOrder })
    document.querySelector<HTMLButtonElement>('[data-testid="categories-clear-filters"]')!.click()
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'root', page: 1, per_page: 30, ...defaultOrder })
    expect(wrapper.text()).not.toContain('Kết quả toàn bộ cấp')
  })

  it('keeps false filters and the selected sort across flat-list pagination, then restores roots', async () => {
    mocks.getAdminCategories.mockImplementation(async (params: { mode: string; page: number }) => params.mode === 'flat'
      ? page(params.page === 1 ? [category(2, null, { is_active: false, has_children: false })] : [category(3, null, { is_active: false, has_children: false })], params.page, 2, 2)
      : page([category(1)]))
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="categories-filter-trigger"]').trigger('click')
    await flushPromises()
    expect(document.querySelectorAll('[data-testid="category-status-false"]')).toHaveLength(1)
    document.querySelector<HTMLInputElement>('[data-testid="category-status-false"]')!.click()
    document.querySelector<HTMLInputElement>('[data-testid="category-structure-false"]')!.click()
    await flushPromises()
    await wrapper.get('[data-testid="categories-sort-trigger"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[data-testid="category-sort-name-desc"]')!.click()
    await flushPromises()
    const filtered = { mode: 'flat', is_active: false, has_children: false, per_page: 30, sort: 'name', direction: 'desc' }
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ ...filtered, page: 1 })
    expect(wrapper.get('[data-testid="category-row-2"]').text()).toContain('Danh mục 2')
    await wrapper.get('[data-testid="category-feedback-root"] button').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ ...filtered, page: 2 })
    expect(wrapper.get('[data-testid="category-row-3"]').text()).toContain('Danh mục 3')
    const filterTrigger = wrapper.get('[data-testid="categories-filter-trigger"]')
    expect(filterTrigger.text()).toContain('2')
    if (filterTrigger.attributes('aria-expanded') !== 'true') await filterTrigger.trigger('click')
    await flushPromises()
    const clearFilters = document.querySelector<HTMLButtonElement>('[data-testid="categories-clear-filters"]')
    expect(clearFilters).not.toBeNull()
    clearFilters!.click()
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'root', page: 1, per_page: 30, sort: 'name', direction: 'desc' })
    expect(wrapper.find('[data-testid="category-row-2"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-row-3"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-row-1"]').exists()).toBe(true)
  })

  it('distinguishes empty filtered results from a failed request and retries the same filter', async () => {
    mocks.getAdminCategories.mockImplementation(async (params: { mode: string; is_active?: boolean }) => {
      if (params.mode === 'root') return page([category(1)])
      if (params.is_active === false) return page([])
      throw new Error('request failed')
    })
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="categories-filter-trigger"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLInputElement>('[data-testid="category-status-false"]')!.click()
    await flushPromises()
    expect(wrapper.get('[data-testid="categories-empty"]').text()).toContain('Không tìm thấy danh mục phù hợp')
    document.querySelector<HTMLInputElement>('[data-testid="category-status-true"]')!.click()
    await flushPromises()
    expect(wrapper.get('[data-testid="categories-error"]').text()).toContain('Không thể tải danh mục')
    expect(wrapper.find('[data-testid="categories-empty"]').exists()).toBe(false)
    mocks.getAdminCategories.mockResolvedValueOnce(page([category(4)]))
    await wrapper.get('[data-testid="categories-error"] button').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'flat', is_active: true, page: 1, per_page: 30, ...defaultOrder })
    expect(wrapper.get('[data-testid="category-row-4"]').text()).toContain('Danh mục 4')
  })

  it.each([
    ['sort_order', 'desc'], ['name', 'asc'], ['name', 'desc'],
    ['created_at', 'desc'], ['created_at', 'asc'], ['updated_at', 'desc'],
    ['updated_at', 'asc'], ['product_count', 'desc'], ['product_count', 'asc'],
  ] as const)('sends server-side sort %s %s', async (sort, direction) => {
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="categories-sort-trigger"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>(`[data-testid="category-sort-${sort}-${direction}"]`)!.click()
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'root', page: 1, per_page: 30, sort, direction })
  })

  it('invalidates loaded child pages on sort change and applies the same order to new siblings', async () => {
    mocks.getAdminCategories.mockImplementation(async (params: { mode: string; parent_id?: number }) => page(
      params.mode === 'root' ? [category(1, null, { has_children: true })] : [category(2, params.parent_id ?? null)],
    ))
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="category-expand-1"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="category-row-2"]').exists()).toBe(true)
    await wrapper.get('[data-testid="categories-sort-trigger"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[data-testid="category-sort-name-desc"]')!.click()
    await flushPromises()
    expect(wrapper.find('[data-testid="category-row-2"]').exists()).toBe(false)
    await wrapper.get('[data-testid="category-expand-1"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'children', parent_id: 1, page: 1, per_page: 30, sort: 'name', direction: 'desc' })
  })

  it('ignores an older search response after a newer filter selection', async () => {
    const old = deferred<AdminCategoryPage>()
    mocks.getAdminCategories.mockImplementation((params: { search?: string; is_active?: boolean }) => {
      if (params.search && params.is_active === undefined) return old.promise
      if (params.is_active === false) return Promise.resolve(page([category(3, null, { is_active: false })]))
      return Promise.resolve(page([category(1)]))
    })
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="categories-search"]').setValue('cây')
    await new Promise(resolve => setTimeout(resolve, 350))
    await flushPromises()
    await wrapper.get('[data-testid="categories-filter-trigger"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLInputElement>('[data-testid="category-status-false"]')!.click()
    await flushPromises()
    old.resolve(page([category(99)]))
    await flushPromises()
    expect(wrapper.find('[data-testid="category-row-3"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="category-row-99"]').exists()).toBe(false)
  })

  it('toggles optional columns without removing the category column and persists the preference', async () => {
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="categories-columns-trigger"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLInputElement>('[data-testid="category-column-products"]')!.click()
    await flushPromises()
    expect(wrapper.get('thead').text()).not.toContain('Sản phẩm')
    expect(wrapper.get('thead').text()).toContain('Danh mục')
    expect(localStorage.getItem('admin.categories.visibleColumns')).not.toContain('products')
    document.querySelector<HTMLInputElement>('[data-testid="category-column-slug"]')!.click()
    await flushPromises()
    expect(wrapper.get('thead').text()).toContain('Slug')
    expect(wrapper.get('[data-testid="category-row-1"]').text()).toContain('danh-muc-1')
  })

  it('hides the Priority column by default, but allows it without overriding saved preferences', async () => {
    const wrapper = await mountPage()
    expect(wrapper.get('thead').text()).not.toContain('Ưu tiên')
    await wrapper.get('[data-testid="categories-columns-trigger"]').trigger('click')
    await flushPromises()
    const toggle = document.querySelector<HTMLInputElement>('[data-testid="category-column-order"]')!
    expect(toggle.checked).toBe(false)
    expect(toggle.closest('label')?.textContent).toContain('Ưu tiên')
    toggle.click()
    await flushPromises()
    expect(wrapper.get('thead').text()).toContain('Ưu tiên')
    expect(wrapper.get('[data-testid="category-row-1"]').text()).toContain('1')
    expect(JSON.parse(localStorage.getItem('admin.categories.visibleColumns') ?? '[]')).toContain('order')
    wrapper.unmount()
    const saved = await mountPage()
    expect(saved.get('thead').text()).toContain('Ưu tiên')
  })
})

describe('Admin Categories V2 navigation', () => {
  it('allows staff to read detail but reserves create and edit routes for Super Admin', async () => {
    const auth = useAuthStore(pinia)
    mocks.getCurrentUser.mockRejectedValue({ name: 'ApplicationError', kind: 'unauthorized' })
    for (const path of ['/admin/categories/create', '/admin/categories/17', '/admin/categories/17/edit']) {
      const guest = createAppRouter(createMemoryHistory())
      await guest.push(path)
      expect(guest.currentRoute.value.path).toBe('/admin/login')
      expect(guest.currentRoute.value.query.redirect).toBe(path)
    }
    for (const role of ['customer', 'cashier', 'sales_staff', 'technician', 'branch_manager', 'super_admin'] as const) {
      auth.$patch({ user: { id: 2, name: 'QA', email: 'qa@example.test', phone: null, avatar: null, role, role_label: role, branch_id: null, email_verified_at: null, created_at: '' }, isInitialized: true })
      for (const path of ['/admin/categories/create', '/admin/categories/17', '/admin/categories/17/edit']) {
        const router = createAppRouter(createMemoryHistory())
        await router.push(path)
        const mayRead = path === '/admin/categories/17' && role !== 'customer'
        expect(router.currentRoute.value.path).toBe(role === 'super_admin' || mayRead ? path : '/forbidden')
      }
    }
  })

  it('opens detail from table and mobile rows, but not from expansion controls', async () => {
    mocks.getAdminCategories.mockImplementation(async (params: { mode: string }) => page(params.mode === 'root'
      ? [category(1, null, { has_children: true })] : [category(2, 1)]))
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="category-expand-1"]').trigger('click')
    await flushPromises()
    expect(wrapper.router.currentRoute.value.path).toBe('/admin/categories')
    expect(wrapper.get('[data-testid="category-row-2"]').text()).toContain('Danh mục 2')
    await wrapper.get('[data-testid="category-row-2"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.router.currentRoute.value.path).toBe('/admin/categories/2')
    await wrapper.router.push('/admin/categories')
    await wrapper.get('[data-testid="category-mobile-1"]').trigger('click')
    await flushPromises()
    expect(wrapper.router.currentRoute.value.path).toBe('/admin/categories/1')
  })

  it('opens the create route from the real list action', async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.get('[data-testid="categories-toolbar"]').find('[data-testid="category-create"]').exists()).toBe(true)
    await wrapper.get('[data-testid="category-create"]').trigger('click')
    await flushPromises()
    expect(wrapper.router.currentRoute.value.path).toBe('/admin/categories/create')
  })
})
