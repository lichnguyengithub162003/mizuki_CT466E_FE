import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminOrdersListPage from '@/pages/admin/AdminOrdersListPage.vue'
import { useAuthStore } from '@/stores/auth'

const mocks = vi.hoisted(() => ({
  getAdminList: vi.fn(),
  getCurrentUser: vi.fn(),
  writeText: vi.fn(),
}))
vi.mock('@/api/adminApi', async (original) => ({ ...(await original()), getAdminList: mocks.getAdminList }))
vi.mock('@/api/auth/authApi', () => ({
  getCurrentUser: mocks.getCurrentUser,
  login: vi.fn(), staffLogin: vi.fn(), register: vi.fn(), logout: vi.fn(),
}))

const order = (id: number, overrides = {}) => ({
  id,
  order_number: `MZ-V2-${id}`,
  status: 'pending',
  status_label: 'Chờ xác nhận',
  customer: { id: 20 + id, name: `Khách hàng ${id}`, email: `customer${id}@example.test`, phone: `090000000${id}` },
  branch: { id: 1, name: 'Mizuki Ninh Kiều' },
  delivery_method: 'delivery',
  payment_method: 'vnpay',
  payment_status: 'paid',
  payment_status_label: 'Đã thanh toán',
  total_amount: 350_000 + id,
  placed_at: '2026-08-31T09:15:00Z',
  items: [{ id: id * 10, product_name: `Serum ${id}`, image_url: `/storage/catalog/products/${id}.webp` }],
  ...overrides,
})

const mountedWrappers: Array<ReturnType<typeof mount>> = []
afterEach(() => mountedWrappers.splice(0).forEach((wrapper) => {
  try { wrapper.unmount() } catch { /* already torn down after a render failure */ }
}))

async function mountPage() {
  const pinia = createPinia()
  const admin = { id: 1, name: 'QA Admin', email: 'qa.admin@mizuki.local', role: 'super_admin', role_label: 'Admin', branch_id: null }
  mocks.getCurrentUser.mockResolvedValue(admin)
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/admin/orders', component: AdminOrdersListPage },
    { path: '/admin/orders/:id', component: { template: '<p>Order detail</p>' } },
  ] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  const auth = useAuthStore(pinia)
  await auth.restoreSession()
  await router.push('/admin/orders')
  const wrapper = mount(AdminOrdersListPage, { global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient }]] } })
  mountedWrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

describe('Admin Orders List V2', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    localStorage.clear()
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: mocks.writeText } })
    mocks.writeText.mockResolvedValue(undefined)
    mocks.getAdminList.mockImplementation((module: string, params: Record<string, unknown>) => {
      if (module === 'branches') return Promise.resolve({ items: [{ id: 1, name: 'Mizuki Ninh Kiều' }], pagination: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })
      const page = Number(params.page ?? 1)
      return Promise.resolve({
        items: page === 1 ? [order(1), order(2)] : [order(2), order(3)],
        pagination: { current_page: page, per_page: 40, total: 3, last_page: 2 },
      })
    })
  })

  it('uses newest-first server batches and loads the next page without duplicate rows', async () => {
    const { wrapper } = await mountPage()
    expect(mocks.getAdminList).toHaveBeenCalledWith('orders', expect.objectContaining({ page: 1, per_page: 40, sort_by: 'created_at', sort_direction: 'desc' }))
    const scroll = wrapper.get('[data-testid="orders-scroll-region"]')
    Object.defineProperties(scroll.element, { scrollHeight: { value: 1000 }, clientHeight: { value: 600 }, scrollTop: { value: 200 } })
    await scroll.trigger('scroll')
    await flushPromises()
    expect(wrapper.findAll('tbody tr[tabindex="0"]')).toHaveLength(3)
    expect(new Set(wrapper.findAll('tbody tr[tabindex="0"]').map((row) => row.text()))).toHaveLength(3)
  })

  it('resets to page one and composes search, status, date and server-side sorting', async () => {
    const { wrapper } = await mountPage()
    await wrapper.get('input[type="search"]').setValue('0900')
    await new Promise((resolve) => setTimeout(resolve, 350))
    await wrapper.get('button[aria-label="Lọc trạng thái"]').trigger('click')
    await flushPromises()
    const pendingOption = [...document.body.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(option => option.textContent?.includes('Chờ xác nhận'))!
    pendingOption.click()
    await flushPromises()
    await wrapper.get('button[aria-label="Lọc ngày đặt"]').trigger('click')
    await flushPromises()
    const dateOption = [...document.body.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(option => option.textContent?.includes('7 ngày gần đây'))!
    dateOption.click()
    await vi.waitFor(() => expect(wrapper.find('table').exists()).toBe(true))
    await wrapper.get('th[aria-sort] button').trigger('click')
    await vi.waitFor(() => expect(mocks.getAdminList).toHaveBeenLastCalledWith('orders', expect.objectContaining({ sort_by: 'order_number' })))
    expect(mocks.getAdminList).toHaveBeenLastCalledWith('orders', expect.objectContaining({ page: 1, keyword: '0900', status: 'pending', date_from: expect.any(String), date_to: expect.any(String), sort_by: 'order_number', sort_direction: 'asc' }))
  })

  it('keeps the current rows visible while a new server sort is loading', async () => {
    const { wrapper } = await mountPage()
    mocks.getAdminList.mockImplementation((module: string, params: Record<string, unknown>) => {
      if (module === 'branches') return Promise.resolve({ items: [], pagination: { current_page: 1, per_page: 100, total: 0, last_page: 1 } })
      if (params.sort_by === 'order_number') return new Promise(() => {})
      return Promise.resolve({ items: [order(1), order(2)], pagination: { current_page: 1, per_page: 40, total: 2, last_page: 1 } })
    })

    await wrapper.get('th[aria-sort] button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('MZ-V2-1')
    expect(wrapper.find('[data-testid="orders-initial-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="orders-background-progress"]').exists()).toBe(true)
  })

  it('uses one custom clear action and resets realtime search immediately', async () => {
    const { wrapper } = await mountPage()
    const search = wrapper.get('input[type="search"]')
    await search.setValue('0900')
    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(wrapper.findAll('button[aria-label="Xóa tìm kiếm"]')).toHaveLength(1)
    await wrapper.get('button[aria-label="Xóa tìm kiếm"]').trigger('click')
    await vi.waitFor(() => expect(mocks.getAdminList).toHaveBeenLastCalledWith('orders', expect.objectContaining({ keyword: undefined, page: 1 })))
    expect(search.element).toHaveProperty('value', '')
  })

  it('copies without opening detail and turns the copy affordance into confirmation', async () => {
    const { wrapper, router } = await mountPage()
    await wrapper.get('button[aria-label="Sao chép mã đơn"]').trigger('click')
    await flushPromises()
    expect(mocks.writeText).toHaveBeenCalledWith('MZ-V2-1')
    expect(wrapper.get('button[aria-label="Đã sao chép mã đơn"]')).toBeDefined()
    expect(router.currentRoute.value.path).toBe('/admin/orders')
    await wrapper.get('tbody tr[tabindex="0"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/orders/1')
  })

  it('persists column visibility while keeping order identity available', async () => {
    const { wrapper } = await mountPage()
    await wrapper.get('button[aria-label="Cột hiển thị"]').trigger('click')
    await flushPromises()
    const paymentCheckbox = [...document.body.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(input => input.parentElement?.textContent?.includes('Thanh toán'))
    expect(paymentCheckbox).toBeDefined()
    paymentCheckbox!.checked = false
    paymentCheckbox!.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    expect(localStorage.getItem('admin.orders.visibleColumns')).not.toContain('payment')
    expect(wrapper.text()).toContain('MZ-V2-1')
  })

  it('uses accessible unified dropdown triggers and closes the column popover outside or on Escape', async () => {
    const { wrapper } = await mountPage()
    for (const label of ['Lọc trạng thái', 'Lọc theo chi nhánh', 'Lọc ngày đặt', 'Cột hiển thị']) {
      const trigger = wrapper.get(`button[aria-label="${label}"]`)
      expect(trigger.attributes('aria-expanded')).toBe('false')
      expect(trigger.find('svg').exists()).toBe(true)
    }

    const columnsTrigger = wrapper.get('button[aria-label="Cột hiển thị"]')
    await columnsTrigger.trigger('click')
    await flushPromises()
    expect(columnsTrigger.attributes('aria-expanded')).toBe('true')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }))
    await flushPromises()
    expect(columnsTrigger.attributes('aria-expanded')).toBe('false')

    await columnsTrigger.trigger('click')
    await flushPromises()
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(columnsTrigger.attributes('aria-expanded')).toBe('false')
  })

  it('renders compact nowrap status, payment method before state, mobile rows and lazy images', async () => {
    const { wrapper } = await mountPage()
    expect(wrapper.text()).not.toContain('Theo dõi và xử lý')
    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.get('thead').classes()).not.toContain('uppercase')
    expect(wrapper.get('table').classes()).toEqual(expect.arrayContaining(['w-max', 'table-fixed', 'min-w-full']))
    expect(wrapper.get('colgroup').html()).toContain('w-[20rem]')
    expect(wrapper.get('[data-testid="orders-toolbar-shell"]').classes()).toContain('orders-rounded-shell')
    expect(wrapper.get('[data-testid="orders-table-shell"]').classes()).toEqual(expect.arrayContaining(['orders-rounded-shell', 'md:flex']))
    expect(wrapper.get('[data-testid="orders-scroll-region"]').classes()).toEqual(expect.arrayContaining(['min-h-0', 'flex-1', 'overflow-auto']))
    expect(wrapper.get('[data-testid="orders-scroll-region"]').classes()).not.toContain('rounded-2xl')
    expect(wrapper.get('[data-testid="orders-scroll-region"]').element.parentElement).toBe(wrapper.get('[data-testid="orders-table-shell"]').element)
    expect(wrapper.get('[data-testid="orders-scroll-region"]').classes().some(value => value.startsWith('max-h-'))).toBe(false)
    const statusCell = wrapper.findAll('tbody td').find((cell) => cell.text().includes('Chờ xác nhận'))!
    expect(statusCell.find('span.inline-flex').classes()).toContain('whitespace-nowrap')
    const paymentCell = wrapper.findAll('tbody td').find((cell) => cell.text().includes('VNPay'))!
    expect(paymentCell.text().indexOf('VNPay')).toBeLessThan(paymentCell.text().indexOf('Đã thanh toán'))
    expect(wrapper.get('[data-testid="orders-mobile-list"]').text()).toContain('MZ-V2-1')
    expect(wrapper.get('img[alt="Serum 1"]').attributes()).toMatchObject({ loading: 'lazy', decoding: 'async' })
  })

  it('offers one completed commercial status instead of competing delivered filters', async () => {
    const { wrapper } = await mountPage()
    await wrapper.get('button[aria-label="Lọc trạng thái"]').trigger('click')
    await flushPromises()
    const options = [...document.body.querySelectorAll<HTMLElement>('[role="radio"]')].map(option => option.textContent?.trim())
    expect(options).toContain('Hoàn thành')
    expect(options).not.toContain('Đã giao')
  })
})
