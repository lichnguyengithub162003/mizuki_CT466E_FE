<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Clock3, MapPin, RefreshCw, Search, Sparkles } from '@lucide/vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import DataGridSkeleton from '@/components/feedback/DataGridSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { useClinicCatalogServicesQuery, useClinicsQuery } from '@/queries/clinic'
import { ROUTE_NAMES } from '@/constants/routes'
import type { ClinicCatalogService } from '@/types/clinic'

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const router = useRouter()
const search = ref('')
const visibleCount = ref(12)
const failedImages = ref<ReadonlySet<number>>(new Set())
const clinicsQuery = useClinicsQuery()
const catalogQuery = useClinicCatalogServicesQuery(() => clinicsQuery.data.value)

const filteredServices = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('vi-VN')
  const services = catalogQuery.data.value ?? []
  if (!keyword) return services

  return services.filter((service) =>
    `${service.name} ${service.short_description ?? ''}`
      .toLocaleLowerCase('vi-VN')
      .includes(keyword),
  )
})
const visibleServices = computed(() => filteredServices.value.slice(0, visibleCount.value))
const hasMoreServices = computed(() => visibleServices.value.length < filteredServices.value.length)

watch(search, () => {
  visibleCount.value = 12
})

function canShowImage(service: ClinicCatalogService): boolean {
  const imageUrl = service.image_url?.trim()
  if (!imageUrl) return false
  const isSupportedUrl = imageUrl.startsWith('https://') || imageUrl.startsWith('http://') || imageUrl.startsWith('/')
  return isSupportedUrl && !failedImages.value.has(service.id)
}

function markImageFailed(serviceId: number): void {
  failedImages.value = new Set([...failedImages.value, serviceId])
}

function openBooking(service: ClinicCatalogService): void {
  void router.push({ name: ROUTE_NAMES.skinCareBooking, query: { service: String(service.id) } })
}
</script>

<template>
  <CustomerLayout>
    <main class="bg-primary-50/35">
      <div class="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-5 md:py-10 lg:px-7">
        <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div class="min-w-0">
            <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">Mizuki Clinic</p>
            <h1 class="mt-2 text-display-md text-primary-950">Dịch vụ chăm sóc da</h1>
            <p class="mt-2 max-w-2xl text-body-md text-text-secondary">
              Khám phá liệu trình phù hợp và đặt lịch tại cơ sở Clinic thuận tiện với bạn.
            </p>
          </div>
          <label class="relative block w-full md:max-w-sm">
            <span class="sr-only">Tìm dịch vụ chăm sóc da</span>
            <Search class="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input v-model="search" data-testid="service-search" type="search" class="min-h-12 w-full rounded-2xl border-0 bg-white pl-12 pr-4 text-body-sm shadow-[0_8px_28px_rgba(25,52,42,0.07)] ring-1 ring-black/[0.05] outline-none focus:ring-2 focus:ring-primary-300" placeholder="Tìm tên dịch vụ" />
          </label>
        </header>

        <section class="mt-6 rounded-2xl bg-primary-100/65 px-4 py-4 sm:px-5" aria-labelledby="clinic-locations-heading">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div class="flex shrink-0 items-center gap-2 text-primary-900">
              <MapPin class="size-5" aria-hidden="true" />
              <h2 id="clinic-locations-heading" class="text-body-sm font-semibold">Clinic Mizuki hiện có tại</h2>
            </div>
            <div v-if="clinicsQuery.isPending.value" class="h-8 w-72 animate-pulse rounded-full bg-white/70" role="status" aria-label="Đang tải cơ sở Clinic"></div>
            <button v-else-if="clinicsQuery.isError.value" type="button" class="inline-flex items-center gap-2 self-start text-body-sm font-semibold text-red-700" @click="clinicsQuery.refetch()"><RefreshCw class="size-4" aria-hidden="true" /> Thử tải lại cơ sở</button>
            <div v-else class="flex min-w-0 flex-wrap gap-2">
              <span v-for="branch in clinicsQuery.data.value" :key="branch.id" class="rounded-full bg-white px-3 py-1.5 text-caption font-medium text-primary-900 shadow-xs">{{ branch.name }}</span>
            </div>
          </div>
        </section>

        <section class="mt-8" aria-labelledby="clinic-services-heading">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700">Danh mục liệu trình</p>
              <h2 id="clinic-services-heading" class="mt-1 text-heading-2 text-primary-950">Chọn dịch vụ dành cho bạn</h2>
            </div>
            <span v-if="catalogQuery.data.value" class="hidden text-body-sm text-text-muted sm:block">{{ filteredServices.length }} dịch vụ</span>
          </div>

          <DataGridSkeleton v-if="clinicsQuery.isPending.value || catalogQuery.isPending.value" class="mt-6" :items="6" :columns="3" label="Đang tải dịch vụ chăm sóc da" />
          <ErrorState v-else-if="clinicsQuery.isError.value || catalogQuery.isError.value" class="mt-6" title="Chưa thể tải dịch vụ chăm sóc da" description="Vui lòng kiểm tra kết nối và thử lại." @retry="clinicsQuery.refetch(); catalogQuery.refetch()" />
          <EmptyState v-else-if="(catalogQuery.data.value?.length ?? 0) === 0" class="mt-6" title="Chưa có dịch vụ chăm sóc da" description="Mizuki sẽ cập nhật danh mục Clinic sớm nhất." />
          <EmptyState v-else-if="filteredServices.length === 0" class="mt-6" title="Không tìm thấy dịch vụ phù hợp" description="Hãy thử một từ khóa ngắn hơn." />
          <div v-else class="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="clinic-service-catalog">
            <button v-for="service in visibleServices" :key="service.id" type="button" :data-testid="`service-card-${service.id}`" class="group flex min-w-0 flex-col overflow-hidden rounded-3xl bg-white text-left shadow-[0_12px_34px_rgba(25,52,42,0.08)] ring-1 ring-black/[0.045] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(25,52,42,0.13)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-600" @click="openBooking(service)">
              <div class="aspect-[16/10] overflow-hidden bg-primary-100/70">
                <img v-if="canShowImage(service)" :src="service.image_url ?? undefined" :alt="service.name" class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" loading="lazy" @error="markImageFailed(service.id)" />
                <div v-else class="grid h-full place-items-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(218,235,227,0.9))] text-primary-700" data-testid="clinic-image-placeholder">
                  <div class="grid place-items-center gap-2 text-center"><span class="grid size-14 place-items-center rounded-2xl bg-white/85 shadow-sm"><Sparkles class="size-7" aria-hidden="true" /></span><span class="text-caption font-semibold uppercase tracking-[0.12em]">Mizuki Clinic</span></div>
                </div>
              </div>
              <div class="flex flex-1 flex-col p-5">
                <div class="flex flex-wrap items-center justify-between gap-2 text-caption">
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-primary-800"><Clock3 class="size-3.5" aria-hidden="true" />{{ service.duration_minutes }} phút</span>
                  <strong class="text-body-md text-primary-950">{{ currency.format(service.price) }}</strong>
                </div>
                <h3 class="mt-4 line-clamp-2 text-heading-4 text-primary-950">{{ service.name }}</h3>
                <p class="mt-2 line-clamp-3 text-body-sm text-text-secondary">{{ service.short_description || 'Thông tin liệu trình sẽ được Mizuki tư vấn rõ ràng trước khi thực hiện.' }}</p>
                <span class="mt-5 inline-flex items-center gap-2 self-start text-body-sm font-semibold text-primary-700">Đặt lịch <ArrowRight class="size-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
              </div>
            </button>
          </div>

          <div v-if="hasMoreServices" class="mt-8 flex justify-center">
            <button type="button" class="min-h-11 rounded-xl border border-primary-600 bg-white px-6 text-body-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" @click="visibleCount += 12">Xem thêm dịch vụ</button>
          </div>
        </section>
      </div>
    </main>
  </CustomerLayout>
</template>
