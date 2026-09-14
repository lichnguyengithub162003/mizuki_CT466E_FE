import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminDomainTable from '@/components/admin/AdminDomainTable.vue'
import type { AdminModule, AdminRecord } from '@/types/admin'

async function render(module: AdminModule, row: AdminRecord) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  const wrapper = mount(AdminDomainTable, { props: { module, rows: [row], detailBase: `/admin/${module}` }, global: { plugins: [router] } })
  await router.isReady()
  return wrapper
}

describe('Admin domain-specific presentation', () => {
  it('renders product identity and thumbnail without order-shaped fields', async () => {
    const wrapper = await render('products', { id: 1, name: 'Serum Mizuki', slug: 'serum-mizuki', image_url: '/serum.jpg', category: { name: 'Tinh chất' }, brand: { name: 'Mizuki Lab' }, variant_count: 2, is_active: true })
    expect(wrapper.text()).toContain('Serum Mizuki')
    expect(wrapper.text()).toContain('Tinh chất')
    expect(wrapper.get('img[alt="Serum Mizuki"]').attributes('src')).toBe('/serum.jpg')
    expect(wrapper.text()).not.toContain('Thanh toán')
  })

  it.each([
    ['categories', { id: 2, name: 'Chăm sóc da', slug: 'cham-soc-da', parent: { name: 'Mỹ phẩm' }, product_count: 12, is_active: true }, 'Danh mục cha'],
    ['brands', { id: 3, name: 'Mizuki Lab', slug: 'mizuki-lab', logo_url: '/logo.png', product_count: 8, is_active: true }, 'Thương hiệu'],
    ['customers', { id: 4, name: 'Nguyễn An', email: 'an@example.test', phone: '0900000000', order_count: 3, appointment_count: 2, created_at: '2026-08-01T00:00:00Z' }, 'Khách hàng'],
    ['staff', { id: 5, name: 'Lê Quản Lý', email: 'staff@example.test', phone: '0911111111', role: 'branch_manager', role_label: 'Quản lý chi nhánh', branch: { name: 'Mizuki Cái Răng' } }, 'Vai trò'],
    ['appointments', { id: 6, appointment_number: 'APT-006', status: 'confirmed', status_label: 'Đã xác nhận', customer: { name: 'Mai' }, service: { name: 'Chăm sóc chuyên sâu', duration_minutes: 60 }, branch: { name: 'Mizuki Cái Răng' }, technician: { name: 'KTV Linh' }, starts_at: '2026-08-29T09:00:00+07:00', ends_at: '2026-08-29T10:00:00+07:00' }, 'Kỹ thuật viên'],
    ['branches', { id: 7, code: 'CR', name: 'Mizuki Cái Răng', address: 'Cần Thơ', phone: '0292000000', branch_type: 'hybrid', branch_type_label: 'Kết hợp', is_active: true }, 'Mizuki Cái Răng'],
    ['reviews', { id: 8, rating: 5, title: 'Rất dịu da', comment: 'Sản phẩm phù hợp với da nhạy cảm.', is_visible: true, customer: { name: 'Khách QA' }, product: { name: 'Serum Mizuki' }, created_at: '2026-08-20T00:00:00Z' }, 'Sản phẩm phù hợp với da nhạy cảm.'],
  ] as const)('renders %s with its own identity', async (module, row, expected) => {
    const wrapper = await render(module, row as AdminRecord)
    expect(wrapper.text()).toContain(expected)
    expect(wrapper.text()).not.toContain('ORDER-QA-SHAPE')
  })
})
