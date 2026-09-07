<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, LoaderCircle, MapPin, RefreshCw, Scissors, UserRound } from '@lucide/vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import AppointmentStatusBadge from '@/components/clinic/AppointmentStatusBadge.vue'
import { useCancelCustomerAppointmentMutation, useCustomerAppointmentQuery } from '@/queries/clinic'
import { ROUTE_PATHS } from '@/constants/routes'

const route = useRoute()
const router = useRouter()
const appointmentId = computed(() => {
  const value = Number(route.params.id)
  return Number.isInteger(value) && value > 0 ? value : null
})
const appointmentQuery = useCustomerAppointmentQuery(appointmentId)
const cancelMutation = useCancelCustomerAppointmentMutation()
const confirmCancel = ref(false)
const cancelError = ref<string | null>(null)
const appointment = computed(() => appointmentQuery.data.value)
const canCancel = computed(() => appointment.value?.status === 'pending' || appointment.value?.status === 'confirmed')
const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'short' })

function formatDate(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : dateTime.format(parsed)
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && typeof Reflect.get(error, 'message') === 'string') return Reflect.get(error, 'message') as string
  return 'Không thể hủy lịch hẹn. Vui lòng thử lại.'
}

function safeBack(): void {
  if (typeof window.history.state?.back === 'string') router.back()
  else void router.push(ROUTE_PATHS.customerAppointments)
}

async function cancelAppointment(): Promise<void> {
  if (!appointment.value || cancelMutation.isPending.value) return
  cancelError.value = null
  try {
    await cancelMutation.mutateAsync(appointment.value.id)
    confirmCancel.value = false
  } catch (error) {
    cancelError.value = errorMessage(error)
  }
}
</script>

<template>
  <CustomerLayout>
    <main class="min-h-[70svh] bg-[#f5f7f6]">
      <div class="mx-auto w-full max-w-[90rem] overflow-x-clip px-4 py-6 sm:px-5 md:py-8 lg:px-7">
        <header class="flex items-center gap-3"><button type="button" class="grid size-10 shrink-0 place-items-center rounded-xl text-primary-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label="Quay lại" @click="safeBack"><ArrowLeft class="size-5" aria-hidden="true" /></button><div><p class="text-caption font-semibold uppercase tracking-[0.13em] text-primary-700">Mizuki Clinic</p><h1 class="mt-1 text-heading-1">Chi tiết lịch hẹn</h1></div></header>

        <div v-if="appointmentQuery.isPending.value" class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-label="Đang tải chi tiết lịch hẹn"><div class="h-80 animate-pulse rounded-3xl bg-white"></div><div class="h-64 animate-pulse rounded-3xl bg-white"></div></div>
        <div v-else-if="appointmentQuery.isError.value || !appointment" class="mt-6 rounded-3xl border border-red-200 bg-red-50 p-8 text-center" role="alert"><p class="font-semibold text-red-800">Chưa thể tải chi tiết lịch hẹn.</p><button type="button" class="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-body-sm font-semibold text-red-800" @click="appointmentQuery.refetch()"><RefreshCw class="size-4" aria-hidden="true" />Thử lại</button></div>

        <div v-else class="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="grid gap-5">
            <section class="rounded-3xl bg-white p-5 shadow-[0_10px_32px_rgba(25,52,42,0.06)] ring-1 ring-black/[0.045] md:p-7">
              <div class="flex flex-wrap items-center justify-between gap-3"><AppointmentStatusBadge :status="appointment.status" :label="appointment.status_label" /><span class="text-body-sm font-medium text-text-muted">{{ appointment.appointment_number }}</span></div>
              <h2 class="mt-6 break-words text-heading-2 text-primary-950">{{ appointment.service.name }}</h2>
              <div class="mt-6 grid gap-4 rounded-2xl bg-[#f4f8f6] p-5 sm:grid-cols-2">
                <div class="flex items-start gap-3"><CalendarDays class="mt-0.5 size-5 shrink-0 text-primary-700" aria-hidden="true" /><div><p class="text-caption text-text-muted">Bắt đầu</p><p class="mt-1 font-semibold">{{ formatDate(appointment.starts_at) }}</p></div></div>
                <div class="flex items-start gap-3"><Clock3 class="mt-0.5 size-5 shrink-0 text-primary-700" aria-hidden="true" /><div><p class="text-caption text-text-muted">Kết thúc dự kiến</p><p class="mt-1 font-semibold">{{ formatDate(appointment.ends_at) }}</p></div></div>
                <div class="flex items-start gap-3"><MapPin class="mt-0.5 size-5 shrink-0 text-primary-700" aria-hidden="true" /><div><p class="text-caption text-text-muted">Cơ sở</p><p class="mt-1 font-semibold">{{ appointment.branch.name }}</p></div></div>
                <div class="flex items-start gap-3"><UserRound class="mt-0.5 size-5 shrink-0 text-primary-700" aria-hidden="true" /><div><p class="text-caption text-text-muted">Chuyên viên</p><p class="mt-1 font-semibold">{{ appointment.technician?.name || 'Đang được Mizuki sắp xếp' }}</p></div></div>
              </div>
            </section>

            <section v-if="appointment.customer_note || appointment.staff_note" class="rounded-3xl bg-white p-5 shadow-xs ring-1 ring-black/[0.045] md:p-6"><h2 class="flex items-center gap-2 text-heading-4"><Scissors class="size-5 text-primary-700" aria-hidden="true" />Ghi chú lịch hẹn</h2><dl class="mt-4 grid gap-4 text-body-sm"><div v-if="appointment.customer_note"><dt class="text-text-muted">Ghi chú của bạn</dt><dd class="mt-1 whitespace-pre-wrap font-medium">{{ appointment.customer_note }}</dd></div><div v-if="appointment.staff_note"><dt class="text-text-muted">Ghi chú từ Mizuki</dt><dd class="mt-1 whitespace-pre-wrap font-medium">{{ appointment.staff_note }}</dd></div></dl></section>

            <section v-if="appointment.status === 'completed'" class="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 md:p-6"><div class="flex items-start gap-3"><CheckCircle2 class="size-6 shrink-0 text-emerald-700" aria-hidden="true" /><div><h2 class="font-semibold text-emerald-950">Liệu trình đã hoàn thành</h2><p v-if="formatDate(appointment.completed_at)" class="mt-1 text-body-sm text-emerald-800">{{ formatDate(appointment.completed_at) }}</p><p v-if="appointment.can_review" class="mt-2 text-body-sm text-emerald-800">Bạn có thể đánh giá dịch vụ này từ luồng đánh giá được hỗ trợ.</p></div></div></section>
          </div>

          <aside class="rounded-3xl bg-white p-5 shadow-[0_10px_32px_rgba(25,52,42,0.06)] ring-1 ring-black/[0.045] md:p-6 lg:sticky lg:top-24">
            <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700">Tóm tắt</p>
            <dl class="mt-5 grid gap-4 text-body-sm"><div><dt class="text-text-muted">Dịch vụ</dt><dd class="mt-1 font-semibold">{{ appointment.service.name }}</dd></div><div><dt class="text-text-muted">Thời lượng</dt><dd class="mt-1 font-semibold">{{ appointment.service.duration_minutes }} phút</dd></div><div><dt class="text-text-muted">Chi phí dự kiến</dt><dd class="mt-1 text-lg font-bold text-primary-900">{{ currency.format(appointment.service.price) }}</dd><p class="mt-1 text-caption text-text-muted">Thanh toán tại quầy sau khi hoàn thành dịch vụ.</p></div><div v-if="formatDate(appointment.created_at)"><dt class="text-text-muted">Đặt lịch lúc</dt><dd class="mt-1 font-semibold">{{ formatDate(appointment.created_at) }}</dd></div><div v-if="formatDate(appointment.cancelled_at)"><dt class="text-text-muted">Đã hủy lúc</dt><dd class="mt-1 font-semibold text-red-700">{{ formatDate(appointment.cancelled_at) }}</dd></div></dl>

            <template v-if="canCancel">
              <button v-if="!confirmCancel" type="button" class="mt-6 min-h-11 w-full rounded-xl border border-red-300 bg-white px-4 text-body-sm font-semibold text-red-700 hover:bg-red-50" @click="confirmCancel = true">Hủy lịch hẹn</button>
              <div v-else class="mt-6 rounded-2xl bg-red-50 p-4" data-testid="cancel-confirmation"><p class="text-body-sm font-semibold text-red-900">Bạn chắc chắn muốn hủy lịch hẹn này?</p><div class="mt-4 grid grid-cols-2 gap-2"><button type="button" class="min-h-10 rounded-xl border border-border bg-white text-body-sm font-semibold" :disabled="cancelMutation.isPending.value" @click="confirmCancel = false">Giữ lịch</button><button type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-700 px-3 text-body-sm font-semibold text-white disabled:opacity-50" :disabled="cancelMutation.isPending.value" @click="cancelAppointment"><LoaderCircle v-if="cancelMutation.isPending.value" class="size-4 animate-spin" aria-hidden="true" />Xác nhận hủy</button></div></div>
              <p v-if="cancelError" class="mt-3 rounded-xl bg-red-50 p-3 text-body-sm text-red-700" role="alert">{{ cancelError }}</p>
            </template>
            <RouterLink :to="ROUTE_PATHS.skinCare" class="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-primary-500 bg-white px-4 text-body-sm font-semibold text-primary-800 no-underline hover:bg-primary-50">Xem dịch vụ khác</RouterLink>
          </aside>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>
