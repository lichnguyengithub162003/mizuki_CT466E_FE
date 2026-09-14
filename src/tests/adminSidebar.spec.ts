/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchPreferenceStore } from '@/stores/branchPreference'
import type { AuthenticatedUser } from '@/types/auth'
import type { AdminNavigationKey } from '@/types/layout/adminNavigation'

const wrappers: VueWrapper[] = []

const adminUser: AuthenticatedUser = {
  id: 7,
  name: 'Nguyễn Quản Trị Với Tên Rất Dài',
  email: 'admin.with.a.long.address@mizuki.vn',
  phone: null,
  avatar: null,
  role: 'branch_manager',
  role_label: 'Quản lý chi nhánh',
  branch_id: 5,
  email_verified_at: '2026-09-01T00:00:00Z',
  created_at: '2026-08-01T00:00:00Z',
}

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<main />' } }],
  })
}

async function mountSidebar(options: { collapsed?: boolean; activeKey?: AdminNavigationKey } = {}) {
  const pinia = createPinia()
  const router = createTestRouter()
  await router.push('/admin/orders')
  await router.isReady()
  useAuthStore(pinia).$patch({ user: { ...adminUser }, isInitialized: true })
  useBranchPreferenceStore(pinia).$patch({
    branches: [{
      id: 5,
      code: 'MZ-CT',
      name: 'Mizuki Cần Thơ',
      address: 'Cần Thơ',
      phone: null,
      email: null,
      is_active: true,
      opening_hours: [],
    }, {
      id: 6,
      code: 'MZ-VL',
      name: 'Mizuki Vĩnh Long',
      address: 'Vĩnh Long',
      phone: null,
      email: null,
      is_active: true,
      opening_hours: [],
    }],
    selectedBranchId: 5,
    status: 'success',
    error: null,
  })
  const wrapper = mount(AdminSidebar, {
    attachTo: document.body,
    props: {
      collapsed: options.collapsed ?? false,
      activeKey: options.activeKey ?? 'orders',
    },
    global: {
      plugins: [pinia, router],
      stubs: {
        AdminOrderPendingBadge: { props: ['compact'], template: '<span data-testid="admin-orders-pending-badge" class="bg-rose-600">12</span>' },
        AdminRefundPendingBadge: { props: ['compact'], template: '<span data-testid="admin-refunds-pending-badge" class="bg-rose-600">3</span>' },
      },
    },
  })
  wrappers.push(wrapper)
  return { wrapper, router, pinia }
}

function groupButton(wrapper: VueWrapper, id: string) {
  return wrapper.get(`[data-testid="admin-nav-group-${id}"] > button`)
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('AdminSidebar premium navigation', () => {
  it('uses the customer MIZUKI wordmark treatment and dashboard navigation', async () => {
    const { wrapper } = await mountSidebar()
    const wordmark = wrapper.get('[data-testid="admin-wordmark"]')

    expect(wordmark.text()).toBe('MIZUKI')
    expect(wordmark.get('span').classes()).toContain('customer-wordmark')
    expect(wordmark.get('span').classes()).toContain('admin-wordmark')
    expect(wordmark.get('span').classes().some((className) => className.startsWith('text-['))).toBe(false)
    expect(readFileSync('src/components/layout/AdminSidebar.vue', 'utf8')).toContain('font-size: x-large')
    expect(wordmark.attributes('href')).toBe('/admin/dashboard')
    const collapse = wrapper.get('button[aria-label="Thu gọn thanh bên"]')
    expect(collapse.element).toBeDefined()
    expect(collapse.get('svg').classes()).toContain('size-3.5')
    expect(collapse.classes()).toContain('ring-black/[0.04]')
  })

  it('renders the assigned branch as a strictly non-interactive information card', async () => {
    const { wrapper, pinia } = await mountSidebar()
    useBranchPreferenceStore(pinia).$patch({ selectedBranchId: 6 })
    await nextTick()
    const branch = wrapper.get('[data-testid="working-branch"]')

    expect(branch.text()).toContain('Chi nhánh đang làm việc')
    expect(branch.text()).toContain('Mizuki Cần Thơ')
    expect(branch.text()).not.toContain('Mizuki Vĩnh Long')
    expect(branch.attributes('aria-label')).toBe('Chi nhánh đang làm việc: Mizuki Cần Thơ')
    expect(branch.element.tagName).toBe('DIV')
    expect(branch.attributes('aria-haspopup')).toBeUndefined()
    expect(branch.attributes('aria-expanded')).toBeUndefined()
    expect(wrapper.find('[data-testid="working-branch-menu"]').exists()).toBe(false)
    expect(branch.findAll('svg')).toHaveLength(1)
    expect(branch.find('[data-testid="working-branch-fallback-icon"]').exists()).toBe(true)
  })

  it('renders the system-wide context for a super administrator', async () => {
    const { wrapper, pinia } = await mountSidebar()
    useAuthStore(pinia).$patch({ user: { ...adminUser, role: 'super_admin', branch_id: null } })
    await nextTick()
    const branch = wrapper.get('[data-testid="working-branch"]')

    expect(branch.text()).toContain('Toàn hệ thống')
    expect(branch.attributes('aria-label')).toBe('Chi nhánh đang làm việc: Toàn hệ thống')
    expect(branch.find('[data-testid="working-branch-fallback-icon"]').exists()).toBe(true)
  })

  it('uses a safe neutral branch label when an assignment cannot be resolved', async () => {
    const { wrapper, pinia } = await mountSidebar()
    useBranchPreferenceStore(pinia).$patch({ branches: [] })
    await nextTick()

    expect(wrapper.get('[data-testid="working-branch"]').text()).toContain('Chưa xác định chi nhánh')
  })

  it('renders six rounded disclosure group boxes', async () => {
    const { wrapper } = await mountSidebar()
    const groups = wrapper.findAll('section[data-testid^="admin-nav-group-"]')

    expect(groups).toHaveLength(6)
    expect(groups.every((group) => group.classes().includes('rounded-2xl'))).toBe(true)
    expect(groups.map((group) => group.get('button').text().trim())).toEqual([
      'Bán hàng', 'Đặt lịch', 'Khách hàng', 'Sản phẩm', 'Marketing', 'Hệ thống',
    ])
  })

  it('opens the active group by default and lets an inactive group expand and collapse', async () => {
    const { wrapper } = await mountSidebar({ activeKey: 'orders' })
    const sales = groupButton(wrapper, 'sales')
    const products = groupButton(wrapper, 'products')

    expect(sales.attributes('aria-expanded')).toBe('true')
    expect(products.attributes('aria-expanded')).toBe('false')
    await products.trigger('click')
    expect(products.attributes('aria-expanded')).toBe('true')
    await products.trigger('click')
    expect(products.attributes('aria-expanded')).toBe('false')
  })

  it('lets the active group collapse manually and reopens the next active route group', async () => {
    const { wrapper } = await mountSidebar({ activeKey: 'orders' })
    const sales = groupButton(wrapper, 'sales')

    await sales.trigger('click')
    expect(sales.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('a[href="/admin/orders"]').attributes('aria-current')).toBe('page')
    await wrapper.setProps({ activeKey: 'products' })
    await nextTick()
    expect(groupButton(wrapper, 'products').attributes('aria-expanded')).toBe('true')
    expect(sales.attributes('aria-expanded')).toBe('false')
  })

  it('makes group controls and nested navigation options visually distinct', async () => {
    const { wrapper } = await mountSidebar({ activeKey: 'orders' })
    const group = wrapper.get('[data-testid="admin-nav-group-sales"]')
    const header = group.get(':scope > button')
    const child = group.get('a[href="/admin/refunds"]')

    expect(header.classes()).toEqual(expect.arrayContaining(['min-h-11', 'px-3', 'font-semibold', 'bg-primary-50/90']))
    expect(header.get('svg').classes()).toContain('size-4')
    expect(child.classes()).toEqual(expect.arrayContaining(['min-h-10', 'ml-3', 'mr-1', 'px-3', 'font-normal']))
    expect(child.get('svg').classes()).toContain('size-3.5')
  })

  it('gives the complete inactive option row an obvious hover below the active strength', async () => {
    const { wrapper } = await mountSidebar({ activeKey: 'orders' })
    const inactive = wrapper.get('a[href="/admin/refunds"]')
    const active = wrapper.get('a[href="/admin/orders"]')

    expect(inactive.classes()).toEqual(expect.arrayContaining([
      'hover:bg-primary-100/70', 'hover:text-primary-900', 'transition-colors', 'duration-150',
    ]))
    expect(inactive.classes()).not.toContain('bg-primary-700')
    expect(active.classes()).toEqual(expect.arrayContaining(['bg-primary-700', 'text-white']))
    expect(active.classes()).not.toContain('hover:bg-primary-100/70')
  })

  it('uses a strong green, white, semibold active row and reacts to route state', async () => {
    const { wrapper } = await mountSidebar({ activeKey: 'orders' })
    let active = wrapper.get('a[aria-current="page"]')

    expect(active.text()).toContain('Đơn hàng')
    expect(active.classes()).toEqual(expect.arrayContaining(['bg-primary-700', 'text-white', 'font-semibold']))
    await wrapper.setProps({ activeKey: 'reviews' })
    await nextTick()
    active = wrapper.get('a[aria-current="page"]')
    expect(active.text()).toContain('Đánh giá')
    expect(groupButton(wrapper, 'marketing').attributes('aria-expanded')).toBe('true')
  })

  it('preserves real count component slots and right-aligned red badge layout', async () => {
    const { wrapper } = await mountSidebar({ activeKey: 'orders' })
    const orderLink = wrapper.get('a[href="/admin/orders"]')
    const refundLink = wrapper.get('a[href="/admin/refunds"]')

    expect(orderLink.get('[data-testid="admin-orders-pending-badge"]').text()).toBe('12')
    expect(refundLink.get('[data-testid="admin-refunds-pending-badge"]').text()).toBe('3')
    expect(orderLink.get('span.min-w-0').classes()).toContain('flex-1')
    expect(orderLink.classes()).toContain('px-3')
  })

  it('keeps the account footer outside the only scrolling navigation region', async () => {
    const { wrapper } = await mountSidebar()
    const scroll = wrapper.get('[data-testid="admin-sidebar-navigation-scroll"]')
    const footer = wrapper.get('[data-testid="admin-account-footer"]')

    expect(scroll.classes()).toEqual(expect.arrayContaining(['flex-1', 'overflow-y-auto']))
    expect(scroll.find('[data-testid="admin-account-footer"]').exists()).toBe(false)
    expect(footer.element.parentElement).toBe(wrapper.get('aside').element)
    const source = readFileSync('src/components/layout/AdminSidebar.vue', 'utf8')
    expect(source).toContain('scrollbar-width: none')
    expect(source).toContain('::-webkit-scrollbar')
  })

  it('shows authenticated identity and opens a safe account menu', async () => {
    const { wrapper } = await mountSidebar()
    const trigger = wrapper.get('[data-testid="admin-account-trigger"]')

    expect(trigger.text()).toContain(adminUser.name)
    expect(trigger.text()).toContain(adminUser.email)
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    const menu = wrapper.get('[data-testid="admin-account-menu"]')
    expect(menu.classes()).toEqual(expect.arrayContaining([
      'account-popup', 'absolute', 'rounded-2xl', 'bg-white', 'p-2',
      'ring-1', 'ring-black/[0.05]', 'shadow-[0_12px_40px_rgba(15,23,42,0.14)]',
    ]))
    const source = readFileSync('src/components/layout/AdminSidebar.vue', 'utf8')
    expect(source).toContain('left: calc(100% + 0.75rem)')
    expect(source).toContain('bottom: 0')
    expect(source).toContain('width: 14rem')
    expect(menu.text()).toContain('Đăng xuất')
    const profile = menu.get('button[disabled]')
    expect(profile.text()).toBe('Hồ sơ cá nhân')
    expect(profile.classes()).toEqual(expect.arrayContaining(['cursor-not-allowed', 'gap-2.5', 'px-3', 'py-2.5', 'opacity-60']))
    expect(profile.find('svg').exists()).toBe(true)
    const logout = menu.findAll('button').find((button) => button.text().includes('Đăng xuất'))
    expect(logout).toBeDefined()
    expect(logout?.classes()).toEqual(expect.arrayContaining([
      'text-rose-600', 'hover:bg-rose-50', 'hover:text-rose-700', 'px-3', 'py-2.5',
    ]))
    expect(trigger.text()).toContain(adminUser.name)
    expect(trigger.text()).toContain(adminUser.email)
    await trigger.trigger('click')
    expect(wrapper.find('[data-testid="admin-account-menu"]').exists()).toBe(false)
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('closes the account popup with Escape', async () => {
    const { wrapper } = await mountSidebar()
    await wrapper.get('[data-testid="admin-account-trigger"]').trigger('click')
    expect(wrapper.find('[data-testid="admin-account-menu"]').exists()).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('[data-testid="admin-account-menu"]').exists()).toBe(false)
  })

  it('provides compact accessible brand, branch, navigation, badges, and avatar states', async () => {
    const { wrapper } = await mountSidebar({ collapsed: true, activeKey: 'refunds' })

    expect(wrapper.get('aside').classes()).toContain('w-20')
    expect(wrapper.get('[data-testid="admin-wordmark"]').text()).toBe('M')
    expect(wrapper.get('[data-testid="working-branch"]').attributes('title')).toBe('Mizuki Cần Thơ')
    expect(wrapper.get('a[aria-label="Hoàn tiền"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get('a[aria-label="Hoàn tiền"]').classes()).toEqual(expect.arrayContaining(['bg-primary-700', 'text-white']))
    expect(() => wrapper.get('[data-testid="admin-refunds-pending-badge"]')).not.toThrow()
    expect(wrapper.get('[data-testid="admin-account-trigger"]').attributes('aria-label')).toContain(adminUser.name)
    expect(wrapper.get('[data-testid="admin-account-trigger"]').text()).not.toContain(adminUser.email)
  })

  it('removes the old portal copy and uppercase section-heading treatment', async () => {
    const { wrapper } = await mountSidebar()
    const source = readFileSync('src/components/layout/AdminSidebar.vue', 'utf8')

    expect(wrapper.text()).not.toContain('Admin Portal')
    expect(wrapper.text()).not.toContain('ADMIN')
    expect(source).not.toMatch(/uppercase\s+tracking-wider/)
    expect(wrapper.find('p.uppercase').exists()).toBe(false)
  })
})
