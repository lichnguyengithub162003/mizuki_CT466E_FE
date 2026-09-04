<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Check, ChevronDown,
  Clipboard, Columns3, Package, RefreshCw, Search, SlidersHorizontal, X,
} from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import BasePopover from '@/components/common/BasePopover.vue'
import AdminOrdersFilterMenu from '@/components/admin/AdminOrdersFilterMenu.vue'
import { getAdminList } from '@/api/adminApi'
import { useAdminOrdersInfinite } from '@/queries/admin'
import { useAuthStore } from '@/stores/auth'
import type { AdminListParams, AdminOrderListRecord, AdminRecord } from '@/types/admin'
import { isApplicationError } from '@/types/admin'

type ColumnKey = 'customer' | 'branch' | 'delivery' | 'payment' | 'total' | 'status' | 'created_at'
type SortKey = NonNullable<AdminListParams['sort_by']>
type DatePreset = '' | 'today' | '7d' | '30d' | 'custom'

const router = useRouter()
const auth = useAuthStore()
const searchField = ref<HTMLInputElement | null>(null)
const searchInput = ref('')
const keyword = ref('')
const status = ref('')
const branchId = ref<number | undefined>()
const datePreset = ref<DatePreset>('')
const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref<SortKey>('created_at')
const sortDirection = ref<'asc' | 'desc'>('desc')
const copiedId = ref<number | null>(null)
const columnsOpen = ref(false)
const mobileSentinel = ref<HTMLElement | null>(null)
let searchTimer: number | undefined
let copyTimer: number | undefined
let mobileObserver: IntersectionObserver | undefined

const defaultColumns: ColumnKey[] = ['customer', 'branch', 'delivery', 'payment', 'total', 'status', 'created_at']
function loadColumns(): Set<ColumnKey> {
  try {
    const stored = JSON.parse(localStorage.getItem('admin.orders.visibleColumns') ?? 'null')
    if (Array.isArray(stored)) return new Set(stored.filter((value): value is ColumnKey => defaultColumns.includes(value)))
  } catch { /* invalid preferences fall back safely */ }
  return new Set(defaultColumns)
}
const visibleColumns = reactive(loadColumns())

watch(searchInput, (value) => {
  window.clearTimeout(searchTimer)
  if (!value) {
    keyword.value = ''
    return
  }
  searchTimer = window.setTimeout(() => { keyword.value = value.trim() }, 320)
})
watch(visibleColumns, () => localStorage.setItem('admin.orders.visibleColumns', JSON.stringify([...visibleColumns])))
watch(mobileSentinel, (element) => {
  mobileObserver?.disconnect()
  if (!element || typeof IntersectionObserver === 'undefined') return
  mobileObserver = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting && ordersQuery.hasNextPage.value && !ordersQuery.isFetchingNextPage.value) {
      void ordersQuery.fetchNextPage()
    }
  }, { rootMargin: '480px 0px' })
  mobileObserver.observe(element)
})
onBeforeUnmount(() => {
  window.clearTimeout(searchTimer)
  window.clearTimeout(copyTimer)
  mobileObserver?.disconnect()
})

const params = computed<AdminListParams>(() => ({
  keyword: keyword.value || undefined,
  status: status.value || undefined,
  branch_id: auth.role === 'super_admin' ? branchId.value : undefined,
  date_from: dateFrom.value || undefined,
  date_to: dateTo.value || undefined,
  sort_by: sortBy.value,
  sort_direction: sortDirection.value,
  per_page: 40,
}))
const ordersQuery = useAdminOrdersInfinite<AdminOrderListRecord>(params)
const branchQuery = useQuery({
  queryKey: ['admin', 'orders', 'branch-options'],
  queryFn: () => getAdminList<AdminRecord>('branches', { per_page: 100 }),
  enabled: computed(() => auth.role === 'super_admin'),
  staleTime: 5 * 60 * 1000,
})
const rows = computed(() => {
  const unique = new Map<number, AdminOrderListRecord>()
  for (const page of ordersQuery.data.value?.pages ?? []) {
    for (const order of page.items) unique.set(order.id, order)
  }
  return [...unique.values()]
})
const hasFilters = computed(() => Boolean(keyword.value || status.value || branchId.value || datePreset.value))
const initialErrorKind = computed(() => isApplicationError(ordersQuery.error.value) ? ordersQuery.error.value.kind : 'unknown')

const statuses = [
  ['', 'Tất cả trạng thái'], ['pending', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'],
  ['processing', 'Chờ lấy hàng'], ['shipping', 'Đang giao'], ['completed', 'Hoàn thành'],
  ['cancelled', 'Đã hủy'], ['refund_requested', 'Yêu cầu hoàn tiền'],
  ['refunded', 'Đã hoàn tiền'],
] as const
const statusOptions = statuses.map(([value, label]) => ({ value, label }))
const dateOptions: Array<{ value: DatePreset; label: string }> = [
  { value: '', label: 'Mọi thời gian' }, { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày gần đây' }, { value: '30d', label: '30 ngày gần đây' },
  { value: 'custom', label: 'Khoảng tùy chọn' },
]
const branchOptions = computed(() => [
  { value: '', label: 'Tất cả chi nhánh' },
  ...(branchQuery.data.value?.items ?? []).map(branch => ({ value: String(branch.id), label: branch.name })),
])
const columns: Array<{ key: ColumnKey; label: string }> = [
  { key: 'customer', label: 'Khách hàng' }, { key: 'branch', label: 'Chi nhánh' },
  { key: 'delivery', label: 'Giao nhận' }, { key: 'payment', label: 'Thanh toán' },
  { key: 'total', label: 'Tổng tiền' }, { key: 'status', label: 'Trạng thái' },
  { key: 'created_at', label: 'Đặt lúc' },
]
function localDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
function applyDatePreset(): void {
  const today = new Date()
  if (!datePreset.value) { dateFrom.value = ''; dateTo.value = ''; return }
  if (datePreset.value === 'custom') return
  const days = datePreset.value === 'today' ? 0 : datePreset.value === '7d' ? 6 : 29
  const from = new Date(today)
  from.setDate(from.getDate() - days)
  dateFrom.value = localDate(from)
  dateTo.value = localDate(today)
}
function setBranch(value: string): void { branchId.value = value ? Number(value) : undefined }
function setDatePreset(value: string): void {
  datePreset.value = value as DatePreset
  applyDatePreset()
}
function toggleSort(key: SortKey): void {
  if (sortBy.value !== key) { sortBy.value = key; sortDirection.value = 'asc'; return }
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}
function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
  return sortBy.value === key ? (sortDirection.value === 'asc' ? 'ascending' : 'descending') : 'none'
}
function columnVisible(key: ColumnKey): boolean {
  return visibleColumns.has(key) && !(key === 'branch' && auth.role === 'branch_manager')
}
function toggleColumn(key: ColumnKey): void {
  visibleColumns.has(key) ? visibleColumns.delete(key) : visibleColumns.add(key)
}
function clearSearch(): void {
  searchInput.value = ''
  keyword.value = ''
  searchField.value?.focus()
}
function openOrder(id: number): void { void router.push(`/admin/orders/${id}`) }
async function copyOrder(order: AdminOrderListRecord, event: Event): Promise<void> {
  event.stopPropagation()
  await navigator.clipboard.writeText(order.order_number)
  copiedId.value = order.id
  window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => { copiedId.value = null }, 1600)
}
function onTableScroll(event: Event): void {
  const target = event.currentTarget as HTMLElement
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 320
    && ordersQuery.hasNextPage.value && !ordersQuery.isFetchingNextPage.value) {
    void ordersQuery.fetchNextPage()
  }
}
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const paymentLabel = (value: string) => ({ cash: 'COD / Tiền mặt', vnpay: 'VNPay', wallet: 'Ví Mizuki', bank_transfer: 'Chuyển khoản' } as Record<string, string>)[value] ?? value
const deliveryLabel = (value: string) => value === 'delivery' ? 'Giao tận nơi' : 'Nhận tại quầy'
const statusTone = (value: string) => ({ pending: 'bg-amber-500', confirmed: 'bg-sky-500', processing: 'bg-indigo-500', shipping: 'bg-violet-500', completed: 'bg-emerald-600', cancelled: 'bg-slate-400', refund_requested: 'bg-orange-500', refunded: 'bg-teal-500' } as Record<string, string>)[value] ?? 'bg-slate-400'
const paymentTone = (value?: string | null) => value === 'paid' ? 'bg-emerald-500' : value === 'failed' || value === 'cancelled' ? 'bg-rose-500' : value === 'refunded' ? 'bg-teal-500' : 'bg-amber-500'
</script>

<template>
  <section class="orders-v2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label="Danh sách đơn hàng">
    <div data-testid="orders-toolbar-shell" class="orders-rounded-shell relative mb-3 shrink-0 p-2 shadow-[0_1px_2px_rgba(16,28,19,.04),0_8px_24px_rgba(16,28,19,.045)] ring-1 ring-black/[0.035]">
      <span v-if="ordersQuery.isFetching.value && !ordersQuery.isFetchingNextPage.value" data-testid="orders-background-progress" class="absolute inset-x-3 top-0 h-px overflow-hidden rounded-full bg-primary-100" aria-label="Đang cập nhật danh sách"><span class="block h-full w-1/3 animate-[orders-progress_1s_ease-in-out_infinite] bg-primary-600" /></span>
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-[15rem] flex-[1_1_22rem]">
          <span class="sr-only">Tìm kiếm đơn hàng</span>
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input ref="searchField" v-model="searchInput" type="search" placeholder="Mã đơn, khách hàng, email hoặc số điện thoại" class="orders-search h-10 w-full rounded-xl bg-surface-subtle pl-9 pr-9 text-[0.8125rem] outline-none ring-1 ring-inset ring-transparent transition focus:bg-surface focus:ring-primary-500">
          <button v-if="searchInput" type="button" aria-label="Xóa tìm kiếm" class="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-primary-50 hover:text-primary-800" @click="clearSearch"><X class="size-3.5" /></button>
        </label>
        <AdminOrdersFilterMenu v-model="status" label="Lọc trạng thái" :options="statusOptions" />
        <AdminOrdersFilterMenu v-if="auth.role === 'super_admin'" :model-value="branchId ? String(branchId) : ''" label="Lọc theo chi nhánh" :options="branchOptions" @update:model-value="setBranch" />
        <AdminOrdersFilterMenu :model-value="datePreset" label="Lọc ngày đặt" :options="dateOptions" @update:model-value="setDatePreset" />
        <BasePopover v-model="columnsOpen" align="end" :side-offset="6" class="w-56 p-2">
          <template #trigger><button type="button" class="orders-column-trigger" aria-label="Cột hiển thị" :aria-expanded="columnsOpen"><Columns3 class="size-4 shrink-0" /><span class="min-w-0 flex-1 truncate text-left">Cột hiển thị</span><span class="grid size-5 shrink-0 place-items-center text-muted-foreground"><ChevronDown class="size-3.5 transition-transform duration-150" :class="columnsOpen && 'rotate-180'" /></span></button></template>
          <div>
            <p class="px-2 py-1 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Tùy chỉnh bảng</p>
            <label v-for="column in columns" v-show="column.key !== 'branch' || auth.role === 'super_admin'" :key="column.key" class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[0.8125rem] hover:bg-surface-subtle"><input type="checkbox" :checked="visibleColumns.has(column.key)" class="accent-primary-700" @change="toggleColumn(column.key)">{{ column.label }}</label>
            <div class="mt-1 border-t border-border/70 px-2 pt-2 text-[0.6875rem] text-muted-foreground">Cột Đơn hàng luôn hiển thị</div>
          </div>
        </BasePopover>
      </div>
      <div v-if="datePreset === 'custom'" class="mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 px-1 pt-2">
        <CalendarDays class="size-4 text-muted-foreground" /><label class="text-[0.75rem] text-muted-foreground">Từ <input v-model="dateFrom" type="date" aria-label="Từ ngày" class="ml-1 rounded-lg bg-surface-subtle px-2 py-1.5 text-foreground"></label><label class="text-[0.75rem] text-muted-foreground">Đến <input v-model="dateTo" type="date" aria-label="Đến ngày" :min="dateFrom" class="ml-1 rounded-lg bg-surface-subtle px-2 py-1.5 text-foreground"></label>
      </div>
    </div>

    <div v-if="ordersQuery.isPending.value && !rows.length" data-testid="orders-initial-loading" class="orders-rounded-shell min-h-0 flex-1 shadow-xs"><div class="h-10 bg-surface-subtle" /><div class="grid gap-px bg-border/50"><div v-for="index in 8" :key="index" class="flex h-16 items-center gap-4 bg-surface px-5"><BaseSkeleton class="size-10 rounded-lg"/><BaseSkeleton class="h-3 w-28"/><BaseSkeleton class="h-3 flex-1"/><BaseSkeleton class="h-3 w-24"/></div></div></div>
    <div v-else-if="ordersQuery.isError.value && !rows.length" role="alert" class="orders-rounded-shell min-h-0 flex-1 px-6 py-12 text-center shadow-xs"><p class="font-medium">{{ initialErrorKind === 'forbidden' ? 'Bạn không có quyền xem danh sách này' : 'Không thể tải danh sách đơn hàng' }}</p><button type="button" class="mt-3 inline-flex items-center gap-2 text-[0.8125rem] font-medium text-primary-700" @click="ordersQuery.refetch()"><RefreshCw class="size-4"/>Thử lại</button></div>
    <div v-else-if="!rows.length" data-testid="orders-empty" class="orders-rounded-shell min-h-0 flex-1 px-6 py-14 text-center shadow-xs"><div class="mx-auto grid size-11 place-items-center rounded-xl bg-primary-50 text-primary-700"><SlidersHorizontal class="size-5"/></div><h2 class="mt-3 text-[0.9375rem] font-medium">{{ hasFilters ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng' }}</h2><p class="mt-1 text-[0.8125rem] text-muted-foreground">{{ hasFilters ? 'Thử điều chỉnh từ khóa hoặc bộ lọc.' : 'Đơn hàng mới sẽ xuất hiện tại đây.' }}</p></div>

    <template v-else>
      <div data-testid="orders-table-shell" class="orders-rounded-shell hidden min-h-0 flex-1 shadow-[0_1px_2px_rgba(16,28,19,.04),0_12px_30px_rgba(16,28,19,.04)] ring-1 ring-black/[0.035] md:flex">
        <div data-testid="orders-scroll-region" class="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain" @scroll.passive="onTableScroll">
        <table class="w-max min-w-full table-fixed border-separate border-spacing-0 text-left text-[0.8125rem]">
          <colgroup><col class="w-[20rem]"><col v-if="columnVisible('customer')" class="w-[15rem]"><col v-if="columnVisible('branch')" class="w-[12.5rem]"><col v-if="columnVisible('delivery')" class="w-[13rem]"><col v-if="columnVisible('payment')" class="w-[12rem]"><col v-if="columnVisible('total')" class="w-[9.5rem]"><col v-if="columnVisible('status')" class="w-[11rem]"><col v-if="columnVisible('created_at')" class="w-[10rem]"></colgroup>
          <thead class="sticky top-0 z-20 bg-white/92 text-xs leading-4 text-muted-foreground backdrop-blur-md">
            <tr>
              <th :aria-sort="ariaSort('order_number')" class="sticky left-0 z-30 border-b border-border/60 bg-white/95 px-5 py-3 font-medium shadow-[6px_0_12px_-13px_rgba(16,28,19,.38)]"><button type="button" class="sort-button" @click="toggleSort('order_number')">Đơn hàng <component :is="sortBy === 'order_number' ? sortDirection === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown" class="sort-icon" /></button></th>
              <th v-if="columnVisible('customer')" class="border-b border-border/70 px-4 py-3 font-medium">Khách hàng</th>
              <th v-if="columnVisible('branch')" class="border-b border-border/70 px-4 py-3 font-medium">Chi nhánh</th>
              <th v-if="columnVisible('delivery')" class="border-b border-border/70 px-4 py-3 font-medium">Giao nhận</th>
              <th v-if="columnVisible('payment')" class="w-[10rem] border-b border-border/70 px-4 py-3 font-medium">Thanh toán</th>
              <th v-if="columnVisible('total')" :aria-sort="ariaSort('total_amount')" class="w-[9rem] border-b border-border/70 px-4 py-3 font-medium"><button type="button" class="sort-button" @click="toggleSort('total_amount')">Tổng tiền <component :is="sortBy === 'total_amount' ? sortDirection === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown" class="sort-icon" /></button></th>
              <th v-if="columnVisible('status')" :aria-sort="ariaSort('status')" class="w-[10rem] border-b border-border/70 px-4 py-3 font-medium"><button type="button" class="sort-button" @click="toggleSort('status')">Trạng thái <component :is="sortBy === 'status' ? sortDirection === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown" class="sort-icon" /></button></th>
              <th v-if="columnVisible('created_at')" :aria-sort="ariaSort('created_at')" class="w-[9rem] border-b border-border/70 px-4 py-3 font-medium"><button type="button" class="sort-button" @click="toggleSort('created_at')">Đặt lúc <component :is="sortBy === 'created_at' ? sortDirection === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown" class="sort-icon" /></button></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in rows" :key="order.id" tabindex="0" class="group h-16 cursor-pointer outline-none transition-colors duration-150 hover:bg-[#f8fbf9] focus-visible:bg-primary-50/70" @click="openOrder(order.id)" @keydown.enter="openOrder(order.id)">
              <td class="sticky left-0 z-10 border-b border-border/50 bg-surface px-5 py-2.5 shadow-[6px_0_12px_-13px_rgba(16,28,19,.38)] transition-colors duration-150 group-hover:bg-[#f8fbf9] group-focus-visible:bg-primary-50/70"><div class="flex items-center gap-3.5"><span class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-50 text-primary-700"><img v-if="order.items[0]?.image_url" :src="order.items[0].image_url" :alt="order.items[0].product_name" loading="lazy" decoding="async" class="size-full object-cover"><Package v-else class="size-4" /></span><div class="min-w-0"><div class="flex items-center gap-1.5"><span class="truncate font-medium tracking-[-0.01em] text-primary-950" :title="order.order_number">{{ order.order_number }}</span><button type="button" :aria-label="copiedId === order.id ? 'Đã sao chép mã đơn' : 'Sao chép mã đơn'" :title="copiedId === order.id ? 'Đã sao chép' : 'Sao chép mã đơn'" class="grid size-7 shrink-0 place-items-center rounded-md text-text-muted transition-colors duration-150 hover:bg-primary-100 hover:text-primary-800" @click="copyOrder(order, $event)"><Check v-if="copiedId === order.id" class="size-3.5 text-success"/><Clipboard v-else class="size-3.5"/></button></div><p class="truncate text-[0.6875rem] text-muted-foreground">{{ order.items.length }} dòng sản phẩm</p></div></div></td>
              <td v-if="columnVisible('customer')" class="border-b border-border/55 px-4 py-2.5"><p class="max-w-[10rem] truncate text-foreground" :title="order.customer.name || 'Khách vãng lai'">{{ order.customer.name || 'Khách vãng lai' }}</p><p class="mt-0.5 max-w-[10rem] truncate text-[0.6875rem] text-muted-foreground" :title="order.customer.phone || order.customer.email || ''">{{ order.customer.phone || order.customer.email || 'Không có liên hệ' }}</p></td>
              <td v-if="columnVisible('branch')" class="border-b border-border/55 px-4 py-2.5"><p class="max-w-[10.5rem] truncate" :title="order.branch.name">{{ order.branch.name }}</p></td>
              <td v-if="columnVisible('delivery')" class="border-b border-border/55 px-4 py-2.5"><p>{{ deliveryLabel(order.delivery_method) }}</p><p class="mt-0.5 text-[0.6875rem] text-muted-foreground">{{ order.delivery_method === 'delivery' ? 'Vận chuyển' : 'Tại chi nhánh' }}</p></td>
              <td v-if="columnVisible('payment')" class="border-b border-border/55 px-4 py-2.5"><p class="font-medium text-foreground">{{ paymentLabel(order.payment_method) }}</p><p class="mt-1 inline-flex items-center gap-1.5 whitespace-nowrap text-[0.6875rem] text-muted-foreground"><span :class="['size-1.5 rounded-full', paymentTone(order.payment_status)]"/>{{ order.payment_status_label || 'Chờ thanh toán' }}</p></td>
              <td v-if="columnVisible('total')" class="border-b border-border/55 px-4 py-2.5 tabular-nums font-medium text-primary-950">{{ money(order.total_amount) }}</td>
              <td v-if="columnVisible('status')" class="border-b border-border/55 px-4 py-2.5"><span class="inline-flex items-center gap-2 whitespace-nowrap"><span :class="['size-2 rounded-full', statusTone(order.status)]"/><span>{{ order.status_label }}</span></span></td>
              <td v-if="columnVisible('created_at')" class="border-b border-border/55 px-4 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">{{ dateTime(order.placed_at || order.created_at) }}</td>
            </tr>
            <tr v-if="ordersQuery.isFetchingNextPage.value"><td :colspan="8" class="h-14 px-4"><div class="flex items-center justify-center gap-2 text-[0.75rem] text-muted-foreground"><RefreshCw class="size-3.5 animate-spin"/>Đang tải thêm đơn hàng…</div></td></tr>
          </tbody>
        </table>
        <div v-if="ordersQuery.isFetchNextPageError.value" class="flex h-14 items-center justify-center gap-3 border-t border-border/60 text-[0.75rem] text-muted-foreground"><span>Không thể tải thêm.</span><button type="button" class="font-medium text-primary-700" @click="ordersQuery.fetchNextPage()">Thử lại</button></div>
          <div v-else-if="!ordersQuery.hasNextPage.value" class="flex h-12 items-center justify-center text-[0.6875rem] text-text-muted">Đã hiển thị tất cả {{ rows.length.toLocaleString('vi-VN') }} đơn hàng</div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain md:hidden" data-testid="orders-mobile-list"><div class="grid gap-2">
        <article v-for="order in rows" :key="order.id" tabindex="0" class="orders-rounded-shell p-4 shadow-xs ring-1 ring-black/[0.035] transition-colors active:bg-primary-50/60" @click="openOrder(order.id)" @keydown.enter="openOrder(order.id)">
          <div class="flex items-start gap-3"><span class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-50 text-primary-700"><img v-if="order.items[0]?.image_url" :src="order.items[0].image_url" :alt="order.items[0].product_name" loading="lazy" decoding="async" class="size-full object-cover"><Package v-else class="size-4"/></span><div class="min-w-0 flex-1"><div class="flex items-center gap-1"><h2 class="truncate text-[0.875rem] font-medium">{{ order.order_number }}</h2><button type="button" :aria-label="copiedId === order.id ? 'Đã sao chép mã đơn' : 'Sao chép mã đơn'" class="grid size-7 shrink-0 place-items-center text-muted-foreground" @click="copyOrder(order, $event)"><Check v-if="copiedId === order.id" class="size-3.5 text-success"/><Clipboard v-else class="size-3.5"/></button></div><p class="truncate text-[0.75rem] text-muted-foreground">{{ order.customer.name || 'Khách vãng lai' }}</p></div><span class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[0.75rem]"><span :class="['size-2 rounded-full', statusTone(order.status)]"/>{{ order.status_label }}</span></div>
          <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-[0.75rem]"><div><p class="text-[0.6875rem] text-text-muted">Tổng tiền</p><p class="mt-0.5 font-medium">{{ money(order.total_amount) }}</p></div><div><p class="text-[0.6875rem] text-text-muted">Thanh toán</p><p class="mt-0.5 truncate">{{ paymentLabel(order.payment_method) }}</p></div><div><p class="text-[0.6875rem] text-text-muted">Đặt lúc</p><p class="mt-0.5 tabular-nums">{{ dateTime(order.placed_at || order.created_at) }}</p></div><div><p class="text-[0.6875rem] text-text-muted">Giao nhận</p><p class="mt-0.5">{{ deliveryLabel(order.delivery_method) }}</p></div></div>
        </article>
        <div v-if="ordersQuery.hasNextPage.value" ref="mobileSentinel" class="flex min-h-11 items-center justify-center text-[0.75rem] text-muted-foreground" aria-live="polite"><RefreshCw v-if="ordersQuery.isFetchingNextPage.value" class="mr-2 size-3.5 animate-spin"/>{{ ordersQuery.isFetchingNextPage.value ? 'Đang tải thêm…' : 'Cuộn để tải thêm đơn hàng' }}</div>
        <p v-else class="py-3 text-center text-[0.6875rem] text-text-muted">Đã hiển thị tất cả đơn hàng</p></div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.orders-rounded-shell { overflow: hidden; border-radius: 1rem; background: var(--surface); isolation: isolate; }
.orders-search::-webkit-search-cancel-button { appearance: none; display: none; }
.orders-column-trigger { display: flex; height: 2.5rem; min-width: 9.75rem; max-width: 12rem; align-items: center; gap: .625rem; border: 1px solid rgba(16, 28, 19, .055); border-radius: .75rem; background: var(--surface-subtle); padding: 0 .625rem 0 .75rem; color: var(--foreground); font-size: .8125rem; box-shadow: 0 1px 2px rgba(16, 28, 19, .025); outline: none; transition: background-color 150ms, border-color 150ms, box-shadow 150ms; }
.orders-column-trigger:hover { border-color: rgba(39, 93, 70, .14); background: var(--surface); }
.orders-column-trigger:focus-visible { border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(39, 93, 70, .1); }
.sort-button { display: inline-flex; align-items: center; gap: .375rem; white-space: nowrap; transition: color 150ms; }
.sort-button:hover { color: var(--primary-800); }
.sort-icon { width: .875rem; height: .875rem; flex: none; transition: transform 150ms ease, color 150ms ease; }
@keyframes orders-progress { 0% { transform: translateX(-100%); } 50% { transform: translateX(150%); } 100% { transform: translateX(400%); } }
@media (prefers-reduced-motion: reduce) { .orders-v2 *, .orders-v2 *::before, .orders-v2 *::after { transition-duration: 1ms !important; animation-duration: 1ms !important; } }
</style>
