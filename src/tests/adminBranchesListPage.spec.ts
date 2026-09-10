/// <reference types="node" />

import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminBranchesListPage from '@/pages/admin/AdminBranchesListPage.vue'
import AdminBranchCreatePage from '@/pages/admin/AdminBranchCreatePage.vue'
import AdminBranchDetailPage from '@/pages/admin/AdminBranchDetailPage.vue'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { pinia as appPinia } from '@/stores/pinia'
import type { AuthenticatedUser } from '@/types/auth'

const mocks = vi.hoisted(() => ({ getAdminList: vi.fn() }))
vi.mock('@/api/adminApi', () => ({ getAdminList: mocks.getAdminList }))

const adminUser: AuthenticatedUser = {
  id: 1, name: 'Super Admin', email: 'admin@example.test', phone: null, avatar: null,
  role: 'super_admin', role_label: 'Quản trị viên', branch_id: null,
  email_verified_at: '2026-09-01T00:00:00Z', created_at: '2026-08-01T00:00:00Z',
}

const branchManager: AuthenticatedUser = {
  ...adminUser, id: 2, role: 'branch_manager', role_label: 'Quản lý chi nhánh', branch_id: 7,
}

const branches = [
  {
    id: 7, code: 'MZ-NK', name: 'Mizuki Ninh Kiều', branch_type: 'store', branch_type_label: 'Cửa hàng',
    address: '123 Đường Ba Tháng Hai, Ninh Kiều, Cần Thơ', is_active: true,
  },
  {
    id: 8, code: 'MZ-CR', name: 'Mizuki Cái Răng', branch_type: 'hybrid', branch_type_label: 'Cửa hàng và phòng khám',
    address: '456 Đường Quang Trung, Cái Răng, Cần Thơ', is_active: false,
  },
]

const wrappers: VueWrapper[] = []
let intersectionCallback: IntersectionObserverCallback | undefined

function page(items = branches, currentPage = 1, lastPage = 1, total = items.length) {
  return { items: structuredClone(items), pagination: { current_page: currentPage, per_page: 100, total, last_page: lastPage } }
}

async function mountPage(user: AuthenticatedUser = adminUser): Promise<{ wrapper: VueWrapper; router: ReturnType<typeof createRouter> }> {
  const pinia = createPinia()
  useAuthStore(pinia).$patch({ user, isInitialized: true })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/branches', component: AdminBranchesListPage },
      { path: '/admin/branches/create', component: AdminBranchCreatePage },
      { path: '/admin/branches/:id', component: AdminBranchDetailPage },
    ],
  })
  await router.push('/admin/branches')
  await router.isReady()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  const wrapper = mount(AdminBranchesListPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient }]] },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

async function chooseMenuOption(wrapper: VueWrapper, triggerLabel: string, optionLabel: string): Promise<void> {
  await wrapper.get(`button[aria-label="${triggerLabel}"]`).trigger('click')
  await nextTick()
  const option = [...document.body.querySelectorAll<HTMLButtonElement>('button[role="radio"]')]
    .find((button) => button.textContent?.includes(optionLabel))
  expect(option).toBeDefined()
  option!.click()
  await flushPromises()
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { intersectionCallback = callback }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
    root = null
    rootMargin = '0px'
    thresholds = [0]
  })
  vi.clearAllMocks()
  intersectionCallback = undefined
  window.localStorage.clear()
  document.body.innerHTML = ''
  useAuthStore(appPinia).resetForTesting()
  mocks.getAdminList.mockResolvedValue(page())
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  useAuthStore(appPinia).resetForTesting()
})

describe('Admin Branches List V2', () => {
  it('registers canonical list, create, and detail routes', () => {
    const router = createAppRouter(createMemoryHistory())
    expect(router.resolve('/admin/branches').name).toBe('admin-branches')
    expect(router.resolve('/admin/branches/create').name).toBe('admin-branch-create')
    expect(router.resolve('/admin/branches/7').name).toBe('admin-branch-detail')
  })

  it('starts directly with one practical toolbar and no standalone page heading', async () => {
    const { wrapper } = await mountPage()
    expect(wrapper.find('h1').exists()).toBe(false)
    const toolbar = wrapper.get('.branches-toolbar > div')
    expect(toolbar.find('input[type="search"]').exists()).toBe(true)
    expect(toolbar.find('button[aria-label="Lọc trạng thái chi nhánh"]').exists()).toBe(true)
    expect(toolbar.find('[data-testid="columns-trigger"]').exists()).toBe(true)
    expect(toolbar.find('[data-testid="create-branch"]').exists()).toBe(true)
  })

  it('renders real branch rows with refined headers and truthful fallbacks', async () => {
    const { wrapper } = await mountPage()
    expect(wrapper.findAll('[data-testid="branch-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Mizuki Ninh Kiều')
    expect(wrapper.text()).toContain('MZ-NK')
    expect(wrapper.text()).toContain('Bán hàng + Clinic')
    expect(wrapper.text()).toContain('Đang hoạt động')
    expect(wrapper.text()).toContain('Không hoạt động')
    expect(wrapper.get('thead').text()).toContain('Mô hình')
    expect(wrapper.get('thead').classes()).not.toContain('uppercase')
    expect(wrapper.get('[data-testid="branches-table-shell"]').text()).toContain('—')
    expect(wrapper.get('table').text()).not.toMatch(/Kho|Tồn kho|Thao tác|Chỉnh sửa|Xóa/)
  })

  it('navigates the create button and branch rows to real routes', async () => {
    const first = await mountPage()
    await first.wrapper.get('[data-testid="create-branch"]').trigger('click')
    await flushPromises()
    expect(first.router.currentRoute.value.path).toBe('/admin/branches/create')

    first.wrapper.unmount()
    wrappers.splice(wrappers.indexOf(first.wrapper), 1)
    document.body.innerHTML = ''
    const second = await mountPage()
    await second.wrapper.findAll('[data-testid="branch-row"]')[0]!.trigger('click')
    await flushPromises()
    expect(second.router.currentRoute.value.path).toBe('/admin/branches/7')
  })

  it('searches name, code, and address accent-insensitively across all pages', async () => {
    vi.useFakeTimers()
    mocks.getAdminList.mockImplementation((_module: string, params: { page?: number }) => Promise.resolve(
      params.page === 2 ? page([branches[1]!], 2, 2, 2) : page([branches[0]!], 1, 2, 2),
    ))
    const { wrapper } = await mountPage()
    await wrapper.get('input[type="search"]').setValue('mz-cr')
    vi.advanceTimersByTime(320)
    await flushPromises()
    expect(wrapper.findAll('[data-testid="branch-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Mizuki Cái Răng')
    expect(mocks.getAdminList).toHaveBeenCalledWith('branches', expect.objectContaining({ page: 2 }))
    expect(mocks.getAdminList.mock.calls.every(([, params]) => !('keyword' in params))).toBe(true)

    await wrapper.get('input[type="search"]').setValue('cai rang')
    vi.advanceTimersByTime(320)
    await flushPromises()
    expect(wrapper.text()).toContain('Mizuki Cái Răng')
    await wrapper.get('input[type="search"]').setValue('quang trung')
    vi.advanceTimersByTime(320)
    await flushPromises()
    expect(wrapper.text()).toContain('Mizuki Cái Răng')
  })

  it('uses the truthful boolean status filter without fabricating three states', async () => {
    const { wrapper } = await mountPage()
    await chooseMenuOption(wrapper, 'Lọc trạng thái chi nhánh', 'Đang hoạt động')
    expect(mocks.getAdminList).toHaveBeenLastCalledWith('branches', expect.objectContaining({ is_active: 1, page: 1 }))
    await chooseMenuOption(wrapper, 'Lọc trạng thái chi nhánh', 'Không hoạt động')
    expect(mocks.getAdminList).toHaveBeenLastCalledWith('branches', expect.objectContaining({ is_active: 0, page: 1 }))
    await wrapper.get('button[aria-label="Lọc trạng thái chi nhánh"]').trigger('click')
    await flushPromises()
    const labels = [...document.body.querySelectorAll('[role="radio"]')].map((option) => option.textContent?.trim())
    expect(labels).not.toContain('Tạm ngưng')
    expect(labels).not.toContain('Ngừng hoạt động')
  })

  it('combines inactive status with the hybrid model without sending an invalid request', async () => {
    mocks.getAdminList.mockImplementation((_module: string, params: { is_active?: boolean | 0 | 1; page?: number }) => {
      if (typeof params.is_active === 'boolean') return Promise.reject(new Error('Laravel boolean validation failed'))
      const items = params.is_active === 0 ? [branches[1]!] : params.is_active === 1 ? [branches[0]!] : branches
      return Promise.resolve(page(items))
    })
    const { wrapper } = await mountPage()
    await chooseMenuOption(wrapper, 'Lọc trạng thái chi nhánh', 'Không hoạt động')
    const callsBeforeModel = mocks.getAdminList.mock.calls.length
    await chooseMenuOption(wrapper, 'Lọc mô hình hoạt động', 'Bán hàng + Clinic')
    expect(wrapper.find('[data-testid="branches-error"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="branch-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Mizuki Cái Răng')
    expect(mocks.getAdminList).toHaveBeenCalledWith('branches', expect.objectContaining({ is_active: 0, page: 1, per_page: 100 }))
    expect(mocks.getAdminList.mock.calls.length).toBe(callsBeforeModel)
    expect(mocks.getAdminList.mock.calls.every(([, params]) => !('type' in params))).toBe(true)
  })

  it('resets the infinite page scope on status changes without carrying duplicate rows', async () => {
    const thirdBranch = { ...branches[0]!, id: 9, code: 'MZ-OM', name: 'Mizuki Ô Môn' }
    mocks.getAdminList.mockImplementation((_module: string, params: { is_active?: 0 | 1; page?: number }) => {
      if (params.is_active === 1) return Promise.resolve(page([branches[0]!]))
      if (params.is_active === 0) return Promise.resolve(page([branches[1]!]))
      return Promise.resolve(params.page === 2
        ? page([branches[1]!, thirdBranch], 2, 2, 3)
        : page(branches, 1, 2, 3))
    })
    const { wrapper } = await mountPage()
    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    await flushPromises()
    expect(wrapper.findAll('[data-testid="branch-row"]')).toHaveLength(3)

    await chooseMenuOption(wrapper, 'Lọc trạng thái chi nhánh', 'Đang hoạt động')
    expect(mocks.getAdminList).toHaveBeenLastCalledWith('branches', expect.objectContaining({ is_active: 1, page: 1 }))
    expect(wrapper.findAll('[data-testid="branch-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Mizuki Ninh Kiều')
    expect(wrapper.text()).not.toContain('Mizuki Ô Môn')

    await chooseMenuOption(wrapper, 'Lọc trạng thái chi nhánh', 'Không hoạt động')
    expect(mocks.getAdminList).toHaveBeenLastCalledWith('branches', expect.objectContaining({ is_active: 0, page: 1 }))
    expect(wrapper.findAll('[data-testid="branch-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Mizuki Cái Răng')
    expect(new Set(wrapper.findAll('[data-testid="branch-row"]').map((row) => row.text()))).toHaveLength(1)

    await chooseMenuOption(wrapper, 'Lọc trạng thái chi nhánh', 'Tất cả trạng thái')
    expect(wrapper.find('[data-testid="branches-error"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="branch-row"]')).toHaveLength(3)
  })

  it('filters the loaded page by the explicit operating-model contract', async () => {
    const { wrapper } = await mountPage()
    await chooseMenuOption(wrapper, 'Lọc mô hình hoạt động', 'Bán hàng + Clinic')
    expect(wrapper.findAll('[data-testid="branch-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Mizuki Cái Răng')
    expect(wrapper.text()).not.toContain('Mizuki Ninh Kiều')
  })

  it('appends infinite pages without duplicates and renders no pagination controls', async () => {
    const thirdBranch = { ...branches[0]!, id: 9, code: 'MZ-OM', name: 'Mizuki Ô Môn' }
    mocks.getAdminList.mockImplementation((_module: string, params: { page?: number }) => Promise.resolve(
      params.page === 2 ? page([branches[1]!, thirdBranch], 2, 2, 3) : page(branches, 1, 2, 3),
    ))
    const { wrapper } = await mountPage()
    expect(intersectionCallback).toBeDefined()
    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    await flushPromises()
    expect(mocks.getAdminList).toHaveBeenCalledWith('branches', expect.objectContaining({ page: 2 }))
    expect(wrapper.findAll('[data-testid="branch-row"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('Mizuki Ô Môn')
    expect(wrapper.text()).not.toMatch(/Trang 1\/|\bTrước\b|\bSau\b/)
    expect(wrapper.get('[data-testid="branches-infinite-sentinel"]').text()).toContain('Đã hiển thị tất cả 3 chi nhánh')
  })

  it('uses a real branch image when supplied and falls back safely when missing or broken', async () => {
    mocks.getAdminList.mockResolvedValue(page([
      { ...branches[0]!, image_url: '/storage/branches/ninh-kieu.webp' },
      branches[1]!,
    ]))
    const { wrapper } = await mountPage()
    const image = wrapper.get('[data-testid="branch-image"]')
    expect(image.attributes('src')).toBe('/storage/branches/ninh-kieu.webp')
    expect(wrapper.findAll('[data-testid="branch-image-fallback"]')).toHaveLength(1)
    await image.trigger('error')
    expect(wrapper.find('[data-testid="branch-image"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="branch-image-fallback"]')).toHaveLength(2)
  })

  it('keeps Chi nhánh mandatory and persists optional column preferences', async () => {
    const { wrapper } = await mountPage()
    await wrapper.get('[data-testid="columns-trigger"]').trigger('click')
    const required = document.body.querySelector<HTMLInputElement>('[data-testid="required-branch-column"] input')!
    expect(required.disabled).toBe(true)
    const address = document.body.querySelector<HTMLInputElement>('[data-testid="column-address"]')!
    address.checked = false
    address.dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()
    expect(wrapper.get('thead').text()).not.toContain('Địa chỉ')
    expect(JSON.parse(localStorage.getItem('admin.branches.visibleColumns') ?? '[]')).not.toContain('address')
  })

  it('restores the default visible columns', async () => {
    const { wrapper } = await mountPage()
    await wrapper.get('[data-testid="columns-trigger"]').trigger('click')
    const address = document.body.querySelector<HTMLInputElement>('[data-testid="column-address"]')!
    address.checked = false
    address.dispatchEvent(new Event('change', { bubbles: true }))
    document.body.querySelector<HTMLButtonElement>('[data-testid="reset-columns"]')!.click()
    await nextTick()
    expect(wrapper.get('thead').text()).toContain('Địa chỉ')
    expect(JSON.parse(localStorage.getItem('admin.branches.visibleColumns') ?? '[]')).toContain('address')
  })

  it('restores a saved localStorage column preference on mount', async () => {
    localStorage.setItem('admin.branches.visibleColumns', JSON.stringify(['model', 'status']))
    const { wrapper } = await mountPage()
    expect(wrapper.get('thead').text()).toContain('Chi nhánh')
    expect(wrapper.get('thead').text()).toContain('Mô hình')
    expect(wrapper.get('thead').text()).not.toContain('Địa chỉ')
  })

  it('copies a branch code, shows Check feedback, then resets without row navigation', async () => {
    vi.useFakeTimers()
    const { wrapper, router } = await mountPage()
    const copyButton = wrapper.findAll('[data-testid="copy-branch-code"]')[0]!
    await copyButton.trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('MZ-NK')
    expect(copyButton.find('[data-testid="copy-success-icon"]').exists()).toBe(true)
    expect(router.currentRoute.value.path).toBe('/admin/branches')
    vi.advanceTimersByTime(1800)
    await nextTick()
    expect(copyButton.find('[data-testid="copy-icon"]').exists()).toBe(true)
  })

  it('does not expose list creation to a branch-scoped user and relies on backend scoping', async () => {
    const { wrapper } = await mountPage(branchManager)
    expect(wrapper.find('[data-testid="create-branch"]').exists()).toBe(false)
    expect(mocks.getAdminList).toHaveBeenCalledWith('branches', expect.not.objectContaining({ branch_id: expect.anything() }))
  })

  it('renders loading, empty, and error states without fabricated rows', async () => {
    let resolveRequest!: (value: ReturnType<typeof page>) => void
    mocks.getAdminList.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    const loading = await mountPage()
    expect(loading.wrapper.find('[data-testid="branches-loading"]').exists()).toBe(true)
    resolveRequest(page([]))
    await flushPromises()
    expect(loading.wrapper.get('[data-testid="branches-empty"]').text()).toContain('Chưa có chi nhánh')

    loading.wrapper.unmount()
    wrappers.splice(wrappers.indexOf(loading.wrapper), 1)
    document.body.innerHTML = ''
    mocks.getAdminList.mockRejectedValue(new Error('network'))
    const failed = await mountPage()
    await vi.waitFor(() => expect(failed.wrapper.find('[data-testid="branches-error"]').exists()).toBe(true), { timeout: 2500 })
    expect(failed.wrapper.get('[data-testid="branches-error"]').text()).toContain('Không thể tải danh sách chi nhánh')
  })
})
