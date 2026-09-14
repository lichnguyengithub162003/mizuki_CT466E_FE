<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, CalendarDays, ChevronRight, Clock3, LoaderCircle, MapPin, RefreshCw, UserRound } from '@lucide/vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import AppointmentStatusBadge from '@/components/clinic/AppointmentStatusBadge.vue'
import { useCustomerAppointmentsQuery } from '@/queries/clinic'
import { ROUTE_NAMES, ROUTE_PATHS } from '@/constants/routes'
import type { CustomerAppointment } from '@/types/clinic'

type AppointmentTab = 'all' | 'upcoming' | 'completed' | 'cancelled'

const tabs: readonly { id: AppointmentTab; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'upcoming', label: 'Sắp tới' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
]

const router = useRouter()
const selectedTab = ref<AppointmentTab>('all')
const appointmentsQuery = useCustomerAppointmentsQuery()
const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })

const appointments = computed(() => appointmentsQuery.data.value?.pages.flatMap((page) => page.appointments) ?? [])
const visibleAppointments = computed(() => appointments.value.filter((appointment) => {
  if (selectedTab.value === 'all') return true
  if (selectedTab.value === 'upcoming') return ['pending', 'confirmed', 'in_progress'].includes(appointment.status)
  if (selectedTab.value === 'completed') return appointment.status === 'completed'
  return appointment.status === 'cancelled' || appointment.status === 'no_show'
}))

function formatDateTime(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : `${date.format(parsed)} · ${time.format(parsed)}`
}

function safeBack(): void {
  if (typeof window.history.state?.back === 'string') router.back()
  else void router.push(ROUTE_PATHS.skinCare)
}

function openAppointment(appointment: CustomerAppointment): void {
  void router.push({ name: ROUTE_NAMES.customerAppointmentDetail, params: { id: appointment.id } })
}
</script>

<template>
  <CustomerLayout>
    <main class="min-h-[70svh] bg-[#f5f7f6]">
      <div class="mx-auto w-full max-w-[90rem] overflow-x-clip px-4 py-6 sm:px-5 md:py-8 lg:px-7">
        <header class="flex items-center gap-3">
          <button type="button" class="grid size-10 shrink-0 place-items-center rounded-xl text-primary-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label="Quay lại" @click="safeBack"><ArrowLeft class="size-5" aria-hidden="true" /></button>
          <div><p class="text-caption font-semibold uppercase tracking-[0.13em] text-primary-700">Mizuki Clinic</p><h1 class="mt-1 text-heading-1">Lịch hẹn của tôi</h1></div>
          <RouterLink :to="ROUTE_PATHS.skinCare" class="ml-auto hidden min-h-10 items-center rounded-xl border border-primary-500 bg-white px-4 text-body-sm font-semibold text-primary-800 no-underline hover:bg-primary-50 sm:inline-flex">Đặt lịch mới</RouterLink>
        </header>

        <nav class="mt-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Lọc lịch hẹn">
          <div class="flex min-w-max gap-2">
            <button v-for="tab in tabs" :key="tab.id" type="button" :aria-current="selectedTab === tab.id ? 'page' : undefined" :class="['min-h-10 rounded-pill px-4 text-body-sm font-semibold transition', selectedTab === tab.id ? 'bg-primary-700 text-white shadow-sm' : 'border border-border bg-white text-text-secondary hover:border-primary-200 hover:text-primary-800']" @click="selectedTab = tab.id">{{ tab.label }}</button>
          </div>
        </nav>

        <section class="mt-6" aria-live="polite">
          <div v-if="appointmentsQuery.isPending.value" class="grid gap-4" aria-label="Đang tải lịch hẹn">
            <div v-for="index in 3" :key="index" class="h-44 animate-pulse rounded-3xl bg-white shadow-xs"></div>
          </div>
          <div v-else-if="appointmentsQuery.isError.value" class="rounded-3xl border border-red-200 bg-red-50 p-8 text-center" role="alert">
            <p class="font-semibold text-red-800">Chưa thể tải lịch hẹn của bạn.</p>
            <button type="button" class="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-body-sm font-semibold text-red-800" @click="appointmentsQuery.refetch()"><RefreshCw class="size-4" aria-hidden="true" />Thử lại</button>
          </div>
          <div v-else-if="visibleAppointments.length === 0" class="rounded-3xl border border-dashed border-primary-200 bg-white p-10 text-center">
            <CalendarDays class="mx-auto size-9 text-primary-400" aria-hidden="true" />
            <h2 class="mt-4 text-heading-3">Chưa có lịch hẹn phù hợp</h2>
            <p class="mx-auto mt-2 max-w-md text-body-sm text-text-secondary">Khám phá dịch vụ chăm sóc da và chọn khung giờ phù hợp với bạn.</p>
            <RouterLink :to="ROUTE_PATHS.skinCare" class="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary-700 px-5 text-body-sm font-semibold text-white no-underline">Xem dịch vụ clinic</RouterLink>
          </div>
          <div v-else class="grid gap-4" data-testid="appointment-list">
            <article v-for="appointment in visibleAppointments" :key="appointment.id" class="overflow-hidden rounded-3xl bg-white shadow-[0_10px_32px_rgba(25,52,42,0.06)] ring-1 ring-black/[0.045]">
              <button type="button" class="grid w-full min-w-0 gap-5 p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring md:grid-cols-[minmax(0,1fr)_17rem] md:p-6" @click="openAppointment(appointment)">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2"><AppointmentStatusBadge :status="appointment.status" :label="appointment.status_label" /><span class="text-caption font-medium text-text-muted">{{ appointment.appointment_number }}</span></div>
                  <h2 class="mt-4 break-words text-heading-3 text-primary-950">{{ appointment.service.name }}</h2>
                  <div class="mt-4 grid gap-2 text-body-sm text-text-secondary sm:grid-cols-2">
                    <p class="flex items-start gap-2"><CalendarDays class="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true" /><span>{{ formatDateTime(appointment.starts_at) }}</span></p>
                    <p class="flex items-start gap-2"><MapPin class="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true" /><span>{{ appointment.branch.name }}</span></p>
                    <p class="flex items-start gap-2"><Clock3 class="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true" /><span>{{ appointment.service.duration_minutes }} phút</span></p>
                    <p v-if="appointment.technician" class="flex items-start gap-2"><UserRound class="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true" /><span>{{ appointment.technician.name }}</span></p>
                  </div>
                </div>
                <aside class="flex items-end justify-between gap-4 border-t border-black/[0.06] pt-4 md:flex-col md:items-end md:justify-center md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <div class="md:text-right"><p class="text-caption text-text-muted">Chi phí dự kiến</p><strong class="mt-1 block text-lg text-primary-900">{{ currency.format(appointment.service.price) }}</strong></div>
                  <span class="inline-flex items-center gap-1 text-body-sm font-semibold text-primary-700">Xem chi tiết <ChevronRight class="size-4" aria-hidden="true" /></span>
                </aside>
              </button>
            </article>
          </div>

          <div v-if="appointmentsQuery.hasNextPage.value" class="mt-6 flex justify-center">
            <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary-500 bg-white px-5 text-body-sm font-semibold text-primary-800 disabled:opacity-50" :disabled="appointmentsQuery.isFetchingNextPage.value" @click="appointmentsQuery.fetchNextPage()"><LoaderCircle v-if="appointmentsQuery.isFetchingNextPage.value" class="size-4 animate-spin" aria-hidden="true" />{{ appointmentsQuery.isFetchingNextPage.value ? 'Đang tải…' : 'Xem thêm lịch hẹn' }}</button>
          </div>
        </section>
      </div>
    </main>
  </CustomerLayout>
</template>
