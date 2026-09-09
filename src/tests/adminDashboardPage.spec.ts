/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage.vue'
import AdminLoginPage from '@/pages/admin/AdminLoginPage.vue'
import { createAppRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { pinia as appPinia } from '@/stores/pinia'
import type { AuthenticatedUser } from '@/types/auth'

const mocks = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  getAdminList: vi.fn(),
  getCurrentUser: vi.fn(),
  staffLogin: vi.fn(),
}))

vi.mock('@/api/adminApi', () => ({
  getDashboard: mocks.getDashboard,
  getAdminList: mocks.getAdminList,
}))

vi.mock('@/api/auth/authApi', () => ({
  getCurrentUser: mocks.getCurrentUser,
  staffLogin: mocks.staffLogin,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))

const adminUser: AuthenticatedUser = {
  id: 1,
  name: 'QA Admin',
  email: 'qa.admin@example.test',
  phone: null,
  avatar: null,
  role: 'super_admin',
  role_label: 'Quản trị viên',
  branch_id: null,
  email_verified_at: '2026-09-01T00:00:00Z',
  created_at: '2026-08-01T00:00:00Z',
}

const branchManager: AuthenticatedUser = {
  ...adminUser,
  id: 2,
  role: 'branch_manager',
  role_label: 'Quản lý chi nhánh',
  branch_id: 7,
}

const dashboardPayload = {
  summary: {
    revenue: 12_500_000,
    orders: 38,
    pending_orders: 6,
    appointments: 11,
    pending_refunds: 2,
    customers: 31,
  },
  revenue_series: [
    { date: '2026-09-07', revenue: 4_000_000, orders: 12 },
    { date: '2026-09-08', revenue: 3_500_000, orders: 10 },
    { date: '2026-09-09', revenue: 5_000_000, orders: 16 },
  ],
  payment_methods: [{ method: 'vnpay', count: 9, amount: 8_000_000 }],
  top_products: [
    { product_id: 21, product_name: 'Sản phẩm thực từ API', quantity: 18, revenue: 7_200_000, image_url: '/storage/product-21.webp' },
    { product_id: 22, product_name: 'Sản phẩm thực thứ hai', quantity: 11, revenue: 4_100_000, image_url: null },
  ],
}

function appointmentThisWeek() {
  const now = new Date()
  const weekday = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - weekday + 1)
  monday.setHours(10, 0, 0, 0)
  const end = new Date(monday)
  end.setHours(11, 0, 0, 0)
  return {
    id: 41,
    appointment_number: 'APT-REAL-041',
    status: 'confirmed',
    status_label: 'Đã xác nhận',
    customer: { id: 18, name: 'Khách từ API', phone: '0900000000' },
    branch: { id: 7, name: 'Chi nhánh từ API', code: 'API-7' },
    service: { id: 5, name: 'Dịch vụ từ API', duration_minutes: 60 },
    technician: { id: 9, name: 'Kỹ thuật viên từ API' },
    starts_at: monday.toISOString(),
    ends_at: end.toISOString(),
  }
}

const wrappers: VueWrapper[] = []

async function mountDashboard(user: AuthenticatedUser = adminUser): Promise<VueWrapper> {
  const pinia = createPinia()
  useAuthStore(pinia).$patch({ user, isInitialized: true })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/dashboard', component: AdminDashboardPage }],
  })
  await router.push('/admin/dashboard')
  await router.isReady()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  const wrapper = mount(AdminDashboardPage, {
    global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient }]] },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

async function mountLogin(path: string) {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/login', component: AdminLoginPage },
      { path: '/admin/dashboard', component: { template: '<main>Dashboard</main>' } },
      { path: '/admin/refunds', component: { template: '<main>Refunds</main>' } },
      { path: '/forbidden', component: { template: '<main>Forbidden</main>' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(AdminLoginPage, { attachTo: document.body, global: { plugins: [pinia, router] } })
  wrappers.push(wrapper)
  return { wrapper, router }
}

async function chooseStatisticsPeriod(wrapper: VueWrapper, label: string): Promise<void> {
  await wrapper.get('button[aria-label="Khoảng thời gian thống kê"]').trigger('click')
  const option = wrapper.get('[data-testid="statistics-period-menu"]').findAll('[role="menuitemradio"]')
    .find((item) => item.text().includes(label))
  expect(option).toBeDefined()
  await option!.trigger('click')
  await flushPromises()
}

function appointmentCalls(): unknown[][] {
  return mocks.getAdminList.mock.calls.filter(([module]) => module === 'appointments')
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  document.body.innerHTML = ''
  useAuthStore(appPinia).resetForTesting()
  mocks.getCurrentUser.mockResolvedValue(adminUser)
  mocks.staffLogin.mockResolvedValue(adminUser)
  mocks.getDashboard.mockResolvedValue(structuredClone(dashboardPayload))
  mocks.getAdminList.mockImplementation((module: string) => {
    if (module === 'branches') return Promise.resolve({
      items: [
        { id: 7, name: 'Chi nhánh từ API', code: 'API-7', is_active: true },
        { id: 8, name: 'Chi nhánh thứ hai', code: 'API-8', is_active: false },
      ],
      pagination: { current_page: 1, per_page: 100, total: 2, last_page: 1 },
    })
    if (module === 'inventory') return Promise.resolve({ items: [], pagination: { current_page: 1, per_page: 1, total: 3, last_page: 3 } })
    return Promise.resolve({ items: [appointmentThisWeek()], pagination: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })
  })
})

afterEach(() => {
  vi.useRealTimers()
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  useAuthStore(appPinia).resetForTesting()
})

describe('Admin Dashboard V2 routing', () => {
  it('resolves the canonical dashboard route and redirects /admin to it', async () => {
    useAuthStore(appPinia).$patch({ user: adminUser, isInitialized: true })
    const router = createAppRouter(createMemoryHistory())

    expect(router.resolve('/admin/dashboard').name).toBe('admin-dashboard')
    await router.push('/admin')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/admin/dashboard')
  })

  it('redirects an authenticated admin away from login to the dashboard', async () => {
    useAuthStore(appPinia).$patch({ user: adminUser, isInitialized: true })
    const router = createAppRouter(createMemoryHistory())
    await router.push('/admin/login')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('admin-dashboard')
  })

  it('uses dashboard as the login fallback while preserving a safe admin redirect', async () => {
    const direct = await mountLogin('/admin/login')
    await direct.wrapper.get('#staff-email').setValue('admin@example.test')
    await direct.wrapper.get('#staff-password').setValue('password')
    await direct.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(direct.router.currentRoute.value.path).toBe('/admin/dashboard')

    direct.wrapper.unmount()
    wrappers.splice(wrappers.indexOf(direct.wrapper), 1)
    document.body.innerHTML = ''
    const protectedRoute = await mountLogin('/admin/login?redirect=/admin/refunds')
    await protectedRoute.wrapper.get('#staff-email').setValue('admin@example.test')
    await protectedRoute.wrapper.get('#staff-password').setValue('password')
    await protectedRoute.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(protectedRoute.router.currentRoute.value.path).toBe('/admin/refunds')
  })
})

describe('Admin Dashboard V2 page', () => {
  it('renders real-shaped summary metrics and mini visuals from the dashboard response', async () => {
    const wrapper = await mountDashboard()

    expect(wrapper.get('[data-testid="admin-dashboard"]').get('h1').text()).toBe('Tổng quan')
    expect(wrapper.findAll('[data-testid="dashboard-stat-card"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('12.500.000')
    expect(wrapper.text()).toContain('38')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.get('[data-testid="dashboard-stats"]').text()).toContain('Phiếu nhập chờ duyệt')
    expect(wrapper.get('[data-testid="dashboard-stats"]').text()).toContain('3 sản phẩm sắp hết hàng')
    expect(wrapper.get('[data-testid="dashboard-stats"]').text()).not.toContain('Lịch hẹn')
    expect(wrapper.findAll('[data-testid="stat-sparkline"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="stat-current-indicator"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="dashboard-stats"]').text()).not.toMatch(/[+-]?\d+(?:[,.]\d+)?%/)
    expect(mocks.getDashboard).toHaveBeenCalledWith({ branch_id: undefined })
    expect(mocks.getAdminList).toHaveBeenCalledWith('inventory', expect.objectContaining({ low_stock: true }))
  })

  it('keeps the revenue subtitle aligned with every statistics period', async () => {
    const wrapper = await mountDashboard()
    const revenueCard = () => wrapper.findAll('[data-testid="dashboard-stat-card"]')[0]!

    expect(revenueCard().text()).toContain('Doanh thu từ các thanh toán thành công')
    expect(revenueCard().text()).not.toContain('Thanh toán thành công trong tuần')

    await chooseStatisticsPeriod(wrapper, '7 ngày gần đây')
    expect(revenueCard().text()).toContain('Thanh toán thành công trong 7 ngày gần đây')

    await chooseStatisticsPeriod(wrapper, '1 tháng gần đây')
    expect(revenueCard().text()).toContain('Thanh toán thành công trong 1 tháng gần đây')

    await chooseStatisticsPeriod(wrapper, 'Chọn ngày')
    await wrapper.get('input[aria-label="Ngày thống kê"]').setValue('2026-09-09')
    expect(revenueCard().text()).toContain('Thanh toán thành công ngày 09/09/2026')

    await chooseStatisticsPeriod(wrapper, 'Chọn khoảng thời gian')
    await wrapper.get('input[aria-label="Thống kê từ ngày"]').setValue('2026-09-01')
    await wrapper.get('input[aria-label="Thống kê đến ngày"]').setValue('2026-09-09')
    expect(revenueCard().text()).toContain('Thanh toán thành công từ 01/09/2026 đến 09/09/2026')
  })

  it('defaults statistics to all time, offers every period, and sends supported date filters', async () => {
    const wrapper = await mountDashboard()
    const trigger = wrapper.get('button[aria-label="Khoảng thời gian thống kê"]')
    expect(trigger.text()).toContain('Toàn bộ thời gian')
    await trigger.trigger('click')
    const menu = wrapper.get('[data-testid="statistics-period-menu"]')
    for (const label of ['Toàn bộ thời gian', '7 ngày gần đây', '1 tháng gần đây', 'Chọn ngày', 'Chọn khoảng thời gian']) {
      expect(menu.text()).toContain(label)
    }

    await menu.findAll('[role="menuitemradio"]').find((option) => option.text().includes('7 ngày gần đây'))!.trigger('click')
    await flushPromises()
    expect(mocks.getDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ date_from: expect.any(String), date_to: expect.any(String) }))

    await trigger.trigger('click')
    await wrapper.get('[data-testid="statistics-period-menu"]').findAll('[role="menuitemradio"]').find((option) => option.text().includes('Chọn ngày'))!.trigger('click')
    expect(wrapper.find('input[aria-label="Ngày thống kê"]').exists()).toBe(true)
  })

  it('keeps statistics period independent from calendar week navigation', async () => {
    const wrapper = await mountDashboard()
    const dashboardCalls = mocks.getDashboard.mock.calls.length
    await wrapper.get('button[aria-label="Tuần sau"]').trigger('click')
    await flushPromises()
    expect(mocks.getDashboard).toHaveBeenCalledTimes(dashboardCalls)
    expect(mocks.getAdminList).toHaveBeenCalledWith('appointments', expect.objectContaining({ appointment_date: expect.any(String) }))
  })

  it('renders the weekly clinic calendar with real appointment content and controls', async () => {
    const wrapper = await mountDashboard()

    expect(wrapper.get('[data-testid="clinic-calendar"]').text()).toContain('Lịch hẹn clinic')
    expect(wrapper.findAll('[data-testid="calendar-event"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="calendar-event"]').text()).toContain('Khách từ API')
    expect(wrapper.get('[data-testid="calendar-event"]').text()).toContain('Dịch vụ từ API')
    expect(wrapper.find('button[aria-label="Tuần trước"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Tuần sau"]').exists()).toBe(true)
    const dayLabels = wrapper.findAll('[data-testid="calendar-day-label"]')
    expect(dayLabels).toHaveLength(7)
    const weekdays = wrapper.findAll('[data-testid="calendar-weekday"]')
    const dates = wrapper.findAll('[data-testid="calendar-date"]')
    expect(weekdays).toHaveLength(7)
    expect(dates).toHaveLength(7)
    expect(weekdays.every((label) => /^(?:THỨ [2-7]|CN)$/.test(label.text()))).toBe(true)
    expect(dates.every((label) => label.classes().includes('whitespace-nowrap'))).toBe(true)
    expect(dates.every((label) => /^\d{2}\/\d{2}$/.test(label.text()))).toBe(true)
    expect(mocks.getAdminList).toHaveBeenCalledWith('appointments', expect.objectContaining({
      appointment_date: expect.any(String),
      per_page: 100,
    }))
  })

  it('uses shrink-safe desktop columns and keeps calendar overflow internal to narrow screens', () => {
    const source = readFileSync('src/pages/admin/AdminDashboardPage.vue', 'utf8')

    expect(source).toContain('xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]')
    expect(source).toContain('min-w-[42rem] xl:min-w-0')
    expect(source).toContain('<aside class="grid min-w-0 content-start gap-4">')
    expect(source).not.toContain('minmax(18rem,0.8fr)')
    expect(source).not.toContain('min-w-[48rem]')
  })

  it('loads every real branch into both independent super-admin selectors', async () => {
    const wrapper = await mountDashboard()
    const dashboardTrigger = wrapper.get('[data-testid="dashboard-branch-trigger"]')
    const clinicTrigger = wrapper.get('[data-testid="clinic-branch-trigger"]')

    expect(dashboardTrigger.text()).toContain('Tất cả chi nhánh')
    expect(clinicTrigger.text()).toContain('Tất cả chi nhánh')
    await dashboardTrigger.trigger('click')
    expect(wrapper.get('[data-testid="dashboard-branch-menu"]').text()).toContain('Chi nhánh từ API')
    expect(wrapper.get('[data-testid="dashboard-branch-menu"]').text()).toContain('Chi nhánh thứ hai')
    await clinicTrigger.trigger('click')
    expect(wrapper.find('[data-testid="dashboard-branch-menu"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="clinic-branch-menu"]').text()).toContain('Chi nhánh từ API')
    expect(wrapper.get('[data-testid="clinic-branch-menu"]').text()).toContain('Chi nhánh thứ hai')
    expect(wrapper.find('[data-testid="dashboard-branch-picker"] select').exists()).toBe(false)
    expect(wrapper.find('[data-testid="clinic-branch-picker"] select').exists()).toBe(false)
    document.body.click()
    await nextTick()
    expect(wrapper.find('[data-testid="clinic-branch-menu"]').exists()).toBe(false)
    await dashboardTrigger.trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('[data-testid="dashboard-branch-menu"]').exists()).toBe(false)
    expect(mocks.getAdminList).toHaveBeenCalledWith('branches', { per_page: 100 })
  })

  it('keeps dashboard and clinic branch scopes independent', async () => {
    const wrapper = await mountDashboard()
    const dashboardTrigger = wrapper.get('[data-testid="dashboard-branch-trigger"]')
    const clinicTrigger = wrapper.get('[data-testid="clinic-branch-trigger"]')

    await dashboardTrigger.trigger('click')
    await wrapper.findAll('[data-testid="dashboard-branch-option"]').find((option) => option.text().includes('Chi nhánh từ API'))!.trigger('click')
    await flushPromises()
    expect(mocks.getDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ branch_id: 7 }))
    expect(clinicTrigger.text()).toContain('Tất cả chi nhánh')
    expect(mocks.getAdminList).toHaveBeenCalledWith('appointments', expect.objectContaining({ branch_id: undefined }))
    expect(wrapper.get('[data-testid="top-products"]').text()).toContain('Sản phẩm thực từ API')

    await clinicTrigger.trigger('click')
    await wrapper.findAll('[data-testid="clinic-branch-option"]').find((option) => option.text().includes('Chi nhánh thứ hai'))!.trigger('click')
    await flushPromises()
    expect(dashboardTrigger.text()).toContain('Chi nhánh từ API')
    expect(clinicTrigger.text()).toContain('Chi nhánh thứ hai')
    expect(mocks.getDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ branch_id: 7 }))
    expect(mocks.getAdminList).toHaveBeenCalledWith('appointments', expect.objectContaining({ branch_id: 8 }))
  })

  it('starts all seven supported daily appointment requests concurrently', async () => {
    let releaseAppointments: (() => void) | undefined
    const gate = new Promise<void>((resolve) => { releaseAppointments = resolve })
    mocks.getAdminList.mockImplementation((module: string) => {
      if (module === 'branches') return Promise.resolve({ items: [], pagination: { current_page: 1, per_page: 100, total: 0, last_page: 1 } })
      if (module === 'inventory') return Promise.resolve({ items: [], pagination: { current_page: 1, per_page: 1, total: 0, last_page: 1 } })
      return gate.then(() => ({ items: [], pagination: { current_page: 1, per_page: 100, total: 0, last_page: 1 } }))
    })

    await mountDashboard()
    expect(appointmentCalls()).toHaveLength(7)
    releaseAppointments?.()
    await flushPromises()
  })

  it('reuses a cached clinic week and isolates calendar fetching from business filters', async () => {
    const wrapper = await mountDashboard()
    expect(appointmentCalls()).toHaveLength(7)

    await chooseStatisticsPeriod(wrapper, '7 ngày gần đây')
    expect(appointmentCalls()).toHaveLength(7)

    await wrapper.get('[data-testid="dashboard-branch-trigger"]').trigger('click')
    await wrapper.findAll('[data-testid="dashboard-branch-option"]').find((option) => option.text().includes('Chi nhánh từ API'))!.trigger('click')
    await flushPromises()
    expect(appointmentCalls()).toHaveLength(7)

    await wrapper.get('button[aria-label="Tuần sau"]').trigger('click')
    await flushPromises()
    expect(appointmentCalls()).toHaveLength(14)
    await wrapper.get('button[aria-label="Tuần trước"]').trigger('click')
    await flushPromises()
    expect(appointmentCalls()).toHaveLength(14)

    await wrapper.get('[data-testid="clinic-branch-trigger"]').trigger('click')
    await wrapper.findAll('[data-testid="clinic-branch-option"]').find((option) => option.text().includes('Chi nhánh thứ hai'))!.trigger('click')
    await flushPromises()
    expect(appointmentCalls()).toHaveLength(21)
  })

  it('keeps a stale clinic response from replacing the latest branch selection', async () => {
    let resolveAll!: (value: { items: ReturnType<typeof appointmentThisWeek>[]; pagination: { current_page: number; per_page: number; total: number; last_page: number } }) => void
    let resolveBranch!: (value: { items: ReturnType<typeof appointmentThisWeek>[]; pagination: { current_page: number; per_page: number; total: number; last_page: number } }) => void
    const allRequest = new Promise<Parameters<typeof resolveAll>[0]>((resolve) => { resolveAll = resolve })
    const branchRequest = new Promise<Parameters<typeof resolveBranch>[0]>((resolve) => { resolveBranch = resolve })
    mocks.getAdminList.mockImplementation((module: string, params?: { branch_id?: number }) => {
      if (module === 'branches') return Promise.resolve({
        items: [{ id: 8, name: 'Chi nhánh mới nhất', code: 'LATEST', is_active: true }],
        pagination: { current_page: 1, per_page: 100, total: 1, last_page: 1 },
      })
      if (module === 'inventory') return Promise.resolve({ items: [], pagination: { current_page: 1, per_page: 1, total: 0, last_page: 1 } })
      return params?.branch_id === 8 ? branchRequest : allRequest
    })
    const wrapper = await mountDashboard()
    await wrapper.get('[data-testid="clinic-branch-trigger"]').trigger('click')
    await wrapper.findAll('[data-testid="clinic-branch-option"]').find((option) => option.text().includes('Chi nhánh mới nhất'))!.trigger('click')
    await nextTick()

    const latestAppointment = { ...appointmentThisWeek(), id: 88, customer: { id: 88, name: 'Khách mới nhất', phone: '0900000088' }, branch: { id: 8, name: 'Chi nhánh mới nhất', code: 'LATEST' } }
    resolveBranch({ items: [latestAppointment], pagination: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })
    await flushPromises()
    expect(wrapper.get('[data-testid="clinic-calendar"]').text()).toContain('Khách mới nhất')

    const staleAppointment = { ...appointmentThisWeek(), id: 77, customer: { id: 77, name: 'Khách cũ không được ghi đè', phone: '0900000077' } }
    resolveAll({ items: [staleAppointment], pagination: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })
    await flushPromises()
    expect(wrapper.get('[data-testid="clinic-calendar"]').text()).toContain('Khách mới nhất')
    expect(wrapper.get('[data-testid="clinic-calendar"]').text()).not.toContain('Khách cũ không được ghi đè')
  })

  it('shows static assigned branch context without a selector for branch managers', async () => {
    const wrapper = await mountDashboard(branchManager)

    expect(wrapper.find('[data-testid="dashboard-branch-trigger"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="clinic-branch-trigger"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="dashboard-branch-context"]').text()).toContain('Chi nhánh từ API')
    expect(wrapper.get('[data-testid="clinic-branch-context"]').text()).toContain('Chi nhánh từ API')
    expect(wrapper.text()).not.toContain('Tất cả chi nhánh')
    expect(mocks.getDashboard).toHaveBeenCalledWith(expect.objectContaining({ branch_id: undefined }))
  })

  it('opens calendar focus mode and keeps inside clicks from closing it', async () => {
    const wrapper = await mountDashboard()
    await wrapper.get('[data-testid="calendar-expand"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="clinic-calendar"]').attributes('data-focus-mode')).toBe('true')
    expect(wrapper.find('[data-testid="calendar-focus-backdrop"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="calendar-focus-close"]').exists()).toBe(true)
    await wrapper.get('[data-testid="clinic-calendar"]').trigger('click')
    expect(wrapper.get('[data-testid="clinic-calendar"]').attributes('data-focus-mode')).toBe('true')
  })

  it('closes calendar focus mode with X, Escape, and backdrop', async () => {
    const wrapper = await mountDashboard()
    vi.useFakeTimers()
    const finishClose = async () => {
      vi.advanceTimersByTime(300)
      await nextTick()
      expect(wrapper.get('[data-testid="clinic-calendar"]').attributes('data-focus-mode')).toBe('false')
    }

    await wrapper.get('[data-testid="calendar-expand"]').trigger('click')
    await wrapper.get('[data-testid="calendar-focus-close"]').trigger('click')
    await finishClose()

    await wrapper.get('[data-testid="calendar-expand"]').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await finishClose()

    await wrapper.get('[data-testid="calendar-expand"]').trigger('click')
    await wrapper.get('[data-testid="calendar-focus-backdrop"]').trigger('click')
    await finishClose()
    vi.useRealTimers()
  })

  it('renders top five products from the branch-aware dashboard response', async () => {
    const wrapper = await mountDashboard()
    const panel = wrapper.get('[data-testid="top-products"]')
    const asideChildren = wrapper.get('aside').element.children
    expect(panel.text()).toContain('Top 5 sản phẩm bán chạy')
    expect(panel.findAll('[data-testid="top-product-row"]')).toHaveLength(2)
    expect(panel.text()).toContain('18 đã bán')
    expect(asideChildren[0]?.getAttribute('data-testid')).toBe('appointment-insights-group')
    expect(asideChildren[1]?.getAttribute('data-testid')).toBe('top-products')
    expect(wrapper.get('[data-testid="appointment-insights-group"]').classes()).toContain('xl:grid-cols-2')

    await wrapper.get('[data-testid="dashboard-branch-trigger"]').trigger('click')
    await wrapper.findAll('[data-testid="dashboard-branch-option"]').find((option) => option.text().includes('Chi nhánh từ API'))!.trigger('click')
    await flushPromises()
    expect(mocks.getDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ branch_id: 7 }))
  })

  it('keeps the calendar grid visible with an honest empty state and no fake runtime data', async () => {
    mocks.getDashboard.mockResolvedValue({
      ...structuredClone(dashboardPayload),
      summary: { revenue: 0, orders: 0, pending_orders: 0, appointments: 0, pending_refunds: 0, customers: 0 },
      revenue_series: [],
      top_products: [],
    })
    mocks.getAdminList.mockImplementation((module: string) => Promise.resolve(module === 'branches'
      ? { items: [], pagination: { current_page: 1, per_page: 100, total: 0, last_page: 1 } }
      : { items: [], pagination: { current_page: 1, per_page: 100, total: 0, last_page: 1 } }))
    const wrapper = await mountDashboard()

    expect(wrapper.get('[data-testid="calendar-scroll-region"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="calendar-empty"]').text()).toBe('Chưa có lịch hẹn trong khoảng thời gian này.')
    expect(wrapper.find('[data-testid="calendar-event"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="top-products-empty"]').text()).toBe('Chưa có dữ liệu sản phẩm bán chạy trong kỳ này.')

    const source = readFileSync('src/pages/admin/AdminDashboardPage.vue', 'utf8')
    expect(source).not.toMatch(/Số liệu demo|Demo only|12,4%|1\.248|Khách hàng mẫu|Mizuki Ninh Kiều/)
  })
})
