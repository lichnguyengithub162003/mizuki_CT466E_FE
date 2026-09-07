<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CalendarDays, Check, CheckCircle2, Clock3, LoaderCircle, MapPin, Sparkles, UserRound } from '@lucide/vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import { ROUTE_NAMES, ROUTE_PATHS } from '@/constants/routes'
import {
  useClinicCatalogServicesQuery,
  useClinicsQuery,
  useClinicServicesQuery,
  useClinicSlotsQuery,
  useCreateCustomerAppointmentMutation,
} from '@/queries/clinic'
import type { CustomerAppointment } from '@/types/clinic'

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

function toDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function startTime(timestamp: string): string {
  return timestamp.match(/T(\d{2}:\d{2})/)?.[1] ?? ''
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const validationErrors = Reflect.get(error, 'validationErrors')
    if (typeof validationErrors === 'object' && validationErrors !== null) {
      for (const messages of Object.values(validationErrors as Record<string, unknown>)) {
        if (Array.isArray(messages) && typeof messages[0] === 'string') return messages[0]
      }
    }
    const message = Reflect.get(error, 'message')
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.'
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore(pinia)
const today = new Date()
const minDate = toDateInput(today)
const maxDate = toDateInput(addDays(today, 90))
const selectedDate = ref(toDateInput(addDays(today, 1)))
const initialServiceId = Number(route.query.service)
const selectedServiceId = ref<number | null>(Number.isInteger(initialServiceId) && initialServiceId > 0 ? initialServiceId : null)
const selectedBranchId = ref<number | null>(null)
const selectedSlotStart = ref<string | null>(null)
const customerNote = ref('')
const bookingError = ref<string | null>(null)
const createdAppointment = ref<CustomerAppointment | null>(null)

const clinicsQuery = useClinicsQuery()
const catalogQuery = useClinicCatalogServicesQuery(() => clinicsQuery.data.value)
const branchServicesQuery = useClinicServicesQuery(selectedBranchId)
const slotsQuery = useClinicSlotsQuery(selectedBranchId, selectedServiceId, selectedDate)
const createMutation = useCreateCustomerAppointmentMutation()

const catalogService = computed(() => catalogQuery.data.value?.find((service) => service.id === selectedServiceId.value) ?? null)
const selectedService = computed(() => selectedBranchId.value === null
  ? catalogService.value
  : branchServicesQuery.data.value?.find((service) => service.id === selectedServiceId.value) ?? null,
)
const availableBranches = computed(() => {
  const branchIds = catalogService.value?.branch_ids ?? []
  return (clinicsQuery.data.value ?? []).filter((branch) => branchIds.includes(branch.id))
})
const selectedBranch = computed(() => availableBranches.value.find((branch) => branch.id === selectedBranchId.value) ?? null)
const canSubmit = computed(() => Boolean(selectedService.value && selectedBranch.value && selectedSlotStart.value) && !createMutation.isPending.value)
const activeStep = computed(() => {
  if (!selectedService.value) return 1
  if (!selectedBranch.value) return 2
  if (!selectedDate.value) return 3
  if (!selectedSlotStart.value) return 4
  return 5
})

watch(selectedServiceId, () => {
  selectedBranchId.value = null
  selectedSlotStart.value = null
  createdAppointment.value = null
  bookingError.value = null
})
watch([selectedBranchId, selectedDate], () => {
  selectedSlotStart.value = null
  createdAppointment.value = null
  bookingError.value = null
})

function chooseService(serviceId: number): void {
  selectedServiceId.value = serviceId
  void router.replace({ name: ROUTE_NAMES.skinCareBooking, query: { service: String(serviceId) } })
}

async function submitBooking(): Promise<void> {
  if (!authStore.isAuthenticated) {
    await router.push({ path: ROUTE_PATHS.login, query: { redirect: route.fullPath } })
    return
  }
  if (!canSubmit.value || selectedBranchId.value === null || selectedServiceId.value === null || !selectedSlotStart.value) return
  const requestedStartTime = startTime(selectedSlotStart.value)
  if (!requestedStartTime) return

  bookingError.value = null
  try {
    createdAppointment.value = await createMutation.mutateAsync({
      branch_id: selectedBranchId.value,
      service_id: selectedServiceId.value,
      appointment_date: selectedDate.value,
      start_time: requestedStartTime,
      customer_note: customerNote.value.trim() || null,
    })
    selectedSlotStart.value = null
    customerNote.value = ''
    await slotsQuery.refetch()
  } catch (error) {
    bookingError.value = errorMessage(error)
  }
}
</script>

<template>
  <CustomerLayout>
    <main class="bg-primary-50/35">
      <div class="mx-auto w-full max-w-[82rem] px-4 py-7 sm:px-5 md:py-10 lg:px-7">
        <header class="flex items-start gap-3">
          <RouterLink :to="ROUTE_PATHS.skinCare" class="grid size-11 shrink-0 place-items-center rounded-full bg-white text-primary-800 shadow-sm ring-1 ring-black/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label="Quay lại danh mục dịch vụ"><ArrowLeft class="size-5" aria-hidden="true" /></RouterLink>
          <div><p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">Mizuki Clinic</p><h1 class="mt-1 text-display-md text-primary-950">Đặt lịch chăm sóc da</h1><p class="mt-2 text-body-md text-text-secondary">Chọn từng bước; lịch hẹn chưa bao gồm thanh toán.</p></div>
        </header>

        <ol class="mt-7 grid grid-cols-5 gap-2" aria-label="Các bước đặt lịch">
          <li v-for="(label, index) in ['Dịch vụ', 'Cơ sở', 'Ngày', 'Giờ', 'Xác nhận']" :key="label" class="min-w-0">
            <div :class="['h-1.5 rounded-full', activeStep >= index + 1 ? 'bg-primary-600' : 'bg-primary-100']"></div>
            <span class="mt-2 hidden text-caption font-medium text-text-muted sm:block">{{ index + 1 }}. {{ label }}</span>
          </li>
        </ol>

        <div class="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div class="grid min-w-0 gap-5">
            <section class="rounded-3xl bg-white p-5 shadow-[0_12px_34px_rgba(25,52,42,0.07)] ring-1 ring-black/[0.045] md:p-6" aria-labelledby="booking-service-heading">
              <div class="flex items-center gap-3"><span class="grid size-10 place-items-center rounded-xl bg-primary-100 font-bold text-primary-800">1</span><div><h2 id="booking-service-heading" class="text-heading-3">Dịch vụ</h2><p class="text-body-sm text-text-muted">Chọn liệu trình bạn muốn được tư vấn.</p></div></div>
              <div v-if="catalogQuery.isPending.value || clinicsQuery.isPending.value" class="mt-5 h-28 animate-pulse rounded-2xl bg-primary-50" role="status" aria-label="Đang tải dịch vụ"></div>
              <ErrorState v-else-if="catalogQuery.isError.value || clinicsQuery.isError.value" class="mt-5" title="Chưa thể tải dịch vụ" description="Vui lòng thử lại." @retry="clinicsQuery.refetch(); catalogQuery.refetch()" />
              <label v-else class="mt-5 grid min-w-0 gap-2 text-body-sm font-semibold"><span>Dịch vụ chăm sóc da</span><select :value="selectedServiceId ?? ''" data-testid="booking-service-select" class="min-h-12 w-full min-w-0 rounded-xl border border-input bg-white px-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" @change="chooseService(Number(($event.target as HTMLSelectElement).value))"><option value="" disabled>Chọn dịch vụ</option><option v-for="service in catalogQuery.data.value" :key="service.id" :value="service.id">{{ service.name }} · {{ currency.format(service.price) }}</option></select></label>
              <div v-if="selectedService" class="mt-4 rounded-2xl bg-primary-50/75 p-4"><h3 class="font-semibold text-primary-950">{{ selectedService.name }}</h3><div class="mt-2 flex flex-wrap gap-3 text-body-sm text-primary-800"><span class="inline-flex items-center gap-1.5"><Clock3 class="size-4" aria-hidden="true" />{{ selectedService.duration_minutes }} phút</span><strong>{{ currency.format(selectedService.price) }}</strong></div><p class="mt-2 text-caption text-text-muted">Chi phí dự kiến; thanh toán tại quầy sau khi hoàn thành dịch vụ.</p></div>
            </section>

            <section :class="['rounded-3xl p-5 shadow-[0_12px_34px_rgba(25,52,42,0.07)] ring-1 ring-black/[0.045] md:p-6', selectedService ? 'bg-white' : 'bg-white/55']" aria-labelledby="booking-branch-heading">
              <div class="flex items-center gap-3"><span class="grid size-10 place-items-center rounded-xl bg-primary-100 font-bold text-primary-800">2</span><div><h2 id="booking-branch-heading" class="text-heading-3">Cơ sở Clinic</h2><p class="text-body-sm text-text-muted">Chỉ hiển thị cơ sở đang cung cấp dịch vụ đã chọn.</p></div></div>
              <p v-if="!selectedService" class="mt-5 text-body-sm text-text-muted">Hãy chọn dịch vụ trước.</p>
              <div v-else class="mt-5 grid gap-3 sm:grid-cols-2">
                <button v-for="branch in availableBranches" :key="branch.id" type="button" :data-testid="`booking-branch-${branch.id}`" :aria-pressed="selectedBranchId === branch.id" :class="['rounded-2xl p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', selectedBranchId === branch.id ? 'bg-primary-700 text-white shadow-md' : 'bg-primary-50/70 text-primary-950 hover:bg-primary-100']" @click="selectedBranchId = branch.id"><span class="flex items-start gap-2"><MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span><strong class="block">{{ branch.name }}</strong><span class="mt-1 block text-caption opacity-80">{{ branch.address }}</span></span></span></button>
              </div>
            </section>

            <section class="rounded-3xl bg-white p-5 shadow-[0_12px_34px_rgba(25,52,42,0.07)] ring-1 ring-black/[0.045] md:p-6" aria-labelledby="booking-time-heading">
              <div class="flex items-center gap-3"><span class="grid size-10 place-items-center rounded-xl bg-primary-100 font-bold text-primary-800">3–4</span><div><h2 id="booking-time-heading" class="text-heading-3">Ngày và giờ</h2><p class="text-body-sm text-text-muted">Tình trạng chỗ trống được cập nhật từ Clinic.</p></div></div>
              <p v-if="!selectedBranch" class="mt-5 text-body-sm text-text-muted">Hãy chọn cơ sở Clinic trước.</p>
              <template v-else>
                <label class="mt-5 grid max-w-sm gap-2 text-body-sm font-semibold"><span class="inline-flex items-center gap-2"><CalendarDays class="size-4 text-primary-700" aria-hidden="true" />Ngày hẹn</span><input v-model="selectedDate" data-testid="clinic-date-input" type="date" :min="minDate" :max="maxDate" class="min-h-12 rounded-xl border border-input bg-white px-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" /></label>
                <div class="mt-5" aria-live="polite">
                  <div v-if="slotsQuery.isPending.value" class="grid grid-cols-2 gap-2 sm:grid-cols-4" role="status" aria-label="Đang tải khung giờ"><div v-for="index in 8" :key="index" class="h-14 animate-pulse rounded-xl bg-primary-50"></div></div>
                  <ErrorState v-else-if="slotsQuery.isError.value" title="Chưa thể tải khung giờ" :description="errorMessage(slotsQuery.error.value)" @retry="slotsQuery.refetch()" />
                  <p v-else-if="slotsQuery.data.value?.slots.length === 0" class="rounded-xl bg-amber-50 p-4 text-body-sm text-amber-900">Cơ sở không có khung giờ phù hợp trong ngày này.</p>
                  <div v-else class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button v-for="slot in slotsQuery.data.value?.slots" :key="slot.start_at" type="button" :data-testid="`slot-${slot.start_at}`" :disabled="!slot.available" :aria-pressed="selectedSlotStart === slot.start_at" :class="['min-h-14 rounded-xl px-2 py-2 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', selectedSlotStart === slot.start_at ? 'bg-primary-700 text-white shadow-md' : slot.available ? 'bg-primary-50 text-primary-950 hover:bg-primary-100' : 'cursor-not-allowed bg-surface-subtle text-text-muted opacity-70']" @click="selectedSlotStart = slot.start_at"><span class="block font-semibold">{{ startTime(slot.start_at) }}</span><span class="mt-0.5 block text-[0.7rem]">{{ slot.available ? `${slot.remaining_capacity} chỗ` : 'Hết chỗ' }}</span></button>
                  </div>
                </div>
              </template>
            </section>

            <section class="rounded-3xl bg-white p-5 shadow-[0_12px_34px_rgba(25,52,42,0.07)] ring-1 ring-black/[0.045] md:p-6" aria-labelledby="booking-note-heading">
              <div class="flex items-center gap-3"><span class="grid size-10 place-items-center rounded-xl bg-primary-100 font-bold text-primary-800">5</span><div><h2 id="booking-note-heading" class="text-heading-3">Ghi chú</h2><p class="text-body-sm text-text-muted">Không bắt buộc, tối đa 1.000 ký tự.</p></div></div>
              <textarea v-model="customerNote" maxlength="1000" rows="4" class="mt-5 w-full rounded-2xl border border-input bg-white p-4 text-body-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" placeholder="Ví dụ: da nhạy cảm, cần được tư vấn trước"></textarea>
            </section>
          </div>

          <aside class="rounded-3xl bg-primary-950 p-5 text-white shadow-xl lg:sticky lg:top-28 md:p-6" data-testid="booking-confirmation">
            <div class="flex items-center gap-2 text-primary-100"><Sparkles class="size-5" aria-hidden="true" /><h2 class="text-heading-3 text-white">Xác nhận lịch hẹn</h2></div>
            <dl class="mt-6 grid gap-4 text-body-sm">
              <div><dt class="text-primary-200">Dịch vụ</dt><dd class="mt-1 font-semibold">{{ selectedService?.name || 'Chưa chọn' }}</dd></div>
              <div><dt class="text-primary-200">Cơ sở</dt><dd class="mt-1 font-semibold">{{ selectedBranch?.name || 'Chưa chọn' }}</dd></div>
              <div><dt class="text-primary-200">Ngày và giờ</dt><dd class="mt-1 font-semibold">{{ selectedDate }}<span v-if="selectedSlotStart"> · {{ startTime(selectedSlotStart) }}</span></dd></div>
              <div><dt class="text-primary-200">Chi phí dự kiến</dt><dd class="mt-1 text-lg font-bold">{{ selectedService ? currency.format(selectedService.price) : '—' }}</dd></div>
            </dl>
            <div v-if="authStore.isAuthenticated" class="mt-5 rounded-2xl bg-white/10 p-3 text-caption"><span class="inline-flex items-center gap-2"><UserRound class="size-4" aria-hidden="true" />{{ authStore.user?.name }}</span></div>
            <p v-if="bookingError" class="mt-4 rounded-xl bg-red-400/15 p-3 text-body-sm text-red-100" role="alert">{{ bookingError }}</p>
            <button type="button" class="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 font-semibold text-primary-950 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-45" :disabled="!canSubmit" @click="submitBooking"><LoaderCircle v-if="createMutation.isPending.value" class="size-5 animate-spin" aria-hidden="true" /><Check v-else class="size-5" aria-hidden="true" />{{ createMutation.isPending.value ? 'Đang đặt lịch…' : authStore.isAuthenticated ? 'Xác nhận đặt lịch' : 'Đăng nhập để đặt lịch' }}</button>
            <p class="mt-3 text-caption leading-relaxed text-primary-200">Không thanh toán khi đặt lịch. Chi phí thực tế được xác nhận tại Clinic sau khi chuyên viên đánh giá.</p>
          </aside>
        </div>

        <section v-if="createdAppointment" class="mt-6 rounded-3xl bg-emerald-50 p-6 ring-1 ring-emerald-200" data-testid="booking-success" aria-live="polite">
          <div class="flex items-start gap-3"><CheckCircle2 class="size-7 shrink-0 text-emerald-700" aria-hidden="true" /><div><h2 class="text-heading-3 text-emerald-950">Đặt lịch thành công</h2><p class="mt-1 text-body-sm text-emerald-800">Mã lịch hẹn: <strong>{{ createdAppointment.appointment_number }}</strong></p><RouterLink :to="ROUTE_PATHS.customerAppointments" class="mt-4 inline-flex min-h-10 items-center rounded-xl border border-emerald-700 px-4 text-body-sm font-semibold text-emerald-800">Xem lịch hẹn của tôi</RouterLink></div></div>
        </section>
      </div>
    </main>
  </CustomerLayout>
</template>
