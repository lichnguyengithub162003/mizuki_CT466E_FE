import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminOrderPendingBadge from '@/components/admin/AdminOrderPendingBadge.vue'

const mocks = vi.hoisted(() => ({ getAdminOrderCounts: vi.fn() }))
vi.mock('@/api/adminApi', async (original) => ({
  ...(await original()),
  getAdminOrderCounts: mocks.getAdminOrderCounts,
}))

async function render(pending: number) {
  mocks.getAdminOrderCounts.mockResolvedValue({ pending, processing: 0, shipping: 0, refund: 0 })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(AdminOrderPendingBadge, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
  await flushPromises()
  return wrapper
}

describe('Admin order pending badge', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is hidden when no order is waiting for confirmation', async () => {
    const wrapper = await render(0)
    expect(wrapper.find('[data-testid="admin-orders-pending-badge"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it.each([[7, '7'], [99, '99'], [125, '99+']])('renders %s pending orders as %s', async (pending, label) => {
    const wrapper = await render(pending)
    expect(wrapper.get('[data-testid="admin-orders-pending-badge"]').text()).toBe(label)
    expect(wrapper.get('[data-testid="admin-orders-pending-badge"]').attributes('aria-label')).toContain(String(pending))
    wrapper.unmount()
  })
})
