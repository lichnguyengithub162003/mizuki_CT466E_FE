import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminCategoryDetailPage from '@/pages/admin/AdminCategoryDetailPage.vue'
import AdminCategoryEditorPage from '@/pages/admin/AdminCategoryEditorPage.vue'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import type { AdminCategoryPage, AdminCategoryRecord } from '@/types/adminCategory'

const mocks = vi.hoisted(() => ({
  getAdminCategories: vi.fn(), getAdminCategory: vi.fn(), createAdminCategory: vi.fn(),
  updateAdminCategory: vi.fn(), deleteAdminCategory: vi.fn(), uploadAdminImage: vi.fn(), getAdminCategoryProducts: vi.fn(),
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
const mountedWrappers: Array<{ unmount: () => void }> = []
const mountedHosts: HTMLElement[] = []
async function mountAt(path: string, component: typeof AdminCategoryEditorPage | typeof AdminCategoryDetailPage, from?: string, attachTo?: HTMLElement) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/admin/categories', name: 'admin-categories', component: { template: '<div />' } },
    { path: '/admin/orders', component: { template: '<div />' } },
    { path: '/admin/categories/create', name: 'admin-category-create', component: AdminCategoryEditorPage },
    { path: '/admin/categories/:id/edit', name: 'admin-category-edit', component: AdminCategoryEditorPage },
    { path: '/admin/categories/:id', name: 'admin-category-detail', component: AdminCategoryDetailPage },
  ] })
  if (from) await router.push(from)
  await router.push(path)
  expect(router.currentRoute.value.matched.at(-1)?.components?.default).toBe(component)
  // Memory history omits Vue Router's web-history "back" metadata.
  if (from) Object.assign(router.options.history.state, { back: from })
  const wrapper = mount(RouterView, { attachTo, global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
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
  mocks.deleteAdminCategory.mockResolvedValue({ id: 5 })
  mocks.uploadAdminImage.mockResolvedValue({ upload_token: 'token-123', preview_url: '/staged.webp', mime_type: 'image/webp', size: 3 })
  mocks.getAdminCategoryProducts.mockResolvedValue({ items: [], pagination: { current_page: 1, per_page: 15, total: 0, last_page: 1 } })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:category-preview') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})
afterEach(() => {
  while (mountedWrappers.length) mountedWrappers.pop()!.unmount()
  while (mountedHosts.length) mountedHosts.pop()!.remove()
})
afterAll(() => {
  if (originalCreateObjectURL) Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL)
  else Reflect.deleteProperty(URL, 'createObjectURL')
  if (originalRevokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL)
  else Reflect.deleteProperty(URL, 'revokeObjectURL')
})

describe('Admin Categories V2 detail and mutations', () => {
  it.each(['branch_manager', 'cashier', 'sales_staff', 'technician'] as const)('does not expose Category delete to %s', async role => {
    useAuthStore(pinia).$patch({ user: { ...useAuthStore(pinia).user!, role } })
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.find('[data-testid="category-delete-open"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-delete-dialog"]').exists()).toBe(false)
    expect(mocks.deleteAdminCategory).not.toHaveBeenCalled()
  })

  it('opens a keyboard-accessible confirmation with authoritative identity and direct counts, then cancels safely', async () => {
    mocks.getAdminCategory.mockResolvedValue(category(5, { name: 'Hoa Lan', product_count: 2, children_count: 3 }))
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage, undefined, document.body)
    const trigger = wrapper.get('[data-testid="category-delete-open"]')
    await trigger.trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[data-testid="category-delete-dialog"]')
    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.get('[data-testid="category-delete-identity"]').text()).toContain('Hoa Lan · ID 5')
    expect(dialog.text()).toContain('2 sản phẩm trực tiếp · 3 danh mục con trực tiếp')
    expect(dialog.text()).toContain('không bị xóa vĩnh viễn')
    expect(document.activeElement).toBe(wrapper.get('[data-testid="category-delete-cancel"]').element)
    await wrapper.get('[data-testid="category-delete-cancel"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="category-delete-dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    await trigger.trigger('click')
    await wrapper.get('[data-testid="category-delete-dialog"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(wrapper.find('[data-testid="category-delete-dialog"]').exists()).toBe(false)
    expect(mocks.deleteAdminCategory).not.toHaveBeenCalled()
  })

  it('submits the exact Category ID once and replaces the deleted Detail with the Category List', async () => {
    const pending = deferred<{ id: number }>()
    mocks.deleteAdminCategory.mockReturnValueOnce(pending.promise)
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-delete-open"]').trigger('click')
    const confirm = wrapper.get('[data-testid="category-delete-confirm"]')
    await confirm.trigger('click')
    await confirm.trigger('click')
    expect(mocks.deleteAdminCategory).toHaveBeenCalledTimes(1)
    expect(mocks.deleteAdminCategory).toHaveBeenCalledWith(5)
    expect(confirm.attributes('disabled')).toBeDefined()
    expect(confirm.text()).toContain('Đang xóa')
    pending.resolve({ id: 5 })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/categories')
    expect(wrapper.find('[data-testid="category-delete-dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-detail-page"]').exists()).toBe(false)
  })

  it.each([
    [409, 'xung đột dữ liệu hoặc thao tác đồng thời'],
    [401, 'Phiên đăng nhập'],
    [403, 'không có quyền'],
    [404, 'không còn tồn tại'],
    [500, 'lỗi hệ thống'],
  ])('keeps the Delete dialog open with safe feedback for HTTP %i', async (status, message) => {
    mocks.deleteAdminCategory.mockRejectedValueOnce({ name: 'ApplicationError', kind: 'http', status, message: 'SQLSTATE private' })
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-delete-open"]').trigger('click')
    await wrapper.get('[data-testid="category-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="category-delete-error"]').text()).toContain(message)
    expect(wrapper.text()).not.toContain('SQLSTATE')
    expect(router.currentRoute.value.path).toBe('/admin/categories/5')
    expect(wrapper.get('[data-testid="category-delete-confirm"]').attributes('disabled')).toBeUndefined()
  })

  it.each([
    ['Danh mục còn sản phẩm được gán trực tiếp. Vui lòng chuyển sản phẩm trước khi xóa.'],
    ['Không thể khóa cây danh mục để cập nhật. Vui lòng thử lại.'],
  ])('does not invent a reason for a Category DELETE 409: %s', async backendMessage => {
    mocks.deleteAdminCategory.mockRejectedValueOnce({ name: 'ApplicationError', kind: 'http', status: 409, message: backendMessage })
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-delete-open"]').trigger('click')
    await wrapper.get('[data-testid="category-delete-confirm"]').trigger('click')
    await flushPromises()
    const feedback = wrapper.get('[data-testid="category-delete-error"]').text()
    expect(feedback).toContain('xung đột dữ liệu hoặc thao tác đồng thời')
    expect(feedback).not.toContain('sản phẩm được gán trực tiếp')
    expect(feedback).not.toContain('khóa cây danh mục')
    expect(router.currentRoute.value.path).toBe('/admin/categories/5')
    expect(wrapper.get('[data-testid="category-delete-confirm"]').attributes('disabled')).toBeUndefined()
  })

  it('never discards a dirty Edit draft silently when opening or cancelling Delete', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
      await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
      await flushPromises()
      await wrapper.get('input[name="name"]').setValue('Bản nháp')
      await wrapper.get('[data-testid="category-delete-open"]').trigger('click')
      expect(wrapper.find('[data-testid="category-delete-dialog"]').exists()).toBe(false)
      expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Bản nháp')
      expect(mocks.deleteAdminCategory).not.toHaveBeenCalled()
      confirm.mockReturnValue(true)
      await wrapper.get('[data-testid="category-delete-open"]').trigger('click')
      expect(wrapper.find('[data-testid="category-delete-dialog"]').exists()).toBe(true)
      await wrapper.get('[data-testid="category-delete-cancel"]').trigger('click')
      expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Bản nháp')
      expect(router.currentRoute.value.path).toBe('/admin/categories/5')
      expect(mocks.deleteAdminCategory).not.toHaveBeenCalled()
      expect(confirm).toHaveBeenCalledTimes(2)
    } finally { confirm.mockRestore() }
  })

  it('lazy-loads Products for allowed roles and keeps other staff on read-only Category tabs', async () => {
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.get('[data-testid="category-tab-products"]').text()).toBe('Sản phẩm')
    expect(mocks.getAdminCategoryProducts).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="category-tab-products"]').trigger('click')
    expect(wrapper.get('[data-testid="category-products-panel"]').isVisible()).toBe(true)
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="category-products-tab"]').exists()).toBe(true)
    }, { timeout: 3000 })
    expect(mocks.getAdminCategoryProducts).toHaveBeenCalledWith({ category_id: 5, category_scope: 'direct', search: '', sort: 'newest', page: 1, per_page: 15 })
    useAuthStore(pinia).$patch({ user: { ...useAuthStore(pinia).user!, role: 'branch_manager' } })
    await nextTick()
    expect(wrapper.find('[data-testid="category-tab-products"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="category-tab-edit"]').exists()).toBe(false)
    useAuthStore(pinia).$patch({ user: { ...useAuthStore(pinia).user!, role: 'sales_staff' } })
    await nextTick()
    expect(wrapper.find('[data-testid="category-tab-products"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-tab-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-products-panel"]').exists()).toBe(false)
  })

  it('does not mount Product requests for staff without Product read permission', async () => {
    useAuthStore(pinia).$patch({ user: { ...useAuthStore(pinia).user!, role: 'sales_staff' } })
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.find('[data-testid="category-tab-products"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-tab-edit"]').exists()).toBe(false)
    expect(mocks.getAdminCategoryProducts).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="category-tab-structure"]').text()).toContain('Cấu trúc')
  })

  it('lets Branch Managers read Products without exposing Edit', async () => {
    useAuthStore(pinia).$patch({ user: { ...useAuthStore(pinia).user!, role: 'branch_manager' } })
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.find('[data-testid="category-tab-edit"]').exists()).toBe(false)
    expect(mocks.getAdminCategoryProducts).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="category-tab-products"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategoryProducts).toHaveBeenCalledWith(expect.objectContaining({ category_id: 5, category_scope: 'direct' }))
  })

  it('keeps Product filters local to the tab and loads the new Category after route change', async () => {
    mocks.getAdminCategory.mockImplementation(async (value: number | string) => category(Number(value)))
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-tab-products"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="category-products-tree"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategoryProducts).toHaveBeenLastCalledWith(expect.objectContaining({ category_id: 5, category_scope: 'tree' }))
    expect(mocks.getAdminCategory).toHaveBeenCalledTimes(1)
    await router.push('/admin/categories/6')
    await flushPromises()
    expect(wrapper.get('[data-testid="category-tab-overview"]').attributes('aria-selected')).toBe('true')
    await wrapper.get('[data-testid="category-tab-products"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategoryProducts).toHaveBeenLastCalledWith(expect.objectContaining({ category_id: 6, category_scope: 'direct', page: 1 }))
  })

  it('respects dirty Edit confirmation before opening Products', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
      await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
      await flushPromises()
      await wrapper.get('input[name="name"]').setValue('Bản nháp')
      await wrapper.get('[data-testid="category-tab-products"]').trigger('click')
      expect(wrapper.get('[data-testid="category-tab-edit"]').attributes('aria-selected')).toBe('true')
      expect(mocks.getAdminCategoryProducts).not.toHaveBeenCalled()
      confirm.mockReturnValue(true)
      await wrapper.get('[data-testid="category-tab-products"]').trigger('click')
      await flushPromises()
      expect(wrapper.get('[data-testid="category-tab-products"]').attributes('aria-selected')).toBe('true')
      expect(mocks.getAdminCategoryProducts).toHaveBeenCalledTimes(1)
    } finally { confirm.mockRestore() }
  })
  it('lazy-mounts the existing Editor only for the Super Admin Edit tab', async () => {
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.get('[data-testid="category-tab-edit"]').text()).toBe('Chỉnh sửa')
    expect(wrapper.find('[data-testid="category-editor-page"]').exists()).toBe(false)
    expect(mocks.getAdminCategory).toHaveBeenCalledTimes(1)
    await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="category-edit-panel"]').isVisible()).toBe(true)
    expect(wrapper.find('[data-testid="category-editor-page"] input[name="name"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/admin/categories/5/edit"]').exists()).toBe(false)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(router.currentRoute.value.path).toBe('/admin/categories/5')
    expect(mocks.getAdminCategory).toHaveBeenCalledTimes(1)
  })

  it('keeps one main scroll policy and cue across all Detail tabs', async () => {
    const originalResizeObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver')
    const observe = vi.fn()
    const disconnect = vi.fn()
    let onResize: (() => void) | undefined
    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: class {
      constructor(callback: () => void) { onResize = callback }
      observe = observe
      disconnect = disconnect
    } })
    try {
      const main = document.createElement('main')
      document.body.append(main)
      mountedHosts.push(main)
      Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 400 })
      Object.defineProperty(main, 'clientHeight', { configurable: true, value: 400 })
      Object.defineProperty(main, 'offsetWidth', { configurable: true, value: 900 })
      Object.defineProperty(main, 'clientWidth', { configurable: true, value: 885 })
      Object.defineProperty(main, 'scrollTop', { configurable: true, writable: true, value: 0 })
      const scrollBy = vi.fn()
      Object.defineProperty(main, 'scrollBy', { configurable: true, value: scrollBy })
      const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage, undefined, main)
      expect(main.classList.contains('category-detail-scrolling')).toBe(true)
      expect(main.style.paddingRight).toBe('')
      expect(observe).toHaveBeenCalledWith(main)
      expect(observe).toHaveBeenCalledWith(wrapper.get('[data-testid="category-detail-page"]').element)
      expect(wrapper.find('[data-testid="category-detail-scroll-cue"]').exists()).toBe(false)
      Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 1200 })
      onResize?.()
      await nextTick()
      expect(wrapper.find('[data-testid="category-detail-scroll-cue"]').exists()).toBe(true)
      for (const tab of ['structure', 'products', 'edit', 'products', 'structure', 'edit'] as const) {
        await wrapper.get(`[data-testid="category-tab-${tab}"]`).trigger('click')
        await flushPromises()
        expect(main.classList.contains('category-detail-scrolling')).toBe(true)
        expect(main.style.paddingRight).toBe('')
        expect(wrapper.find('[data-testid="category-detail-scroll-cue"]').exists()).toBe(true)
      }
      await wrapper.get('[aria-label="Cuộn xuống để xem thêm"]').trigger('click')
      expect(scrollBy).toHaveBeenCalledWith({ top: 260, behavior: 'smooth' })
      main.scrollTop = 780
      main.dispatchEvent(new Event('scroll'))
      await nextTick()
      expect(wrapper.find('[data-testid="category-detail-scroll-cue"]').exists()).toBe(false)
      main.scrollTop = 0
      Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 400 })
      window.dispatchEvent(new Event('resize'))
      await nextTick()
      expect(wrapper.find('[data-testid="category-detail-scroll-cue"]').exists()).toBe(false)
      Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 1200 })
      onResize?.()
      await nextTick()
      expect(wrapper.find('[data-testid="category-detail-scroll-cue"]').exists()).toBe(true)
      await wrapper.get('[data-testid="category-tab-overview"]').trigger('click')
      expect(main.classList.contains('category-detail-scrolling')).toBe(true)
      expect(disconnect).not.toHaveBeenCalled()
      await router.push('/admin/categories')
      await flushPromises()
      expect(main.classList.contains('category-detail-scrolling')).toBe(false)
      expect(disconnect).toHaveBeenCalledTimes(1)
      expect(wrapper.find('[data-testid="category-detail-scroll-cue"]').exists()).toBe(false)
    } finally {
      if (originalResizeObserver) Object.defineProperty(globalThis, 'ResizeObserver', originalResizeObserver)
      else Reflect.deleteProperty(globalThis, 'ResizeObserver')
    }
  })

  it('removes the page-scoped scrollbar style on unmount', async () => {
    const main = document.createElement('main')
    document.body.append(main)
    mountedHosts.push(main)
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage, undefined, main)
    expect(main.classList.contains('category-detail-scrolling')).toBe(true)
    wrapper.unmount()
    mountedWrappers.pop()
    expect(main.classList.contains('category-detail-scrolling')).toBe(false)
  })

  it.each(['draft', 'published', 'hidden'] as const)('saves the %s lifecycle and featured flag from embedded Edit, then refreshes Detail', async status => {
    const original = category(5, { name: 'Tên cũ', status: 'published', is_featured: false })
    const saved = category(5, { name: 'Tên mới', status, is_featured: true })
    mocks.getAdminCategory.mockResolvedValueOnce(original).mockResolvedValue(saved)
    mocks.updateAdminCategory.mockResolvedValue(saved)
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
    await flushPromises()
    await wrapper.get('input[name="name"]').setValue('Tên mới')
    await wrapper.get('select[name="status"]').setValue(status)
    await wrapper.get('input[name="is_featured"]').setValue(true)
    await wrapper.get('[data-testid="category-editor-page"] form').trigger('submit')
    await flushPromises()
    expect(mocks.updateAdminCategory).toHaveBeenCalledWith('5', expect.objectContaining({
      name: 'Tên mới', status, is_featured: true,
    }))
    expect(mocks.updateAdminCategory.mock.calls[0]?.[1]).not.toHaveProperty('is_active')
    expect(wrapper.get('[data-testid="category-detail-header"]').text()).toContain('Tên mới')
    expect(wrapper.get('[data-testid="category-lifecycle"]').text()).toBe(
      { draft: 'Bản nháp', published: 'Đã xuất bản', hidden: 'Đã ẩn' }[status],
    )
    expect(wrapper.get('[data-testid="category-tab-overview"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="category-save-notice"]').text()).toBe('Đã lưu thay đổi danh mục.')
    expect(router.currentRoute.value.path).toBe('/admin/categories/5')
    expect(mocks.getAdminCategory).toHaveBeenCalledTimes(2)
  })

  it('retains an embedded draft when leaving Edit is declined and discards it once confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
      await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
      await flushPromises()
      await wrapper.get('input[name="name"]').setValue('Bản nháp')
      await wrapper.get('[data-testid="category-tab-overview"]').trigger('click')
      expect(wrapper.get('[data-testid="category-tab-edit"]').attributes('aria-selected')).toBe('true')
      expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Bản nháp')
      confirm.mockReturnValue(true)
      await wrapper.get('[data-testid="category-tab-overview"]').trigger('click')
      expect(wrapper.get('[data-testid="category-tab-overview"]').attributes('aria-selected')).toBe('true')
      expect(wrapper.find('[data-testid="category-editor-page"]').exists()).toBe(false)
      expect(confirm).toHaveBeenCalledTimes(2)
    } finally { confirm.mockRestore() }
  })

  it('protects smart Back and breadcrumb navigation while embedded Edit is dirty', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      const child = category(5, { parent_id: 2, parent: { id: 2, name: 'Hoa', slug: 'hoa' }, ancestors: [{ id: 2, name: 'Hoa', slug: 'hoa' }], depth: 1 })
      mocks.getAdminCategory.mockImplementation(async (value: number | string) => String(value) === '2' ? category(2, { name: 'Hoa' }) : child)
      const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage, '/admin/categories?search=hoa')
      await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
      await flushPromises()
      await wrapper.get('input[name="name"]').setValue('Bản nháp')
      await wrapper.get('[data-testid="category-back"]').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/admin/categories/5')
      await wrapper.get('[aria-label="Đường dẫn danh mục"] a[href="/admin/categories/2"]').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/admin/categories/5')
      confirm.mockReturnValue(true)
      await wrapper.get('[data-testid="category-back"]').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe('/admin/categories?search=hoa')
      expect(confirm).toHaveBeenCalledTimes(3)
    } finally { confirm.mockRestore() }
  })

  it('loads the new category ID after a confirmed route change instead of reusing the old draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      mocks.getAdminCategory.mockImplementation(async (value: number | string) => category(Number(value), { name: 'Danh mục ' + value }))
      const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
      await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
      await flushPromises()
      await wrapper.get('input[name="name"]').setValue('Bản nháp 5')
      await router.push('/admin/categories/6')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/admin/categories/5')
      expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Bản nháp 5')
      confirm.mockReturnValue(true)
      await router.push('/admin/categories/6')
      await flushPromises()
      expect(wrapper.get('[data-testid="category-detail-header"]').text()).toContain('Danh mục 6')
      await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
      await flushPromises()
      expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Danh mục 6')
      expect(mocks.getAdminCategory).toHaveBeenLastCalledWith('6')
      expect(confirm).toHaveBeenCalledTimes(2)
    } finally { confirm.mockRestore() }
  })

  it.each(['keep', 'replace', 'remove'] as const)('uses the existing image contract for embedded %s', async action => {
    mocks.getAdminCategory.mockResolvedValue(category(5, { image_url: '/existing.webp' }))
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
    await flushPromises()
    if (action === 'replace') {
      const input = wrapper.get('[data-testid="category-edit-panel"] input[type="file"]')
      Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['image'], 'new.webp', { type: 'image/webp' })] })
      await input.trigger('change')
      await flushPromises()
      expect(mocks.uploadAdminImage).toHaveBeenCalledTimes(1)
    } else if (action === 'remove') {
      const remove = wrapper.findAll('[data-testid="category-edit-panel"] button').find(button => button.text().includes('Bỏ ảnh'))
      await remove!.trigger('click')
    } else await wrapper.get('input[name="name"]').setValue('Tên mới')
    await wrapper.get('[data-testid="category-editor-page"] form').trigger('submit')
    await flushPromises()
    const payload = mocks.updateAdminCategory.mock.calls[0]?.[1]
    if (action === 'replace') {
      expect(payload.image_upload_token).toBe('token-123')
      expect(payload).not.toHaveProperty('image_url')
    } else if (action === 'remove') {
      expect(payload.image_url).toBeNull()
      expect(payload).not.toHaveProperty('image_upload_token')
    } else {
      expect(payload).not.toHaveProperty('image_url')
      expect(payload).not.toHaveProperty('image_upload_token')
    }
  })

  it.each(['validation', 'server'] as const)('retains embedded Edit values after a %s error', async kind => {
    mocks.updateAdminCategory.mockRejectedValue(kind === 'validation'
      ? validation('slug', 'Slug đã tồn tại.')
      : { name: 'ApplicationError', kind: 'server', status: 500, message: 'SQLSTATE private details', cause: null })
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
    await flushPromises()
    await wrapper.get('input[name="name"]').setValue('Tên đang sửa')
    await wrapper.get('[data-testid="category-editor-page"] form').trigger('submit')
    await flushPromises()
    expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Tên đang sửa')
    expect(wrapper.text()).toContain(kind === 'validation' ? 'Slug đã tồn tại.' : 'Không thể lưu danh mục do lỗi hệ thống.')
    expect(wrapper.text()).not.toContain('SQLSTATE')
    expect(router.currentRoute.value.path).toBe('/admin/categories/5')
  })

  it('prevents duplicate embedded mutations while save is pending', async () => {
    const pending = deferred<AdminCategoryRecord>()
    mocks.updateAdminCategory.mockReturnValue(pending.promise)
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
    await flushPromises()
    await wrapper.get('input[name="name"]').setValue('Tên mới')
    const form = wrapper.get('[data-testid="category-editor-page"] form')
    await form.trigger('submit')
    await form.trigger('submit')
    expect(mocks.updateAdminCategory).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="category-save"]').attributes('aria-busy')).toBe('true')
    pending.resolve(category(5, { name: 'Tên mới' }))
    await flushPromises()
  })

  it('treats a pending staged image as an unsaved edit and blocks leaving the tab', async () => {
    const pending = deferred<{ upload_token: string; preview_url: string; mime_type: string; size: number }>()
    mocks.uploadAdminImage.mockReturnValue(pending.promise)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
      await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
      await flushPromises()
      const input = wrapper.get('[data-testid="category-edit-panel"] input[type="file"]')
      Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['image'], 'new.webp', { type: 'image/webp' })] })
      await input.trigger('change')
      expect(wrapper.get('[data-testid="category-save"]').attributes('disabled')).toBeDefined()
      await wrapper.get('[data-testid="category-tab-overview"]').trigger('click')
      expect(wrapper.get('[data-testid="category-tab-edit"]').attributes('aria-selected')).toBe('true')
      expect(mocks.updateAdminCategory).not.toHaveBeenCalled()
      pending.resolve({ upload_token: 'token-123', preview_url: '/staged.webp', mime_type: 'image/webp', size: 3 })
      await flushPromises()
      expect(wrapper.get('[data-testid="category-editor-page"] img').attributes('src')).toBe('/staged.webp')
      confirm.mockReturnValue(true)
      await wrapper.get('[data-testid="category-tab-overview"]').trigger('click')
      expect(wrapper.find('[data-testid="category-editor-page"]').exists()).toBe(false)
    } finally { confirm.mockRestore() }
  })

  it('protects standalone Edit drafts when navigating away', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      const { wrapper, router } = await mountAt('/admin/categories/5/edit', AdminCategoryEditorPage)
      await wrapper.get('input[name="name"]').setValue('Chưa lưu')
      await router.push('/admin/categories')
      expect(router.currentRoute.value.path).toBe('/admin/categories/5/edit')
      confirm.mockReturnValue(true)
      await router.push('/admin/categories')
      expect(router.currentRoute.value.path).toBe('/admin/categories')
      expect(confirm).toHaveBeenCalledTimes(2)
    } finally { confirm.mockRestore() }
  })

  it('protects embedded Edit against browser Back and preserves the draft on decline', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage, '/admin/categories?search=lan&page=2')
      await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
      await flushPromises()
      await wrapper.get('input[name="name"]').setValue('Bản nháp')
      router.back()
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/admin/categories/5')
      expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Bản nháp')
      confirm.mockReturnValue(true)
      router.back()
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe('/admin/categories?search=lan&page=2')
      expect(confirm).toHaveBeenCalledTimes(2)
    } finally { confirm.mockRestore() }
  })

  it('allows clean embedded Edit navigation without asking to discard', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    try {
      const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
      await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
      await flushPromises()
      await router.push('/admin/categories')
      expect(router.currentRoute.value.path).toBe('/admin/categories')
      expect(confirm).not.toHaveBeenCalled()
    } finally { confirm.mockRestore() }
  })

  it('allows navigation after a successful embedded save without a stale dirty warning', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    try {
      const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
      await wrapper.get('[data-testid="category-tab-edit"]').trigger('click')
      await flushPromises()
      await wrapper.get('input[name="name"]').setValue('Đã lưu')
      await wrapper.get('[data-testid="category-editor-page"] form').trigger('submit')
      await flushPromises()
      expect(wrapper.get('[data-testid="category-tab-overview"]').attributes('aria-selected')).toBe('true')
      await router.push('/admin/categories')
      expect(router.currentRoute.value.path).toBe('/admin/categories')
      expect(confirm).not.toHaveBeenCalled()
    } finally { confirm.mockRestore() }
  })

  it('continues to protect unsaved Create V2 drafts through its route guard', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      const { wrapper, router } = await mountAt('/admin/categories/create', AdminCategoryEditorPage)
      await wrapper.get('input[name="name"]').setValue('Chưa tạo')
      await router.push('/admin/categories')
      expect(router.currentRoute.value.path).toBe('/admin/categories/create')
      expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Chưa tạo')
      confirm.mockReturnValue(true)
      await router.push('/admin/categories')
      expect(router.currentRoute.value.path).toBe('/admin/categories')
      expect(confirm).toHaveBeenCalledTimes(2)
    } finally { confirm.mockRestore() }
  })

  it('returns to the filtered Category List with its query intact', async () => {
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage, '/admin/categories?search=lan&page=2')
    await wrapper.get('[data-testid="category-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/admin/categories?search=lan&page=2')
  })

  it('returns from a child to the previous category detail', async () => {
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage, '/admin/categories/2')
    await wrapper.get('[data-testid="category-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/categories/2')
  })

  it.each([undefined, '/admin/orders'])('falls back to Category List when no relevant history exists (%s)', async from => {
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage, from)
    await wrapper.get('[data-testid="category-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/categories')
  })

  it('switches two accessible tabs without losing the loaded detail or requesting it again', async () => {
    mocks.getAdminCategory.mockResolvedValue(category(5, { children_count: 1 }))
    mocks.getAdminCategories.mockResolvedValue(page([category(11, { parent_id: 5 })]))
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    const overview = wrapper.get('[data-testid="category-tab-overview"]')
    const structure = wrapper.get('[data-testid="category-tab-structure"]')
    expect(overview.attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="category-overview"]').isVisible()).toBe(true)
    expect(wrapper.find('[data-testid="category-children"]').exists()).toBe(false)

    await structure.trigger('click')
    await flushPromises()
    expect(structure.attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="category-children"]').isVisible()).toBe(true)
    expect(wrapper.find('[data-testid="category-overview"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="category-current-node"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get('[data-testid="category-child-11"]').isVisible()).toBe(true)
    await structure.trigger('keydown', { key: 'ArrowLeft' })
    await flushPromises()
    expect(overview.attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="category-overview"]').isVisible()).toBe(true)
    expect(wrapper.find('[data-testid="category-children"]').exists()).toBe(false)
    expect(mocks.getAdminCategory).toHaveBeenCalledTimes(1)
    expect(mocks.getAdminCategories).toHaveBeenCalledTimes(1)
  })

  it('shows root, current category and direct descendants in depth order without inventing siblings', async () => {
    const detail = category(5, {
      name: 'Lan hồ điệp', parent_id: 2, parent: { id: 2, name: 'Hoa', slug: 'hoa' },
      ancestors: [{ id: 1, name: 'Sản phẩm', slug: 'san-pham' }, { id: 2, name: 'Hoa', slug: 'hoa' }],
      depth: 2, children_count: 1,
    })
    mocks.getAdminCategory.mockImplementation(async (id: number | string) => String(id) === '5' ? detail : category(Number(id)))
    mocks.getAdminCategories.mockResolvedValue(page([category(11, { name: 'Lan trắng', parent_id: 5, depth: 3 })]))
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-tab-structure"]').trigger('click')
    const tree = wrapper.get('[data-testid="category-tree"]')
    expect(tree.findAll('a, [data-testid="category-current-node"]').map(node => node.attributes('data-testid'))).toEqual([
      'category-ancestor-1', 'category-ancestor-2', 'category-current-node', 'category-child-11',
    ])
    expect(wrapper.get('[data-testid="category-ancestor-1"]').attributes('href')).toBe('/admin/categories/1')
    expect(wrapper.get('[data-testid="category-ancestor-2"]').attributes('href')).toBe('/admin/categories/2')
    expect(wrapper.get('[data-testid="category-child-11"]').attributes('href')).toBe('/admin/categories/11')
    expect(wrapper.get('[data-testid="category-current-node"]').text()).toContain('Cấp 3')
    expect(wrapper.get('[data-testid="category-child-11"]').text()).toContain('Lan trắng')
    expect(wrapper.get('[data-testid="category-child-11"]').text()).toContain('Cấp 4')
    expect(wrapper.get('[data-testid="category-current-node"]').classes()).toContain('bg-primary-50/75')
  })

  it('keeps the root tree compact and shows an honest leaf state', async () => {
    mocks.getAdminCategory.mockResolvedValue(category(5, { name: 'Danh mục gốc', children_count: 0 }))
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-tab-structure"]').trigger('click')
    expect(wrapper.find('[data-testid^="category-ancestor-"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="category-current-node"]').text()).toContain('Cấp 1')
    expect(wrapper.get('[data-testid="category-children-empty"]').isVisible()).toBe(true)
    expect(mocks.getAdminCategories).not.toHaveBeenCalled()
  })

  it('renders authoritative detail values, image fallback and a compact metadata header', async () => {
    const detail = category(5, {
      name: 'Hoa lan', slug: 'hoa-lan', description: 'Mô tả thật',
      parent_id: 2, parent: { id: 2, name: 'Hoa', slug: 'hoa' },
      ancestors: [{ id: 2, name: 'Hoa', slug: 'hoa' }],
      depth: 1,
      children_count: 7, product_count: 12, sort_order: 4,
      image_rendition_url: '/lan.webp',
    })
    mocks.getAdminCategory.mockImplementation(async (id: number | string) => String(id) === '2' ? category(2, { name: 'Hoa' }) : detail)
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.get('[aria-label="Đường dẫn danh mục"] a[href="/admin/categories/2"]').text()).toBe('Hoa')
    expect(wrapper.get('[data-testid="category-parent-link"]').attributes('href')).toBe('/admin/categories/2')
    expect(wrapper.text()).toContain('Danh mục cấp 2')
    expect(wrapper.text()).toContain('Mô tả thật')
    expect(wrapper.text()).toContain('Sản phẩm trực tiếp')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.get('[data-testid="category-effective-visibility"]').text()).toContain('Đủ điều kiện hiển thị')
    expect(wrapper.get('[data-testid="category-detail-image"] img').attributes('src')).toBe('/lan.webp')
    await wrapper.get('[data-testid="category-detail-image"] img').trigger('error')
    expect(wrapper.find('[data-testid="category-detail-image"] img').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-open-edit"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="category-header-metadata"]').text()).toContain('hoa-lan')
    expect(wrapper.get('[data-testid="category-header-metadata"]').text()).toContain('ID danh mục')
    expect(wrapper.get('[data-testid="category-detail-header"]').classes()).toContain('bg-gradient-to-br')
    expect(wrapper.get('[data-testid="category-tab-edit"]').attributes('aria-selected')).toBe('false')
  })

  it('copies the authoritative category ID and slug with temporary check feedback', async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    try {
      mocks.getAdminCategory.mockResolvedValue(category(5, { slug: 'hoa-lan' }))
      const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
      await wrapper.get('[data-testid="category-copy-id"]').trigger('click')
      await flushPromises()
      expect(writeText).toHaveBeenCalledWith('5')
      expect(wrapper.get('[data-testid="category-copy-id"]').attributes('aria-label')).toBe('Đã sao chép ID danh mục')
      await wrapper.get('[data-testid="category-copy-slug"]').trigger('click')
      await flushPromises()
      expect(writeText).toHaveBeenLastCalledWith('hoa-lan')
      expect(wrapper.get('[data-testid="category-copy-slug"]').attributes('aria-label')).toBe('Đã sao chép slug')
      await new Promise(resolve => setTimeout(resolve, 2050))
      await flushPromises()
      expect(wrapper.get('[data-testid="category-copy-slug"]').attributes('aria-label')).toBe('Sao chép slug')
    } finally {
      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
      else Reflect.deleteProperty(navigator, 'clipboard')
    }
  })

  it.each([
    ['draft', 'Bản nháp'], ['published', 'Đã xuất bản'], ['hidden', 'Đã ẩn'],
  ] as const)('shows the authoritative %s lifecycle and featured metadata', async (status, label) => {
    mocks.getAdminCategory.mockResolvedValue(category(5, { status, is_featured: true }))
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.get('[data-testid="category-lifecycle"]').text()).toBe(label)
    expect(wrapper.get('[data-testid="category-header-metadata"]').text()).toContain('Nổi bật')
    expect(wrapper.get('[data-testid="category-featured"]').text()).toBe('Có')
    expect(wrapper.text()).toContain('Nổi bật là thuộc tính danh mục')
    expect(wrapper.text()).not.toContain('ẩn sản phẩm')
  })

  it.each(['draft', 'hidden'] as const)('does not claim public visibility under a %s ancestor', async status => {
    const descendant = category(5, { parent_id: 2, parent: { id: 2, name: 'Hoa', slug: 'hoa' }, ancestors: [{ id: 2, name: 'Hoa', slug: 'hoa' }], depth: 1 })
    mocks.getAdminCategory.mockImplementation(async (id: number | string) => String(id) === '2' ? category(2, { name: 'Hoa', status, is_active: status === 'draft' }) : descendant)
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(mocks.getAdminCategory).toHaveBeenCalledWith(2)
    expect(wrapper.get('[data-testid="category-effective-visibility"]').text()).toContain('Chưa thể hiển thị công khai')
    expect(wrapper.get('[data-testid="category-effective-visibility"]').text()).toContain('Hoa')
  })

  it('keeps visibility unknown when ancestor status cannot be loaded', async () => {
    mocks.getAdminCategory.mockImplementation(async (id: number | string) => {
      if (String(id) === '2') throw new Error('server unavailable')
      return category(5, { parent_id: 2, ancestors: [{ id: 2, name: 'Hoa', slug: 'hoa' }], depth: 1 })
    })
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.get('[data-testid="category-effective-visibility"]').text()).toContain('Chưa xác định khả năng hiển thị')
    expect(wrapper.get('[data-testid="category-effective-visibility"]').text()).not.toContain('Đủ điều kiện hiển thị')
  })

  it('paginates direct children without presenting the first page as the whole tree', async () => {
    mocks.getAdminCategory.mockResolvedValue(category(5, { children_count: 3, has_children: true }))
    mocks.getAdminCategories.mockImplementation(async (params: { mode: string; page: number }) => params.page === 1
      ? page([category(11, { name: 'Lan', status: 'draft', parent_id: 5 }), category(12, { name: 'Hồng', parent_id: 5 })], 1, 2, 3)
      : page([category(13, { name: 'Cúc', status: 'hidden', parent_id: 5 })], 2, 2, 3))
    const { wrapper, router } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(mocks.getAdminCategories).toHaveBeenCalledWith({ mode: 'children', parent_id: 5, page: 1, per_page: 12, sort: 'sort_order', direction: 'asc' })
    await wrapper.get('[data-testid="category-tab-structure"]').trigger('click')
    expect(wrapper.get('[data-testid="category-child-11"]').text()).toContain('Bản nháp')
    expect(wrapper.get('[data-testid="category-children-more"]').text()).toContain('Tải thêm')
    await wrapper.get('[data-testid="category-children-more"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategories).toHaveBeenLastCalledWith({ mode: 'children', parent_id: 5, page: 2, per_page: 12, sort: 'sort_order', direction: 'asc' })
    expect(wrapper.findAll('[data-testid="category-child-11"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="category-child-13"]').text()).toContain('Đã ẩn')
    await wrapper.get('[data-testid="category-child-13"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/categories/13')
  })

  it('shows an empty direct-child state and only the API-provided direct product count', async () => {
    mocks.getAdminCategory.mockResolvedValue(category(5, { children_count: 0, product_count: 7 }))
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.text()).toContain('Sản phẩm trực tiếp')
    expect(wrapper.text()).not.toContain('Sản phẩm toàn cây')
    await wrapper.get('[data-testid="category-tab-structure"]').trigger('click')
    expect(wrapper.get('[data-testid="category-children-empty"]').text()).toContain('Chưa có danh mục con')
    expect(mocks.getAdminCategories).not.toHaveBeenCalled()
    expect(wrapper.find('a[href^="/admin/products"]').exists()).toBe(false)
  })

  it('shows a child-list loading state and a retry without losing the category', async () => {
    const pending = deferred<AdminCategoryPage>()
    mocks.getAdminCategory.mockResolvedValue(category(5, { children_count: 1 }))
    mocks.getAdminCategories.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(page([category(11, { parent_id: 5 })]))
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    await wrapper.get('[data-testid="category-tab-structure"]').trigger('click')
    expect(wrapper.find('[aria-label="Đang tải danh mục con"]').exists()).toBe(true)
    pending.reject(new Error('network'))
    await flushPromises()
    expect(wrapper.text()).toContain('Không thể tải danh mục con.')
    expect(wrapper.text()).toContain('Danh mục 5')
    const retry = wrapper.findAll('button').find(button => button.text() === 'Thử lại')
    await retry!.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="category-child-11"]').exists()).toBe(true)
  })

  it.each([
    [404, 'Không tìm thấy danh mục'], [403, 'Bạn không có quyền xem danh mục này'], [500, 'Không thể tải danh mục'],
  ])('shows a safe detail error for HTTP %i', async (status, label) => {
    mocks.getAdminCategory.mockRejectedValue({ name: 'ApplicationError', kind: 'http', status, message: 'SQLSTATE private server detail' })
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.get('[data-testid="category-detail-error"]').text()).toContain(label)
    expect(wrapper.text()).not.toContain('SQLSTATE')
    expect(wrapper.find('[data-testid="category-children"]').exists()).toBe(false)
  })

  it('shows a detail skeleton until the category response arrives', async () => {
    const pending = deferred<AdminCategoryRecord>()
    mocks.getAdminCategory.mockReturnValue(pending.promise)
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.find('[data-testid="category-detail-loading"]').exists()).toBe(true)
    pending.resolve(category(5))
    await flushPromises()
    expect(wrapper.get('[data-testid="category-detail-header"]').text()).toContain('Danh mục 5')
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

  it.each(['branch_manager', 'cashier'] as const)('hides mutation controls for %s staff', async role => {
    useAuthStore(pinia).$patch({ user: { id: 3, name: 'Staff', email: 'staff@example.test', phone: null, avatar: null, role, role_label: role, branch_id: 1, email_verified_at: null, created_at: '' } })
    const { wrapper } = await mountAt('/admin/categories/5', AdminCategoryDetailPage)
    expect(wrapper.find('[data-testid="category-open-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-tab-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-edit-panel"]').exists()).toBe(false)
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
    expect((wrapper.get('select[name="status"]').element as HTMLSelectElement).value).toBe('draft')
    expect(wrapper.find('input[name="is_active"]').exists()).toBe(false)
    expect((wrapper.get('input[name="is_featured"]').element as HTMLInputElement).checked).toBe(true)
    await wrapper.get('input[name="name"]').setValue('Bản nháp đã sửa')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const payload = mocks.updateAdminCategory.mock.calls[0]?.[1]
    expect(payload).toMatchObject({ name: 'Bản nháp đã sửa', status: 'draft', is_featured: true })
    expect(payload).not.toHaveProperty('is_active')
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
