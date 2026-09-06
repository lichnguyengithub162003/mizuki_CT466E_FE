import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminRefundPendingBadge from '@/components/admin/AdminRefundPendingBadge.vue'
import { useAdminMutation } from '@/queries/admin'

const mocks = vi.hoisted(() => ({ getAdminRefundCounts: vi.fn() }))
vi.mock('@/api/adminApi', async (original) => ({ ...(await original()), getAdminRefundCounts: mocks.getAdminRefundCounts }))

async function render(pendingAction: number) {
  mocks.getAdminRefundCounts.mockResolvedValue({ requested: 2, approved_pending_payout: 1, pending_action: pendingAction })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(AdminRefundPendingBadge, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })
  await flushPromises()
  return wrapper
}

describe('Admin refund pending badge', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is hidden when the authoritative work queue is empty', async () => {
    const wrapper = await render(0)
    expect(wrapper.find('[data-testid="admin-refunds-pending-badge"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it.each([[7, '7'], [99, '99'], [125, '99+']])('renders pending_action %s as %s', async (pending, label) => {
    const wrapper = await render(pending)
    const badge = wrapper.get('[data-testid="admin-refunds-pending-badge"]')
    expect(badge.text()).toBe(label)
    expect(badge.attributes('aria-label')).toContain(String(pending))
    wrapper.unmount()
  })

  it('uses the dedicated count query rather than order counts', async () => {
    const wrapper = await render(3)
    expect(mocks.getAdminRefundCounts).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('invalidates refund list, detail and count queries through their shared prefix after mutation', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)
    const Harness = defineComponent({
      setup() {
        const mutation = useAdminMutation<{ id: number }, void>('refunds', async () => ({ id: 1 }))
        return { run: () => mutation.mutateAsync() }
      },
      template: '<button type="button" @click="run">Run</button>',
    })
    const wrapper = mount(Harness, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'refunds'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'dashboard'] })
    wrapper.unmount()
  })
})
