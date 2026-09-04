<script setup lang="ts">
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Plus,
  RotateCcw,
  ShoppingBag,
  Sparkles,
} from '@lucide/vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import AdminMetricCard from '@/components/layout/AdminMetricCard.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import PageHeader from '@/components/layout/PageHeader.vue'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'

interface ActivityItem {
  title: string
  meta: string
  status: string
  variant: BadgeVariant
  icon: typeof ShoppingBag
}

const summaryCards = [
  {
    label: 'Đơn hàng',
    value: '128',
    note: 'Số liệu demo · 7 ngày',
    delta: '12,4%',
    trend: 'up',
    accent: 'sage',
    path: 'M2 38C18 35 24 28 39 30C55 32 62 18 78 22C94 26 104 17 119 19C137 22 145 8 162 13C180 18 190 7 218 5',
  },
  {
    label: 'Yêu cầu hoàn tiền',
    value: '14',
    note: 'Số liệu demo · cần xem',
    delta: '3,1%',
    trend: 'down',
    accent: 'apricot',
    path: 'M2 13C20 15 28 9 44 12C60 15 68 22 83 20C101 18 107 29 125 27C143 25 151 35 169 31C187 27 198 39 218 36',
  },
  {
    label: 'Sản phẩm hoạt động',
    value: '1.248',
    note: 'Số liệu demo · toàn hệ thống',
    delta: '8,7%',
    trend: 'up',
    accent: 'periwinkle',
    path: 'M2 40C18 41 28 32 43 34C60 36 67 27 84 29C101 31 111 19 129 22C148 25 158 11 174 15C190 19 201 9 218 8',
  },
] as const

const activityItems: readonly ActivityItem[] = [
  {
    title: 'Đơn hàng mẫu được ghi nhận',
    meta: '2 phút trước · Chi nhánh trung tâm',
    status: 'Mới',
    variant: 'info',
    icon: ShoppingBag,
  },
  {
    title: 'Yêu cầu hoàn tiền cần rà soát',
    meta: '18 phút trước · Quy trình demo',
    status: 'Cần xem',
    variant: 'warning',
    icon: RotateCcw,
  },
  {
    title: 'Danh mục sản phẩm được đồng bộ',
    meta: '1 giờ trước · Dữ liệu trình diễn',
    status: 'Hoàn tất',
    variant: 'success',
    icon: PackageCheck,
  },
]

const scheduleItems = [
  { time: '09:30', title: 'Rà soát đơn hàng', tone: 'bg-admin-sage' },
  { time: '13:00', title: 'Kiểm tra tồn kho', tone: 'bg-admin-periwinkle' },
  { time: '16:15', title: 'Tổng kết vận hành', tone: 'bg-admin-apricot' },
] as const

const chartBars = [36, 48, 42, 62, 57, 76, 68, 84, 72, 91, 78, 96] as const
</script>

<template>
  <AdminLayout>
    <template #page-header>
      <section
        class="admin-glass-panel relative overflow-hidden rounded-3xl px-5 py-6 sm:px-7 sm:py-7 lg:px-8"
        aria-label="Tổng quan quản trị"
      >
        <div class="pointer-events-none absolute -right-12 -top-20 size-56 rounded-full bg-admin-sage/55 blur-3xl" aria-hidden="true" />
        <div class="pointer-events-none absolute bottom-0 right-28 size-28 rounded-full bg-admin-periwinkle/45 blur-3xl" aria-hidden="true" />
        <div class="relative z-1">
          <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
            <span class="inline-flex items-center gap-2 rounded-pill border border-white/85 bg-surface/65 px-3 py-1.5 text-caption font-semibold text-primary-800 shadow-xs backdrop-blur">
              <Sparkles class="size-3.5" aria-hidden="true" />
              Light Premium Glass
            </span>
            <span class="rounded-pill border border-white/80 bg-surface/55 px-3 py-1.5 text-caption text-muted-foreground backdrop-blur">
              Cập nhật demo · 08:45
            </span>
          </div>
          <PageHeader
            title="Một nhịp vận hành thật nhẹ nhàng."
            description="Không gian quản trị Mizuki được thiết kế để giữ thông tin rõ ràng, ưu tiên đúng việc và dễ nhìn trong suốt ngày làm việc."
          >
            <template #eyebrow>F2f · Premium Admin Dashboard</template>
            <template #actions>
              <BaseButton class="!text-white hover:!text-white">
                <template #icon><Plus class="size-4" /></template>
                Tác vụ mẫu
              </BaseButton>
            </template>
          </PageHeader>
        </div>
      </section>
    </template>

    <div class="mt-5 grid gap-4 md:grid-cols-3 xl:gap-5" data-testid="admin-summary-grid">
      <AdminMetricCard
        v-for="card in summaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :note="card.note"
        :delta="card.delta"
        :trend="card.trend"
        :accent="card.accent"
        :path="card.path"
      />
    </div>

    <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.75fr)]">
      <section
        class="admin-premium-card admin-soft-grid relative min-h-88 overflow-hidden rounded-3xl border border-primary-900/20 bg-primary-950 p-6 text-primary-foreground shadow-sm sm:p-7"
        aria-labelledby="analytics-title"
      >
        <div class="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary-500/25 blur-3xl" aria-hidden="true" />
        <div class="relative z-1 flex h-full flex-col">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-caption uppercase tracking-[0.15em] text-primary-200">Analytics preview</p>
              <h2 id="analytics-title" class="mt-2 text-heading-2 tracking-[-0.025em] text-white">
                Nhịp vận hành
              </h2>
              <p class="mt-2 max-w-xl text-body-sm text-primary-100/75">
                Biểu đồ CSS trình diễn ngôn ngữ dữ liệu; không đại diện dữ liệu thật.
              </p>
            </div>
            <span class="rounded-pill border border-white/15 bg-white/10 px-3 py-1.5 text-caption text-primary-50 backdrop-blur">
              12 tuần gần nhất
            </span>
          </div>

          <div class="mt-8 flex min-h-44 flex-1 items-end gap-2 sm:gap-3" role="img" aria-label="Biểu đồ cột minh họa xu hướng vận hành">
            <div
              v-for="(height, index) in chartBars"
              :key="index"
              class="group relative flex h-full min-w-0 flex-1 items-end"
            >
              <div
                class="w-full rounded-t-pill bg-primary-200/55 transition-colors duration-(--duration-normal) group-hover:bg-primary-100/85"
                :style="{ height: `${height}%` }"
              />
            </div>
          </div>

          <div class="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
            <div>
              <p class="text-caption text-primary-200/70">Hiệu suất</p>
              <p class="mt-1 text-body-lg font-semibold text-white">92%</p>
            </div>
            <div>
              <p class="text-caption text-primary-200/70">Ổn định</p>
              <p class="mt-1 text-body-lg font-semibold text-white">98,4%</p>
            </div>
            <div>
              <p class="text-caption text-primary-200/70">Phản hồi</p>
              <p class="mt-1 text-body-lg font-semibold text-white">4m</p>
            </div>
          </div>
        </div>
      </section>

      <aside class="admin-premium-card relative overflow-hidden rounded-3xl border border-primary-200/75 bg-admin-sage-soft p-6 shadow-xs sm:p-7">
        <div class="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full border-[18px] border-white/45" aria-hidden="true" />
        <div class="relative z-1">
          <span class="grid size-12 place-items-center rounded-2xl border border-white/90 bg-white/70 text-primary-700 shadow-xs">
            <CheckCircle2 class="size-6" aria-hidden="true" />
          </span>
          <p class="mt-8 text-caption uppercase tracking-[0.14em] text-primary-700">System pulse</p>
          <h2 class="mt-2 text-heading-2 tracking-[-0.025em]">Mọi thứ đang ổn định.</h2>
          <p class="mt-3 text-body-sm text-muted-foreground">
            Feature card trình diễn cách Mizuki dùng sage, glass chip và hình học mềm cho nội dung nổi bật.
          </p>
          <div class="mt-7 flex flex-wrap gap-2">
            <BaseBadge variant="success">Hệ thống tốt</BaseBadge>
            <BaseBadge variant="outline" class="border-white/90 bg-white/55">Demo only</BaseBadge>
          </div>
          <button
            type="button"
            class="motion-interactive mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary-200 bg-white/70 px-4 text-body-sm font-medium text-primary-900 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Xem chi tiết mẫu
            <ArrowRight class="size-4" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </div>

    <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <section class="admin-premium-card rounded-3xl border border-border/80 bg-surface p-5 shadow-xs sm:p-6" aria-labelledby="activity-title">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-caption uppercase tracking-[0.14em] text-primary-700">Live structure</p>
            <h2 id="activity-title" class="mt-1.5 text-heading-3 tracking-[-0.02em]">Hoạt động gần đây</h2>
          </div>
          <BaseButton variant="ghost" size="sm">Xem tất cả</BaseButton>
        </div>
        <div class="mt-5 divide-y divide-border">
          <article v-for="item in activityItems" :key="item.title" class="flex min-w-0 items-center gap-4 py-4 first:pt-0 last:pb-0">
            <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-subtle text-primary-700">
              <component :is="item.icon" class="size-5" aria-hidden="true" />
            </span>
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-body-md font-medium">{{ item.title }}</h3>
              <p class="mt-1 truncate text-caption text-muted-foreground">{{ item.meta }}</p>
            </div>
            <BaseBadge :variant="item.variant" size="sm">{{ item.status }}</BaseBadge>
          </article>
        </div>
      </section>

      <section class="admin-premium-card rounded-3xl border border-border/80 bg-surface p-5 shadow-xs sm:p-6" aria-labelledby="schedule-title">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-caption uppercase tracking-[0.14em] text-primary-700">Hôm nay</p>
            <h2 id="schedule-title" class="mt-1.5 text-heading-3 tracking-[-0.02em]">Lịch vận hành</h2>
          </div>
          <span class="grid size-10 place-items-center rounded-xl bg-admin-powder/55 text-info">
            <CalendarDays class="size-5" aria-hidden="true" />
          </span>
        </div>
        <div class="mt-5 grid gap-3">
          <div
            v-for="item in scheduleItems"
            :key="item.time"
            class="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface-subtle/70 p-3"
          >
            <span :class="['h-9 w-1.5 shrink-0 rounded-pill', item.tone]" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="text-body-sm font-medium">{{ item.title }}</p>
              <p class="mt-0.5 inline-flex items-center gap-1 text-caption text-muted-foreground">
                <Clock3 class="size-3.5" aria-hidden="true" />
                {{ item.time }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </AdminLayout>
</template>
