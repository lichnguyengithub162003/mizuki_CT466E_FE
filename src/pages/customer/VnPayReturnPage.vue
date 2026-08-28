<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Clock3, XCircle } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { verifyVnPayReturn } from '@/api/paymentApi'
import { useCreateVnPayPaymentUrlMutation, useCustomerOrderPaymentQuery } from '@/queries/payments'
import { useCustomerOrderQuery } from '@/queries/orders'
import type { VerifiedVnPayReturn } from '@/types/payments'
import { persistVnPayReturnContext, readVnPayReturnContext, redirectToVnPay } from '@/utils/vnpay'

const verifiedReturn = ref<VerifiedVnPayReturn | null>(null)
const verificationPending = ref(true)
const verificationError = ref('')
const redirectError = ref('')
const returnContext = computed(() => verifiedReturn.value
  ? readVnPayReturnContext(verifiedReturn.value.paymentNumber)
  : null)
const orderId = computed(() => returnContext.value?.orderId ?? null)
const paymentQuery = useCustomerOrderPaymentQuery(orderId)
const orderQuery = useCustomerOrderQuery(orderId)
const retryMutation = useCreateVnPayPaymentUrlMutation()
const payment = computed(() => paymentQuery.data.value)
const order = computed(() => orderQuery.data.value)
const canRetry = computed(() => payment.value?.status === 'failed' && order.value?.status === 'pending')

const state = computed<'checking' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'error'>(() => {
  if (verificationError.value || (verifiedReturn.value && !returnContext.value) || paymentQuery.isError.value) return 'error'
  if (verificationPending.value || !payment.value || payment.value.status === 'pending') return 'checking'
  return payment.value.status
})

const title = computed(() => ({
  checking: 'Đang kiểm tra thanh toán',
  paid: 'Thanh toán thành công',
  failed: 'Thanh toán thất bại',
  cancelled: 'Thanh toán đã bị hủy',
  refunded: 'Giao dịch đã được hoàn tiền',
  error: 'Chưa thể xác minh thanh toán',
})[state.value])

const description = computed(() => {
  if (state.value === 'checking') return 'Mizuki đang đọc trạng thái thanh toán authoritative từ máy chủ.'
  if (state.value === 'paid') return 'Khoản thanh toán đã được ghi nhận. Đơn hàng vẫn được xử lý theo trạng thái riêng.'
  if (state.value === 'failed') return canRetry.value
    ? 'VNPay chưa hoàn tất giao dịch. Bạn có thể thử lại trên chính đơn hàng này.'
    : 'VNPay chưa hoàn tất giao dịch và trạng thái đơn hàng hiện tại không cho phép thử lại.'
  if (state.value === 'cancelled') return 'Giao dịch đã bị hủy và không được ghi nhận thanh toán.'
  if (state.value === 'refunded') return 'Khoản thanh toán của đơn hàng đã được hoàn lại.'
  return verificationError.value || 'Không thể đọc trạng thái thanh toán authoritative. Vui lòng mở chi tiết đơn hàng để kiểm tra.'
})

onMounted(async () => {
  try {
    verifiedReturn.value = await verifyVnPayReturn(window.location.search)
    if (!returnContext.value) verificationError.value = 'Không tìm thấy ngữ cảnh đơn hàng cho giao dịch VNPay đã xác minh.'
  } catch (error) {
    verificationError.value = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Callback VNPay không hợp lệ.'
  } finally {
    verificationPending.value = false
  }
})

async function retryPayment(): Promise<void> {
  const context = returnContext.value
  if (!context || !canRetry.value) return
  redirectError.value = ''
  try {
    const result = await retryMutation.mutateAsync(context.orderId)
    persistVnPayReturnContext({ ...context, paymentNumber: result.paymentNumber })
    redirectToVnPay(result.paymentUrl)
  } catch (error) {
    redirectError.value = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Không thể tạo lại phiên thanh toán VNPay.'
  }
}
</script>

<template>
  <CustomerLayout :hide-floating-utilities="true">
    <main class="grid min-h-[70svh] place-items-center bg-[#f7faf8] px-4 py-10" data-vnpay-return-page>
      <section class="w-full max-w-xl rounded-3xl border border-primary-100 bg-white p-6 text-center shadow-sm sm:p-8">
        <span class="mx-auto grid size-16 place-items-center rounded-full"
          :class="state === 'paid' ? 'bg-emerald-100 text-emerald-700' : state === 'checking' ? 'bg-blue-100 text-blue-700' : 'bg-[#fff1ef] text-[#a64038]'">
          <CheckCircle2 v-if="state === 'paid'" class="size-8" aria-hidden="true" />
          <Clock3 v-else-if="state === 'checking'" class="size-8" aria-hidden="true" />
          <XCircle v-else-if="state === 'failed' || state === 'cancelled'" class="size-8" aria-hidden="true" />
          <AlertTriangle v-else class="size-8" aria-hidden="true" />
        </span>
        <h1 class="mt-5 text-heading-2 text-primary-950" data-vnpay-result-title>{{ title }}</h1>
        <p class="mt-2 text-body-md leading-6 text-text-secondary">{{ description }}</p>

        <dl v-if="verifiedReturn" class="mt-6 grid gap-3 rounded-2xl bg-primary-50 p-4 text-left text-body-sm">
          <div class="flex justify-between gap-4"><dt class="text-text-secondary">Mã đơn hàng</dt><dd class="font-semibold">{{ verifiedReturn.orderNumber }}</dd></div>
          <div v-if="order" class="flex justify-between gap-4"><dt class="text-text-secondary">Đơn hàng</dt><dd class="font-semibold" data-authoritative-order-status>{{ order.statusLabel }}</dd></div>
          <div v-if="payment" class="flex justify-between gap-4"><dt class="text-text-secondary">Thanh toán</dt><dd class="font-semibold" data-authoritative-payment-status>{{ payment.statusLabel }}</dd></div>
        </dl>

        <p v-if="redirectError" class="mt-4 rounded-xl bg-destructive/10 p-3 text-body-sm text-destructive" role="alert">{{ redirectError }}</p>
        <button
          v-if="canRetry"
          type="button"
          class="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
          :disabled="retryMutation.isPending.value"
          data-retry-vnpay
          @click="retryPayment"
        >
          {{ retryMutation.isPending.value ? 'Đang mở VNPay...' : 'Thanh toán lại qua VNPay' }}
        </button>
        <RouterLink
          v-if="returnContext"
          :to="{ name: ROUTE_NAMES.customerOrderDetail, params: { id: returnContext.orderId } }"
          class="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-primary-200 px-5 font-semibold text-primary-800"
        >
          Xem chi tiết đơn hàng
        </RouterLink>
        <RouterLink
          :to="{ name: ROUTE_NAMES.products }"
          class="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 font-semibold text-primary-700"
        >
          Tiếp tục mua sắm
        </RouterLink>
      </section>
    </main>
  </CustomerLayout>
</template>
