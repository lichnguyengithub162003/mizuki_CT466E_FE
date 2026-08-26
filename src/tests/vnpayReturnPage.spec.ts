import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import VnPayReturnPage from '@/pages/customer/VnPayReturnPage.vue'

const vnpayApiMocks = vi.hoisted(() => ({
  initiateCustomerVnPayPayment: vi.fn(),
  verifyVnPayReturn: vi.fn(),
  getCustomerOrderPayment: vi.fn(),
  redirectToVnPay: vi.fn(),
}))
vi.mock('@/api/vnpayApi', () => vnpayApiMocks)

const context = {
  orderId: 901,
  orderNumber: 'MZ-20260826-0901',
  paymentNumber: 'PAY-20260826-ABC12345',
  expiresAt: '2026-08-26T12:15:00+07:00',
}
const verifiedReturn = {
  paymentNumber: context.paymentNumber,
  status: 'paid',
  orderNumber: context.orderNumber,
  amount: 519_000,
  responseCode: '00',
}
const paidPayment = {
  paymentNumber: context.paymentNumber,
  method: 'vnpay',
  status: 'paid',
  statusLabel: 'Đã thanh toán',
  amount: 519_000,
  paidAt: '2026-08-26T05:05:00Z',
  provider: 'vnpay',
  providerTransactionId: '14567890',
}

let wrapper: VueWrapper | undefined

async function mountReturnPage(): Promise<VueWrapper> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/payment/vnpay/return', component: VnPayReturnPage },
      { path: '/products', name: 'products', component: { template: '<div />' } },
    ],
  })
  await router.push('/payment/vnpay/return')
  await router.isReady()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  wrapper = mount(VnPayReturnPage, {
    attachTo: document.body,
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
      stubs: {
        CustomerLayout: { template: '<div><slot /></div>' },
      },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  window.sessionStorage.clear()
  window.sessionStorage.setItem('mizuki:vnpay:payment-context', JSON.stringify(context))
  window.history.replaceState({}, '', '/payment/vnpay/return?vnp_TxnRef=PAY-1&vnp_SecureHash=signed')
  vnpayApiMocks.verifyVnPayReturn.mockReset().mockResolvedValue({ ...verifiedReturn })
  vnpayApiMocks.getCustomerOrderPayment.mockReset().mockResolvedValue({ ...paidPayment })
  vnpayApiMocks.initiateCustomerVnPayPayment.mockReset()
  vnpayApiMocks.redirectToVnPay.mockReset()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  window.sessionStorage.clear()
  vi.useRealTimers()
})

describe('VNPay return page', () => {
  it('shows success only after signed-return verification and authoritative paid status', async () => {
    const page = await mountReturnPage()

    expect(vnpayApiMocks.verifyVnPayReturn)
      .toHaveBeenCalledWith('?vnp_TxnRef=PAY-1&vnp_SecureHash=signed')
    expect(vnpayApiMocks.getCustomerOrderPayment).toHaveBeenCalledWith(901)
    expect(page.get('[data-vnpay-paid]').text()).toContain(context.orderNumber)
    expect(page.get('[data-vnpay-paid]').text()).toContain('519.000')
    expect(window.sessionStorage.getItem('mizuki:vnpay:payment-context')).toBeNull()
  })

  it('does not show success while authoritative status remains pending and bounds polling', async () => {
    vi.useFakeTimers()
    vnpayApiMocks.getCustomerOrderPayment.mockResolvedValue({
      ...paidPayment,
      status: 'pending',
      statusLabel: 'Chờ thanh toán',
      paidAt: null,
    })
    const page = await mountReturnPage()
    expect(page.find('[data-vnpay-paid]').exists()).toBe(false)
    expect(page.text()).toContain('Đang xác nhận thanh toán')

    for (let index = 0; index < 6; index += 1) {
      await vi.advanceTimersByTimeAsync(2_000)
      await flushPromises()
    }

    expect(vnpayApiMocks.getCustomerOrderPayment).toHaveBeenCalledTimes(5)
    expect(page.find('[data-vnpay-paid]').exists()).toBe(false)
  })

  it('uses one generic unsuccessful state and retries the existing order', async () => {
    vnpayApiMocks.verifyVnPayReturn.mockResolvedValueOnce({
      ...verifiedReturn,
      status: 'failed',
      responseCode: '24',
    })
    vnpayApiMocks.getCustomerOrderPayment.mockResolvedValueOnce({
      ...paidPayment,
      status: 'failed',
      statusLabel: 'Thanh toán thất bại',
      paidAt: null,
    })
    vnpayApiMocks.initiateCustomerVnPayPayment.mockResolvedValueOnce({
      paymentUrl: 'https://pay.example.test/vnpay/retry-from-backend',
      expiresAt: '2026-08-26T12:30:00+07:00',
      paymentNumber: context.paymentNumber,
    })
    const page = await mountReturnPage()

    expect(page.get('[data-vnpay-failed]').text())
      .toBe('Thanh toán chưa thành công. Bạn có thể thử lại.')
    expect(page.text()).not.toMatch(/đã hủy|hết hạn/i)
    await page.get('[data-retry-vnpay]').trigger('click')
    await flushPromises()

    expect(vnpayApiMocks.initiateCustomerVnPayPayment).toHaveBeenCalledWith(901)
    expect(vnpayApiMocks.redirectToVnPay)
      .toHaveBeenCalledWith('https://pay.example.test/vnpay/retry-from-backend')
  })

  it('never presents success when backend verification fails and allows checking again', async () => {
    vnpayApiMocks.verifyVnPayReturn
      .mockRejectedValueOnce(new Error('Chưa xác minh được chữ ký VNPay.'))
      .mockResolvedValueOnce({ ...verifiedReturn })
    const page = await mountReturnPage()

    expect(page.find('[data-vnpay-paid]').exists()).toBe(false)
    expect(page.get('[data-vnpay-verification-error]').text())
      .toContain('Chưa xác minh được chữ ký VNPay.')
    await page.get('[data-check-vnpay-again]').trigger('click')
    await flushPromises()

    expect(vnpayApiMocks.verifyVnPayReturn).toHaveBeenCalledTimes(2)
    expect(page.find('[data-vnpay-paid]').exists()).toBe(true)
  })
})
