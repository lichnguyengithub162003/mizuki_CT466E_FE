<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Clock3, RefreshCcw } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { redirectToVnPay } from '@/api/vnpayApi'
import { ROUTE_NAMES } from '@/constants/routes'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import {
  clearVnPayPaymentContext,
  loadVnPayPaymentContext,
  saveVnPayPaymentContext,
  useCustomerOrderPaymentMutation,
  useInitiateVnPayPaymentMutation,
  useVerifyVnPayReturnMutation,
} from '@/queries/vnpay'

const MAX_STATUS_CHECKS = 5
const STATUS_POLL_INTERVAL_MS = 2_000
const context = ref(loadVnPayPaymentContext())
const localError = ref('')
const statusChecks = ref(0)
const verifyMutation = useVerifyVnPayReturnMutation()
const paymentMutation = useCustomerOrderPaymentMutation()
const retryMutation = useInitiateVnPayPaymentMutation()
let pollTimer: number | undefined

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

const verifiedReturn = computed(() => verifyMutation.data.value)
const payment = computed(() => paymentMutation.data.value)
const isBusy = computed(() =>
  verifyMutation.isPending.value || paymentMutation.isPending.value,
)
const phase = computed<'processing' | 'paid' | 'failed' | 'error'>(() => {
  if (localError.value || verifyMutation.isError.value || paymentMutation.isError.value) {
    return 'error'
  }
  if (payment.value?.status === 'paid') return 'paid'
  if (payment.value && !['pending', 'paid'].includes(payment.value.status)) return 'failed'
  return 'processing'
})

function errorMessage(error: unknown): string {
  return typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
    ? error.message
    : 'Chưa thể xác minh kết quả thanh toán.'
}

function clearPollTimer(): void {
  if (pollTimer !== undefined) window.clearTimeout(pollTimer)
  pollTimer = undefined
}

async function refreshAuthoritativeStatus(): Promise<void> {
  const paymentContext = context.value
  if (!paymentContext) {
    localError.value = 'Không tìm thấy thông tin đơn hàng để xác minh thanh toán.'
    return
  }
  statusChecks.value += 1
  const result = await paymentMutation.mutateAsync(paymentContext.orderId)
  if (result.paymentNumber !== paymentContext.paymentNumber) {
    localError.value = 'Thông tin thanh toán không khớp với đơn hàng đã tạo.'
    return
  }
  if (result.status === 'paid') {
    clearPollTimer()
    clearVnPayPaymentContext()
    return
  }
  if (result.status === 'pending' && statusChecks.value < MAX_STATUS_CHECKS) {
    clearPollTimer()
    pollTimer = window.setTimeout(() => {
      void refreshAuthoritativeStatus().catch(() => undefined)
    }, STATUS_POLL_INTERVAL_MS)
  }
}

async function verifyAndRefresh(): Promise<void> {
  clearPollTimer()
  localError.value = ''
  statusChecks.value = 0
  verifyMutation.reset()
  paymentMutation.reset()
  const paymentContext = context.value
  if (!paymentContext) {
    localError.value = 'Không tìm thấy thông tin đơn hàng để xác minh thanh toán.'
    return
  }
  try {
    const verified = await verifyMutation.mutateAsync(window.location.search)
    if (
      verified.paymentNumber !== paymentContext.paymentNumber
      || verified.orderNumber !== paymentContext.orderNumber
    ) {
      localError.value = 'Kết quả VNPay không khớp với giao dịch đang chờ.'
      return
    }
    await refreshAuthoritativeStatus()
  } catch (error) {
    localError.value = errorMessage(error)
  }
}

async function retryPayment(): Promise<void> {
  const paymentContext = context.value
  if (!paymentContext || retryMutation.isPending.value) return
  try {
    const initiation = await retryMutation.mutateAsync(paymentContext.orderId)
    const nextContext = {
      ...paymentContext,
      paymentNumber: initiation.paymentNumber,
      expiresAt: initiation.expiresAt,
    }
    context.value = nextContext
    saveVnPayPaymentContext(nextContext)
    redirectToVnPay(initiation.paymentUrl)
  } catch {
    // The normalized mutation error is rendered below.
  }
}

onMounted(() => {
  void verifyAndRefresh()
})
onBeforeUnmount(clearPollTimer)
</script>

<template>
  <CustomerLayout :hide-floating-utilities="true">
    <main class="min-h-[70svh] bg-[#f7faf8] px-4 py-8 sm:px-6" data-vnpay-return-page>
      <section class="mx-auto w-full max-w-xl rounded-3xl border border-primary-100 bg-white p-6 text-center shadow-sm sm:p-8">
        <template v-if="phase === 'paid'">
          <div class="mx-auto grid size-20 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <CheckCircle2 class="size-11" aria-hidden="true" />
          </div>
          <h1 class="mt-5 text-heading-2 text-emerald-800">Thanh toán thành công</h1>
          <p class="mt-2 text-body-sm text-text-secondary">Thanh toán đã được Mizuki xác nhận từ máy chủ.</p>
          <dl class="mt-5 rounded-2xl bg-emerald-50 p-4 text-left text-body-sm" data-vnpay-paid>
            <div class="flex justify-between gap-4"><dt>Mã đơn hàng</dt><dd class="font-semibold">{{ verifiedReturn?.orderNumber }}</dd></div>
            <div class="mt-3 flex justify-between gap-4"><dt>Số tiền</dt><dd class="font-semibold text-emerald-800">{{ currencyFormatter.format(verifiedReturn?.amount ?? payment?.amount ?? 0) }}</dd></div>
          </dl>
        </template>

        <template v-else-if="phase === 'failed'">
          <div class="mx-auto grid size-16 place-items-center rounded-full bg-[#fff3e8] text-[#a65f21]">
            <AlertTriangle class="size-8" aria-hidden="true" />
          </div>
          <h1 class="mt-5 text-heading-2 text-primary-950">Thanh toán chưa thành công</h1>
          <p class="mt-2 text-body-md text-text-secondary" data-vnpay-failed>Thanh toán chưa thành công. Bạn có thể thử lại.</p>
          <button
            type="button"
            class="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50"
            :disabled="retryMutation.isPending.value"
            data-retry-vnpay
            @click="retryPayment"
          >
            <RefreshCcw class="size-4" aria-hidden="true" />
            {{ retryMutation.isPending.value ? 'Đang tạo lại liên kết...' : 'Thử thanh toán lại' }}
          </button>
          <p v-if="retryMutation.isError.value" class="mt-3 text-body-sm text-destructive" role="alert">{{ errorMessage(retryMutation.error.value) }}</p>
        </template>

        <template v-else-if="phase === 'error'">
          <AlertTriangle class="mx-auto size-12 text-[#a65f21]" aria-hidden="true" />
          <h1 class="mt-4 text-heading-2 text-primary-950">Chưa thể xác minh thanh toán</h1>
          <p class="mt-2 text-body-sm text-text-secondary" data-vnpay-verification-error>{{ localError || errorMessage(verifyMutation.error.value ?? paymentMutation.error.value) }}</p>
          <button type="button" class="mt-5 min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" data-check-vnpay-again @click="verifyAndRefresh">Kiểm tra lại</button>
        </template>

        <template v-else>
          <div class="mx-auto grid size-16 place-items-center rounded-full bg-primary-50 text-primary-700">
            <Clock3 class="size-8" aria-hidden="true" />
          </div>
          <h1 class="mt-5 text-heading-2 text-primary-950">Đang xác nhận thanh toán</h1>
          <p class="mt-2 text-body-sm text-text-secondary" data-vnpay-processing>
            {{ isBusy ? 'Mizuki đang kiểm tra trạng thái từ máy chủ.' : 'Giao dịch vẫn đang được xử lý. Bạn có thể kiểm tra lại.' }}
          </p>
          <button v-if="!isBusy" type="button" class="mt-5 min-h-11 rounded-xl border border-primary-200 px-5 font-semibold text-primary-800" data-refresh-vnpay-status @click="refreshAuthoritativeStatus">Kiểm tra trạng thái</button>
        </template>

        <RouterLink :to="{ name: ROUTE_NAMES.products }" class="mt-6 inline-flex min-h-11 items-center justify-center text-body-sm font-semibold text-primary-800 underline underline-offset-4">Tiếp tục mua sắm</RouterLink>
      </section>
    </main>
  </CustomerLayout>
</template>
