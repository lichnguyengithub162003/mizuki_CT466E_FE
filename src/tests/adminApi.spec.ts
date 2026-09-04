import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), request: vi.fn(), csrf: vi.fn() }))
vi.mock('@/api/clients', () => ({ apiClient: { get: mocks.get, post: mocks.post, request: mocks.request } }))
vi.mock('@/api/csrf', () => ({ ensureCsrfCookie: mocks.csrf }))

import { adjustInventory, createAdminRecord, deleteAdminCatalog, getAdminDetail, getAdminList, getAdminOrderCounts, runAppointmentAction, runOrderAction, runRefundAction, updateAdminRecord, uploadAdminImage } from '@/api/adminApi'

describe('admin API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.csrf.mockResolvedValue(undefined)
    mocks.request.mockResolvedValue({ data: { data: { id: 1 } } })
    mocks.post.mockResolvedValue({ data: { data: { path: 'admin-media/a.webp', url: '/storage/admin-media/a.webp', mime_type: 'image/webp', size: 10 } } })
  })

  it('unwraps the paginated envelope and preserves snake_case meta', async () => {
    mocks.get.mockResolvedValue({ data: { data: [{ id: 1 }], meta: { pagination: { current_page: 2, per_page: 15, total: 20, last_page: 2 } } } })
    await expect(getAdminList('orders', { keyword: 'MZ', page: 2, per_page: 15 })).resolves.toEqual({ items: [{ id: 1 }], pagination: { current_page: 2, per_page: 15, total: 20, last_page: 2 } })
    expect(mocks.get).toHaveBeenCalledWith('/admin/orders', { params: { keyword: 'MZ', page: 2, per_page: 15 } })
  })

  it('maps detail resources without inventing endpoints', async () => {
    mocks.get.mockResolvedValue({ data: { data: { id: 9, order_number: 'MZ-9' } } })
    await getAdminDetail('orders', 9)
    expect(mocks.get).toHaveBeenCalledWith('/admin/orders/9')
  })

  it('loads lightweight order counts from the dedicated endpoint', async () => {
    mocks.get.mockResolvedValue({ data: { data: { pending: 4, processing: 2, shipping: 1, refund: 0 } } })
    await expect(getAdminOrderCounts()).resolves.toEqual({ pending: 4, processing: 2, shipping: 1, refund: 0 })
    expect(mocks.get).toHaveBeenCalledWith('/admin/orders/counts')
  })

  it('maps catalog search and review visibility to their verified request names', async () => {
    mocks.get.mockResolvedValue({ data: { data: [], meta: { pagination: { current_page: 1, per_page: 15, total: 0, last_page: 1 } } } })
    await getAdminList('products', { keyword: 'serum', category_id: 2 })
    expect(mocks.get).toHaveBeenLastCalledWith('/admin/products', { params: { search: 'serum', category_id: 2 } })
    await getAdminList('reviews', { keyword: 'dịu nhẹ', status: 'hidden' })
    expect(mocks.get).toHaveBeenLastCalledWith('/admin/reviews', { params: { search: 'dịu nhẹ', visibility: 'hidden' } })
  })

  it('does not send unsupported delivery or payment filters to the order endpoint', async () => {
    mocks.get.mockResolvedValue({ data: { data: [], meta: { pagination: { current_page: 1, per_page: 15, total: 0, last_page: 1 } } } })
    await getAdminList('orders', { delivery_method: 'delivery', payment_status: 'paid', page: 1 })
    expect(mocks.get).toHaveBeenCalledWith('/admin/orders', { params: { page: 1 } })
  })

  it('sends server-side shipment queue filters to the order endpoint', async () => {
    mocks.get.mockResolvedValue({ data: { data: [], meta: { pagination: { current_page: 1, per_page: 15, total: 0, last_page: 1 } } } })
    await getAdminList('orders', { shipping_only: 1, shipment_status: 'in_transit' })
    expect(mocks.get).toHaveBeenCalledWith('/admin/orders', { params: { shipping_only: 1, shipment_status: 'in_transit' } })
  })

  it.each([
    ['confirm', '/admin/orders/4/confirm'],
    ['create_shipment', '/admin/orders/4/shipment'],
    ['cancel_shipment', '/admin/orders/4/shipment/cancel'],
    ['shipment_label', '/admin/orders/4/shipment/label'],
    ['shipment_simulate_picked', '/admin/orders/4/shipment/simulate/picked'],
    ['shipment_simulate_delivering', '/admin/orders/4/shipment/simulate/delivering'],
    ['shipment_simulate_delivered', '/admin/orders/4/shipment/simulate/delivered'],
    ['shipment_simulate_delivery_failed', '/admin/orders/4/shipment/simulate/delivery-fail'],
    ['shipment_simulate_waiting_return', '/admin/orders/4/shipment/simulate/waiting-to-return'],
    ['shipment_simulate_returned', '/admin/orders/4/shipment/simulate/returned'],
    ['confirm_cod_payment', '/admin/orders/4/payment/cod/confirm'],
  ])('maps order action %s to backend route', async (action, endpoint) => {
    await runOrderAction(4, action)
    expect(mocks.request).toHaveBeenCalledWith({ method: 'post', url: endpoint, data: undefined })
  })

  it('sends exact refund and appointment payloads', async () => {
    await runRefundAction(2, 'wallet_payout')
    expect(mocks.request).toHaveBeenCalledWith({ method: 'post', url: '/admin/refunds/2/wallet-payout', data: undefined })
    await runRefundAction(2, 'manual_settlement', { settlement_reference: 'QA-REF-1' })
    expect(mocks.request).toHaveBeenLastCalledWith({ method: 'post', url: '/admin/refunds/2/manual-settlement', data: { settlement_reference: 'QA-REF-1' } })
    await runAppointmentAction(3, 'assign_technician', { technician_id: 8 })
    expect(mocks.request).toHaveBeenLastCalledWith({ method: 'post', url: '/admin/appointments/3/assign-technician', data: { technician_id: 8 } })
  })

  it('uses delta-only inventory adjustment', async () => {
    await adjustInventory(7, { quantity_delta: -2, reason: 'Kiểm kê' })
    expect(mocks.request).toHaveBeenCalledWith({ method: 'post', url: '/admin/inventory/7/adjust', data: { quantity_delta: -2, reason: 'Kiểm kê' } })
  })

  it('uses POST for create and PATCH for supported updates', async () => {
    await createAdminRecord('customers', { name: 'Khách QA', email: 'customer@example.test' })
    await updateAdminRecord('customers', 5, { phone: '0900000000' })
    expect(mocks.request).toHaveBeenNthCalledWith(1, { method: 'post', url: '/admin/customers', data: { name: 'Khách QA', email: 'customer@example.test' } })
    expect(mocks.request).toHaveBeenNthCalledWith(2, { method: 'patch', url: '/admin/customers/5', data: { phone: '0900000000' } })
    expect(mocks.csrf).toHaveBeenCalledTimes(2)
  })

  it('only exposes dependency-safe catalog delete endpoints', async () => {
    await deleteAdminCatalog('products', 7)
    await deleteAdminCatalog('categories', 8)
    await deleteAdminCatalog('brands', 9)
    expect(mocks.request).toHaveBeenNthCalledWith(1, { method: 'delete', url: '/admin/products/7', data: undefined })
    expect(mocks.request).toHaveBeenNthCalledWith(2, { method: 'delete', url: '/admin/categories/8', data: undefined })
    expect(mocks.request).toHaveBeenNthCalledWith(3, { method: 'delete', url: '/admin/brands/9', data: undefined })
  })

  it('uploads admin images as multipart after CSRF initialization', async () => {
    const file = new File(['image'], 'qa.webp', { type: 'image/webp' })
    await uploadAdminImage(file)
    expect(mocks.post).toHaveBeenCalledWith('/admin/media/images', expect.any(FormData))
    expect(mocks.csrf).toHaveBeenCalled()
  })
})
