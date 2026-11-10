import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminCategoriesTrashPage from '@/pages/admin/AdminCategoriesTrashPage.vue'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import type { AdminCategoryTrashRecord, AdminPage } from '@/types/admin'

const mocks = vi.hoisted(() => ({ getAdminCategoryTrash: vi.fn(), restoreAdminCategory: vi.fn(), getCurrentUser: vi.fn() }))
vi.mock('@/api/adminApi', async original => ({ ...(await original()), getAdminCategoryTrash: mocks.getAdminCategoryTrash, restoreAdminCategory: mocks.restoreAdminCategory }))
vi.mock('@/api/auth/authApi', () => ({ getCurrentUser: mocks.getCurrentUser }))

function record(id: number, overrides: Partial<AdminCategoryTrashRecord> = {}): AdminCategoryTrashRecord {
  return {
    id, parent_id: null, name: `Danh mục ${id}`, slug: `danh-muc-${id}`,
    status: 'published', is_featured: false, deleted_at: '2026-11-01T08:00:00Z',
    deleted_from_parent_id: null, delete_snapshot_captured: true, original_parent: null,
    ...overrides,
  }
}
function page(items: AdminCategoryTrashRecord[], current = 1, last = 1, total = items.length): AdminPage<AdminCategoryTrashRecord> {
  return { items, pagination: { current_page: current, last_page: last, per_page: 20, total } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}
const mounted: Array<{ unmount: () => void }> = []
async function mountPage(role: 'super_admin' | 'branch_manager' = 'super_admin') {
  useAuthStore(pinia).$patch({ user: { id: 2, name: 'QA', email: 'qa@example.test', phone: null, avatar: null, role, role_label: role, branch_id: null, email_verified_at: null, created_at: '' }, isInitialized: true })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/admin/categories', name: 'admin-categories', component: { template: '<div />' } },
    { path: '/admin/categories/trash', name: 'admin-categories-trash', component: AdminCategoriesTrashPage },
  ] })
  await router.push('/admin/categories/trash')
  const wrapper = mount(AdminCategoriesTrashPage, { attachTo: document.body, global: { plugins: [router] } })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}
beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore(pinia).resetForTesting()
  mocks.getAdminCategoryTrash.mockResolvedValue(page([record(5)]))
  mocks.restoreAdminCategory.mockResolvedValue(record(5))
})
afterEach(() => { while (mounted.length) mounted.pop()!.unmount() })

describe('Admin Category Trash and Restore', () => {
  it('guards direct Trash URL for guests and non-Super Admin roles', async () => {
    const auth = useAuthStore(pinia)
    mocks.getCurrentUser.mockRejectedValue({ name: 'ApplicationError', kind: 'unauthorized' })
    const guest = createAppRouter(createMemoryHistory())
    await guest.push('/admin/categories/trash')
    expect(guest.currentRoute.value.path).toBe('/admin/login')
    expect(guest.currentRoute.value.query.redirect).toBe('/admin/categories/trash')
    for (const role of ['customer', 'cashier', 'sales_staff', 'technician', 'branch_manager', 'super_admin'] as const) {
      auth.$patch({ user: { id: 2, name: 'QA', email: 'qa@example.test', phone: null, avatar: null, role, role_label: role, branch_id: null, email_verified_at: null, created_at: '' }, isInitialized: true })
      const router = createAppRouter(createMemoryHistory())
      await router.push('/admin/categories/trash')
      expect(router.currentRoute.value.path).toBe(role === 'super_admin' ? '/admin/categories/trash' : '/forbidden')
    }
    const { wrapper } = await mountPage('branch_manager')
    expect(mocks.getAdminCategoryTrash).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="category-trash-error"]').text()).toContain('không có quyền')
  })

  it('loads the first Trash page and renders authoritative lifecycle, deletion and parent context', async () => {
    mocks.getAdminCategoryTrash.mockResolvedValue(page([record(5, {
      name: 'Hoa Lan', slug: 'hoa-lan', status: 'draft', is_featured: true,
      deleted_from_parent_id: 2, original_parent: { id: 2, name: 'Cha hiện tại', slug: 'cha-moi' },
    }), record(6, { deleted_from_parent_id: 3, original_parent: null })]))
    const { wrapper } = await mountPage()
    expect(mocks.getAdminCategoryTrash).toHaveBeenCalledWith({ page: 1, per_page: 20 })
    const row = wrapper.get('[data-testid="category-trash-row-5"]')
    expect(row.text()).toContain('Hoa Lan')
    expect(row.text()).toContain('ID 5 · hoa-lan')
    expect(row.text()).toContain('Bản nháp')
    expect(row.text()).toContain('Nổi bật')
    expect(row.text()).toContain('ID cha lúc xóa: 2')
    expect(row.text()).toContain('Tên/slug hiện tại của cha: Cha hiện tại · cha-moi')
    expect(row.text()).toContain('2026')
    expect(row.find('[data-testid="category-trash-restore-5"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="category-trash-card-5"]').text()).toContain('ID cha lúc xóa: 2')
    expect(wrapper.get('[data-testid="category-trash-row-6"]').text()).toContain('ID cha lúc xóa: 3')
    expect(wrapper.get('[data-testid="category-trash-row-6"]').text()).toContain('Tên/slug hiện tại của cha không có dữ liệu')
  })

  it('keeps legacy rows honest and does not offer a restore that Backend must reject', async () => {
    mocks.getAdminCategoryTrash.mockResolvedValue(page([record(7, {
      delete_snapshot_captured: false, deleted_from_parent_id: null, original_parent: undefined,
    })]))
    const { wrapper } = await mountPage()
    expect(wrapper.get('[data-testid="category-trash-row-7"]').text()).toContain('Chưa có dữ liệu vị trí lúc xóa')
    expect(wrapper.find('[data-testid="category-trash-restore-7"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-trash-mobile-restore-7"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Tên/slug hiện tại của cha:')
    expect(mocks.restoreAdminCategory).not.toHaveBeenCalled()
  })

  it('searches by name or slug, clears the query and paginates on the server', async () => {
    mocks.getAdminCategoryTrash.mockImplementation(async ({ page: requested, search }: { page: number; search?: string }) =>
      page([record(search ? 7 : 5)], requested, search ? 1 : 2, search ? 1 : 21))
    const { wrapper } = await mountPage()
    await wrapper.get('[data-testid="category-trash-next"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategoryTrash).toHaveBeenLastCalledWith({ page: 2, per_page: 20 })
    await wrapper.get('[data-testid="category-trash-search"]').setValue('  hoa-lan  ')
    await new Promise(resolve => setTimeout(resolve, 350))
    await flushPromises()
    expect(mocks.getAdminCategoryTrash).toHaveBeenLastCalledWith({ page: 1, per_page: 20, search: 'hoa-lan' })
    await wrapper.get('[data-testid="category-trash-clear-search"]').trigger('click')
    await flushPromises()
    expect(mocks.getAdminCategoryTrash).toHaveBeenLastCalledWith({ page: 1, per_page: 20 })
  })

  it('ignores a stale search response after a newer query wins', async () => {
    const old = deferred<AdminPage<AdminCategoryTrashRecord>>()
    mocks.getAdminCategoryTrash.mockImplementation(({ search }: { search?: string }) =>
      search === 'hoa' ? old.promise : Promise.resolve(page([record(search === 'lan' ? 7 : 5)])))
    const { wrapper } = await mountPage()
    await wrapper.get('[data-testid="category-trash-search"]').setValue('hoa')
    await new Promise(resolve => setTimeout(resolve, 350))
    await wrapper.get('[data-testid="category-trash-search"]').setValue('lan')
    await new Promise(resolve => setTimeout(resolve, 350))
    await flushPromises()
    expect(wrapper.find('[data-testid="category-trash-row-7"]').exists()).toBe(true)
    old.resolve(page([record(6)]))
    await flushPromises()
    expect(wrapper.find('[data-testid="category-trash-row-6"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="category-trash-row-7"]').exists()).toBe(true)
  })

  it('shows loading, empty, safe error and retry states', async () => {
    const pending = deferred<AdminPage<AdminCategoryTrashRecord>>()
    mocks.getAdminCategoryTrash.mockReturnValueOnce(pending.promise)
      .mockRejectedValueOnce({ status: 500, message: 'SQLSTATE private' })
      .mockResolvedValueOnce(page([record(8)]))
    const { wrapper } = await mountPage()
    expect(wrapper.find('[data-testid="category-trash-loading"]').exists()).toBe(true)
    pending.resolve(page([]))
    await flushPromises()
    expect(wrapper.get('[data-testid="category-trash-empty"]').text()).toContain('đang trống')
    await wrapper.get('[data-testid="category-trash-search"]').setValue('hoa')
    await new Promise(resolve => setTimeout(resolve, 350))
    await flushPromises()
    expect(wrapper.get('[data-testid="category-trash-error"]').text()).not.toContain('SQLSTATE')
    await wrapper.get('[data-testid="category-trash-retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="category-trash-row-8"]').exists()).toBe(true)
  })

  it.each([[401, 'Phiên đăng nhập'], [403, 'không có quyền']])('shows a truthful Trash access error for HTTP %i', async (status, message) => {
    mocks.getAdminCategoryTrash.mockRejectedValueOnce({ status, message: 'private server response' })
    const { wrapper } = await mountPage()
    expect(wrapper.get('[data-testid="category-trash-error"]').text()).toContain(message)
    expect(wrapper.text()).not.toContain('private server response')
    expect(wrapper.find('[data-testid="category-trash-retry"]').exists()).toBe(false)
  })

  it('opens a confirmation, restores focus on cancel or Escape, and never mutates from one click', async () => {
    const { wrapper } = await mountPage()
    const trigger = wrapper.get('[data-testid="category-trash-mobile-restore-5"]')
    await trigger.trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[data-testid="category-restore-dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.get('[data-testid="category-restore-identity"]').text()).toContain('Danh mục 5 · ID 5')
    expect(document.activeElement).toBe(wrapper.get('[data-testid="category-restore-cancel"]').element)
    expect(mocks.restoreAdminCategory).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="category-restore-cancel"]').trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(trigger.element)
    await trigger.trigger('click')
    await wrapper.get('[data-testid="category-restore-dialog"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(wrapper.find('[data-testid="category-restore-dialog"]').exists()).toBe(false)
    expect(mocks.restoreAdminCategory).not.toHaveBeenCalled()
  })

  it('restores once, refreshes the current page and falls back after its last row disappears', async () => {
    let restored = false
    const pending = deferred<unknown>()
    mocks.getAdminCategoryTrash.mockImplementation(async ({ page: requested }: { page: number }) => requested === 2
      ? restored ? page([], 2, 1, 20) : page([record(9)], 2, 2, 21)
      : page([record(8)], 1, restored ? 1 : 2, restored ? 20 : 21))
    mocks.restoreAdminCategory.mockImplementationOnce(async () => { await pending.promise; restored = true; return record(9) })
    const { wrapper } = await mountPage()
    await wrapper.get('[data-testid="category-trash-next"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="category-trash-mobile-restore-9"]').trigger('click')
    const confirm = wrapper.get('[data-testid="category-restore-confirm"]')
    await confirm.trigger('click')
    await confirm.trigger('click')
    expect(mocks.restoreAdminCategory).toHaveBeenCalledTimes(1)
    expect(mocks.restoreAdminCategory).toHaveBeenCalledWith(9)
    expect(confirm.attributes('disabled')).toBeDefined()
    pending.resolve(record(9))
    await flushPromises()
    expect(mocks.getAdminCategoryTrash).toHaveBeenLastCalledWith({ page: 1, per_page: 20 })
    expect(wrapper.find('[data-testid="category-trash-row-9"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="category-trash-row-8"]').text()).toContain('Danh mục 8')
    expect(wrapper.get('[data-testid="category-trash-total"]').text()).toContain('20 danh mục')
    expect(wrapper.find('[data-testid="category-trash-pagination"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="category-trash-notice"]').text()).toContain('Đã khôi phục')
  })

  it.each([
    [401, 'Phiên đăng nhập'], [403, 'không có quyền'], [404, 'không còn tồn tại'],
    [409, 'dữ liệu vị trí'], [500, 'lỗi hệ thống'],
  ])('shows safe Restore feedback for HTTP %i and retains the confirmation', async (status, message) => {
    mocks.restoreAdminCategory.mockRejectedValueOnce({ status, message: 'SQLSTATE private' })
    const { wrapper } = await mountPage()
    await wrapper.get('[data-testid="category-trash-mobile-restore-5"]').trigger('click')
    await wrapper.get('[data-testid="category-restore-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="category-restore-error"]').text()).toContain(message)
    expect(wrapper.text()).not.toContain('SQLSTATE')
    expect(wrapper.get('[data-testid="category-restore-confirm"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-testid="category-restore-dialog"]').exists()).toBe(true)
  })

  it('handles a network Restore failure without losing the chosen row', async () => {
    mocks.restoreAdminCategory.mockRejectedValueOnce({ name: 'ApplicationError', kind: 'network', message: 'private network detail' })
    const { wrapper } = await mountPage()
    await wrapper.get('[data-testid="category-trash-mobile-restore-5"]').trigger('click')
    await wrapper.get('[data-testid="category-restore-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="category-restore-error"]').text()).toContain('lỗi hệ thống')
    expect(wrapper.text()).not.toContain('private network detail')
    expect(wrapper.get('[data-testid="category-restore-identity"]').text()).toContain('ID 5')
  })
})
