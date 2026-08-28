import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VnPayReturnPage from '@/pages/customer/VnPayReturnPage.vue'
import { persistVnPayReturnContext } from '@/utils/vnpay'

const paymentApiMocks = vi.hoisted(() => ({
  verifyVnPayReturn: vi.fn(), getCustomerOrderPayment: vi.fn(), createVnPayPaymentUrl: vi.fn(),
}))
const orderApiMocks = vi.hoisted(() => ({ getCustomerOrder: vi.fn() }))
const navigationMocks = vi.hoisted(() => ({ redirectToVnPay: vi.fn() }))

vi.mock('@/api/paymentApi', () => paymentApiMocks)
vi.mock('@/api/orderApi', () => orderApiMocks)
vi.mock('@/utils/vnpay', async () => ({
  ...(await vi.importActual<typeof import('@/utils/vnpay')>('@/utils/vnpay')),
  redirectToVnPay: navigationMocks.redirectToVnPay,
}))

const wrappers: ReturnType<typeof mount>[] = []

async function mountPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  const wrapper = mount(VnPayReturnPage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
      stubs: {
        CustomerLayout: { template: '<div><slot /></div>' },
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
      },
    },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  window.sessionStorage.clear()
  window.history.replaceState({}, '', '/payment/vnpay/return?vnp_TxnRef=UNTRUSTED&vnp_ResponseCode=24')
  persistVnPayReturnContext({ orderId: 901, orderNumber: 'MZ-AUTH', paymentNumber: 'PAY-AUTH' })
  paymentApiMocks.verifyVnPayReturn.mockReset().mockResolvedValue({
    paymentNumber: 'PAY-AUTH', reportedStatus: 'paid', orderNumber: 'MZ-AUTH', amount: 475000,
  })
  paymentApiMocks.getCustomerOrderPayment.mockReset().mockResolvedValue({
    paymentNumber: 'PAY-AUTH', method: 'vnpay', status: 'paid', statusLabel: 'Đã thu tiền', amount: 475000,
    paidAt: '2026-08-28T12:00:00Z', provider: 'vnpay', providerTransactionId: '14567890',
  })
  paymentApiMocks.createVnPayPaymentUrl.mockReset().mockResolvedValue({
    paymentUrl: 'https://sandbox.vnpayment.vn/pay?signed=2', expiresAt: '2026-08-28T12:30:00Z', paymentNumber: 'PAY-AUTH',
  })
  orderApiMocks.getCustomerOrder.mockReset().mockResolvedValue({
    id: 901, orderNumber: 'MZ-AUTH', status: 'pending', statusLabel: 'Chờ xác nhận', deliveryMethod: 'pickup',
    paymentMethod: 'vnpay', paymentStatus: 'paid', paymentStatusLabel: 'Đã thu tiền', payment: null,
    branch: { id: 6, name: 'Mizuki Vĩnh Long', address: 'Vĩnh Long' }, deliveryAddress: null, shipment: null,
    items: [], subtotal: 500000, discountAmount: 25000, shippingFee: 0, totalAmount: 475000,
    cancellation: null, refund: null, placedAt: null, cancelledAt: null, createdAt: null, updatedAt: null,
  })
  navigationMocks.redirectToVnPay.mockReset()
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  window.sessionStorage.clear()
})

describe('VNPay return page', () => {
  it('ignores query-string status and renders paid payment while the order remains pending', async () => {
    const wrapper = await mountPage()
    expect(paymentApiMocks.verifyVnPayReturn).toHaveBeenCalledWith('?vnp_TxnRef=UNTRUSTED&vnp_ResponseCode=24')
    expect(paymentApiMocks.getCustomerOrderPayment).toHaveBeenCalledWith(901)
    expect(wrapper.get('[data-vnpay-result-title]').text()).toBe('Thanh toán thành công')
    expect(wrapper.text()).toContain('Đơn hàng')
    expect(wrapper.text()).toContain('Chờ xác nhận')
    expect(wrapper.get('[data-authoritative-payment-status]').text()).toBe('Đã thu tiền')
    expect(wrapper.find('[data-retry-vnpay]').exists()).toBe(false)
  })

  it('retries a failed payment on the same order without creating another order', async () => {
    paymentApiMocks.getCustomerOrderPayment.mockResolvedValueOnce({
      paymentNumber: 'PAY-AUTH', method: 'vnpay', status: 'failed', statusLabel: 'Thanh toán thất bại', amount: 475000,
      paidAt: null, provider: 'vnpay', providerTransactionId: null,
    })
    const wrapper = await mountPage()
    await wrapper.get('[data-retry-vnpay]').trigger('click')
    await flushPromises()
    expect(paymentApiMocks.createVnPayPaymentUrl).toHaveBeenCalledWith(901)
    expect(navigationMocks.redirectToVnPay).toHaveBeenCalledWith('https://sandbox.vnpayment.vn/pay?signed=2')
  })
})
