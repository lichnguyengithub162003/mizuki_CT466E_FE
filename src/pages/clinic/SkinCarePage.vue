<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDays, Clock3, ImageOff, MapPin, Search, Sparkles } from '@lucide/vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import DataGridSkeleton from '@/components/feedback/DataGridSkeleton.vue'
import {
  useClinicsQuery,
  useClinicServicesQuery,
  useClinicSlotsQuery,
} from '@/queries/clinic'
import type { ClinicService } from '@/types/clinic'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})
const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
})

function toLocalDateInput(date: Date): string {
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

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = Reflect.get(error, 'message')
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  return 'Không thể tải dữ liệu. Vui lòng thử lại.'
}

const today = new Date()
const minDate = toLocalDateInput(today)
const maxDate = toLocalDateInput(addDays(today, 90))
const selectedDate = ref(toLocalDateInput(addDays(today, 1)))
const selectedBranchId = ref<number | null>(null)
const selectedServiceId = ref<number | null>(null)
const selectedSlotStart = ref<string | null>(null)
const serviceSearch = ref('')
const failedImages = ref<ReadonlySet<number>>(new Set())

const clinicsQuery = useClinicsQuery()
const servicesQuery = useClinicServicesQuery(selectedBranchId)
const slotsQuery = useClinicSlotsQuery(selectedBranchId, selectedServiceId, selectedDate)

const selectedBranch = computed(() =>
  clinicsQuery.data.value?.find((branch) => branch.id === selectedBranchId.value) ?? null,
)
const selectedService = computed(() =>
  servicesQuery.data.value?.find((service) => service.id === selectedServiceId.value) ?? null,
)
const filteredServices = computed(() => {
  const services = servicesQuery.data.value ?? []
  const keyword = serviceSearch.value.trim().toLocaleLowerCase('vi-VN')

  if (keyword.length === 0) {
    return services
  }

  return services.filter((service) =>
    `${service.name} ${service.short_description ?? ''}`
      .toLocaleLowerCase('vi-VN')
      .includes(keyword),
  )
})

watch(selectedBranchId, () => {
  selectedServiceId.value = null
  selectedSlotStart.value = null
  serviceSearch.value = ''
})

watch([selectedServiceId, selectedDate], () => {
  selectedSlotStart.value = null
})

function chooseBranch(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  selectedBranchId.value = value === '' ? null : Number(value)
}

function chooseService(service: ClinicService): void {
  selectedServiceId.value = service.id
}

function markImageFailed(serviceId: number): void {
  failedImages.value = new Set([...failedImages.value, serviceId])
}

function canShowImage(service: ClinicService): boolean {
  return service.image_url !== null && !failedImages.value.has(service.id)
}

function formatPrice(price: number): string {
  return currencyFormatter.format(price)
}

function formatTime(timestamp: string): string {
  return timeFormatter.format(new Date(timestamp))
}
</script>

<template>
  <CustomerLayout>
    <div class="mx-auto w-full max-w-[90rem] px-4 py-8 sm:px-5 md:py-12 lg:px-7">
      <header class="overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-surface to-admin-sage-soft px-6 py-10 shadow-xs md:px-10 md:py-14">
        <div class="max-w-3xl">
          <p class="text-caption font-semibold uppercase tracking-[0.16em] text-primary-700">
            Chăm sóc dịu nhẹ, lựa chọn rõ ràng
          </p>
          <h1 class="mt-3 text-display-lg">Dịch vụ chăm sóc da tại Mizuki</h1>
          <p class="mt-4 max-w-2xl text-body-lg text-text-secondary">
            Chọn cơ sở chăm sóc da phù hợp, xem thông tin dịch vụ và tham khảo khung giờ
            tư vấn da còn trống trước khi đặt lịch.
          </p>
        </div>
      </header>

      <section class="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-labelledby="location-heading">
        <div class="rounded-2xl border border-border bg-surface p-5 shadow-xs md:p-6">
          <div class="flex items-start gap-3">
            <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-800">
              <MapPin class="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="location-heading" class="text-heading-3">Chọn cơ sở chăm sóc da</h2>
              <p class="mt-1 text-body-sm text-muted-foreground">
                Danh sách chỉ gồm các cơ sở đang phục vụ dịch vụ chăm sóc da.
              </p>
            </div>
          </div>

          <div v-if="clinicsQuery.isPending.value" class="mt-5" role="status">
            <div class="h-12 animate-pulse rounded-xl bg-surface-subtle"></div>
            <span class="sr-only">Đang tải cơ sở chăm sóc da</span>
          </div>
          <ErrorState
            v-else-if="clinicsQuery.isError.value"
            class="mt-5"
            title="Chưa thể tải cơ sở chăm sóc da"
            :description="errorMessage(clinicsQuery.error.value)"
            @retry="clinicsQuery.refetch()"
          />
          <EmptyState
            v-else-if="clinicsQuery.data.value?.length === 0"
            class="mt-5"
            title="Chưa có cơ sở chăm sóc da"
            description="Vui lòng quay lại sau để xem các cơ sở đang phục vụ."
          />
          <label v-else class="mt-5 grid gap-2 text-body-sm font-semibold text-foreground">
            Cơ sở chăm sóc da
            <select
              data-testid="clinic-branch-select"
              class="min-h-12 w-full rounded-xl border border-input bg-background px-4 text-body-md outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              :value="selectedBranchId ?? ''"
              @change="chooseBranch"
            >
              <option value="">Chọn một cơ sở</option>
              <option
                v-for="branch in clinicsQuery.data.value"
                :key="branch.id"
                :value="branch.id"
              >
                {{ branch.name }}
              </option>
            </select>
          </label>
        </div>

        <aside class="rounded-2xl border border-border bg-surface-subtle p-5 md:p-6">
          <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700">
            Cơ sở đã chọn
          </p>
          <template v-if="selectedBranch">
            <h2 class="mt-3 text-heading-4">{{ selectedBranch.name }}</h2>
            <p class="mt-2 text-body-sm text-text-secondary">{{ selectedBranch.address }}</p>
            <p v-if="selectedBranch.phone" class="mt-3 text-body-sm font-medium">
              {{ selectedBranch.phone }}
            </p>
          </template>
          <p v-else class="mt-3 text-body-sm text-muted-foreground">
            Chọn cơ sở để xem các dịch vụ chăm sóc da hiện có.
          </p>
        </aside>
      </section>

      <section class="mt-12" aria-labelledby="service-heading">
        <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">Danh mục dịch vụ</p>
            <h2 id="service-heading" class="mt-2 text-heading-2">Dịch vụ chăm sóc da</h2>
          </div>
          <label v-if="selectedBranchId !== null" class="relative block w-full md:max-w-sm">
            <span class="sr-only">Tìm dịch vụ chăm sóc da</span>
            <Search class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              v-model="serviceSearch"
              data-testid="service-search"
              type="search"
              class="min-h-11 w-full rounded-xl border border-input bg-surface pl-11 pr-4 text-body-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              placeholder="Tìm dịch vụ chăm sóc da"
            />
          </label>
        </div>

        <EmptyState
          v-if="selectedBranchId === null"
          class="mt-6"
          title="Hãy chọn cơ sở chăm sóc da"
          description="Dịch vụ được hiển thị theo từng cơ sở để thông tin luôn chính xác."
        />
        <DataGridSkeleton
          v-else-if="servicesQuery.isPending.value"
          class="mt-6"
          :items="6"
          :columns="3"
          label="Đang tải dịch vụ chăm sóc da"
        />
        <ErrorState
          v-else-if="servicesQuery.isError.value"
          class="mt-6"
          title="Chưa thể tải dịch vụ chăm sóc da"
          :description="errorMessage(servicesQuery.error.value)"
          @retry="servicesQuery.refetch()"
        />
        <EmptyState
          v-else-if="servicesQuery.data.value?.length === 0"
          class="mt-6"
          title="Cơ sở chưa có dịch vụ chăm sóc da"
          description="Bạn có thể chọn một cơ sở khác hoặc quay lại sau."
        />
        <EmptyState
          v-else-if="filteredServices.length === 0"
          class="mt-6"
          title="Không tìm thấy dịch vụ phù hợp"
          description="Hãy thử một từ khóa ngắn hơn."
        />
        <div v-else class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="service in filteredServices"
            :key="service.id"
            type="button"
            :data-testid="`service-card-${service.id}`"
            :aria-pressed="selectedServiceId === service.id"
            :class="[
              'motion-interactive overflow-hidden rounded-2xl border bg-surface text-left shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              selectedServiceId === service.id
                ? 'border-primary-500 ring-2 ring-primary-100'
                : 'border-border hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-sm',
            ]"
            @click="chooseService(service)"
          >
            <div class="aspect-[16/10] overflow-hidden bg-primary-50">
              <img
                v-if="canShowImage(service)"
                :src="service.image_url ?? undefined"
                :alt="service.name"
                class="h-full w-full object-cover"
                loading="lazy"
                @error="markImageFailed(service.id)"
              />
              <div v-else class="grid h-full place-items-center text-primary-300">
                <ImageOff class="size-9" aria-hidden="true" />
              </div>
            </div>
            <div class="p-5">
              <div class="flex flex-wrap items-center gap-2 text-caption text-primary-800">
                <span class="inline-flex items-center gap-1 rounded-pill bg-primary-50 px-2.5 py-1">
                  <Clock3 class="size-3.5" aria-hidden="true" />
                  {{ service.duration_minutes }} phút
                </span>
                <span class="font-semibold">{{ formatPrice(service.price) }}</span>
              </div>
              <h3 class="mt-3 text-heading-4">{{ service.name }}</h3>
              <p class="mt-2 line-clamp-3 text-body-sm text-text-secondary">
                {{ service.short_description || 'Thông tin dịch vụ sẽ được tư vấn rõ hơn tại cơ sở.' }}
              </p>
            </div>
          </button>
        </div>
      </section>

      <section v-if="selectedService" class="mt-12 rounded-2xl border border-primary-100 bg-surface p-5 shadow-sm md:p-8" aria-labelledby="selection-heading">
        <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <div>
            <div class="flex items-center gap-2 text-primary-700">
              <Sparkles class="size-5" aria-hidden="true" />
              <p class="text-caption font-semibold uppercase tracking-[0.12em]">Dịch vụ đã chọn</p>
            </div>
            <h2 id="selection-heading" class="mt-3 text-heading-2">{{ selectedService.name }}</h2>
            <p class="mt-3 text-body-md text-text-secondary">
              {{ selectedService.description || selectedService.short_description || 'Đội ngũ Mizuki sẽ cung cấp thêm thông tin khi tư vấn da.' }}
            </p>
            <div class="mt-5 flex flex-wrap gap-3 text-body-sm">
              <span class="rounded-pill bg-primary-50 px-3 py-1.5">{{ selectedService.duration_minutes }} phút</span>
              <span class="rounded-pill bg-admin-sage-soft px-3 py-1.5 font-semibold">{{ formatPrice(selectedService.price) }}</span>
            </div>
          </div>

          <div class="rounded-xl bg-surface-subtle p-5">
            <label class="grid gap-2 text-body-sm font-semibold">
              <span class="inline-flex items-center gap-2">
                <CalendarDays class="size-4 text-primary-700" aria-hidden="true" />
                Ngày tư vấn da
              </span>
              <input
                v-model="selectedDate"
                data-testid="clinic-date-input"
                type="date"
                :min="minDate"
                :max="maxDate"
                class="min-h-11 rounded-xl border border-input bg-surface px-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <div class="mt-5" aria-live="polite">
              <div v-if="slotsQuery.isPending.value" class="grid grid-cols-3 gap-2" role="status" aria-label="Đang tải khung giờ tư vấn da">
                <div v-for="index in 6" :key="index" class="h-10 animate-pulse rounded-lg bg-primary-100"></div>
              </div>
              <ErrorState
                v-else-if="slotsQuery.isError.value"
                title="Chưa thể tải khung giờ"
                :description="errorMessage(slotsQuery.error.value)"
                @retry="slotsQuery.refetch()"
              />
              <EmptyState
                v-else-if="slotsQuery.data.value?.slots.length === 0"
                title="Chưa có khung giờ phù hợp"
                description="Hãy thử một ngày khác trong 90 ngày tới."
              />
              <div v-else class="grid grid-cols-3 gap-2 sm:grid-cols-4">
                <button
                  v-for="slot in slotsQuery.data.value?.slots"
                  :key="slot.start_at"
                  type="button"
                  :data-testid="`slot-${slot.start_at}`"
                  :disabled="!slot.available"
                  :aria-pressed="selectedSlotStart === slot.start_at"
                  :class="[
                    'min-h-10 rounded-lg border px-2 text-body-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:text-text-muted',
                    selectedSlotStart === slot.start_at
                      ? 'border-primary-700 bg-primary-700 text-white'
                      : slot.available
                        ? 'border-primary-200 bg-primary-50 text-primary-900 hover:border-primary-500'
                        : '',
                  ]"
                  @click="selectedSlotStart = slot.start_at"
                >
                  {{ formatTime(slot.start_at) }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </CustomerLayout>
</template>
