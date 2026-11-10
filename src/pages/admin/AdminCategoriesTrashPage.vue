<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, RefreshCw, RotateCcw, Search, Trash2, X } from '@lucide/vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import { getAdminCategoryTrash, restoreAdminCategory } from '@/api/adminApi'
import { useAuthStore } from '@/stores/auth'
import type { AdminCategoryTrashRecord, AdminPagination } from '@/types/admin'
import type { AdminCategoryStatus } from '@/types/adminCategory'

const auth = useAuthStore()
const searchInput = ref('')
const keyword = ref('')
const page = ref(1)
const rows = ref<AdminCategoryTrashRecord[]>([])
const pagination = ref<AdminPagination>({ current_page: 1, per_page: 20, total: 0, last_page: 1 })
const loading = ref(false)
const error = ref<'unauthorized' | 'forbidden' | 'unavailable' | ''>('')
const notice = ref('')
const restoreTarget = ref<AdminCategoryTrashRecord | null>(null)
const restoring = ref(false)
const restoreError = ref('')
const dialog = ref<HTMLElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)
const searchField = ref<HTMLInputElement | null>(null)
const statusLabels: Record<AdminCategoryStatus, string> = {
  draft: 'Bản nháp', published: 'Đã xuất bản', hidden: 'Đã ẩn',
}
let searchTimer: ReturnType<typeof setTimeout> | undefined
let listRequest = 0
let restoreRequest = 0
let opener: HTMLButtonElement | null = null

function errorStatus(cause: unknown): number | undefined {
  if (typeof cause !== 'object' || cause === null) return undefined
  const value = cause as { status?: number; kind?: string; response?: { status?: number } }
  if (value.kind === 'unauthorized') return 401
  if (value.kind === 'forbidden') return 403
  if (value.kind === 'not-found') return 404
  return value.status ?? value.response?.status
}
function formatDeletedAt(value: string | null): string {
  if (!value) return 'Chưa xác định thời điểm xóa'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Chưa xác định thời điểm xóa'
    : date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
}
function originalLocation(row: AdminCategoryTrashRecord): string {
  if (!row.delete_snapshot_captured) return 'Chưa có dữ liệu vị trí lúc xóa'
  if (row.deleted_from_parent_id === null) return 'Danh mục gốc khi xóa'
  return `ID cha lúc xóa: ${row.deleted_from_parent_id}`
}
function currentParent(row: AdminCategoryTrashRecord): string {
  if (!row.delete_snapshot_captured || row.deleted_from_parent_id === null) return ''
  return row.original_parent
    ? `Tên/slug hiện tại của cha: ${row.original_parent.name} · ${row.original_parent.slug}`
    : 'Tên/slug hiện tại của cha không có dữ liệu'
}
function onSearchInput(value: string): void {
  searchInput.value = value
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    keyword.value = value.trim()
    page.value = 1
  }, 320)
}
function clearSearch(): void {
  clearTimeout(searchTimer)
  searchInput.value = ''
  keyword.value = ''
  page.value = 1
}
async function load(): Promise<void> {
  const current = ++listRequest
  if (auth.role !== 'super_admin') {
    rows.value = []
    loading.value = false
    error.value = 'forbidden'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await getAdminCategoryTrash({ page: page.value, per_page: 20, ...(keyword.value ? { search: keyword.value } : {}) })
    if (current !== listRequest) return
    rows.value = result.items
    pagination.value = result.pagination
    if (page.value > 1 && !result.items.length && result.pagination.last_page < page.value) {
      page.value = Math.max(1, result.pagination.last_page)
    }
  } catch (cause) {
    if (current === listRequest) {
      const status = errorStatus(cause)
      error.value = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'unavailable'
    }
  } finally {
    if (current === listRequest) loading.value = false
  }
}
watch([keyword, page, () => auth.role], () => { void load() }, { immediate: true })

function openRestore(row: AdminCategoryTrashRecord, event: MouseEvent): void {
  if (auth.role !== 'super_admin' || !row.delete_snapshot_captured || restoring.value) return
  opener = event.currentTarget instanceof HTMLButtonElement ? event.currentTarget : null
  restoreTarget.value = row
  restoreError.value = ''
  void nextTick(() => cancelButton.value?.focus())
}
function closeRestore(restoreFocus = true): void {
  if (restoring.value) return
  restoreTarget.value = null
  restoreError.value = ''
  const previous = opener
  opener = null
  if (restoreFocus) void nextTick(() => previous?.isConnected && previous.focus())
}
function onDialogKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeRestore()
  } else if (event.key === 'Tab') {
    const buttons = dialog.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
    if (!buttons?.length) { event.preventDefault(); return }
    const first = buttons[0]!
    const last = buttons[buttons.length - 1]!
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
}
function restoreErrorMessage(cause: unknown): string {
  const status = errorStatus(cause)
  if (status === 409) return 'Không thể khôi phục do dữ liệu vị trí lúc xóa hoặc cấu trúc cây hiện không hợp lệ. Vui lòng kiểm tra danh mục cha ban đầu.'
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền khôi phục danh mục này.'
  if (status === 404) return 'Danh mục đã xóa không còn tồn tại. Vui lòng tải lại thùng rác.'
  return 'Không thể khôi phục danh mục do lỗi hệ thống. Vui lòng thử lại sau.'
}
async function confirmRestore(): Promise<void> {
  const target = restoreTarget.value
  if (!target || restoring.value || auth.role !== 'super_admin' || !target.delete_snapshot_captured) return
  const current = ++restoreRequest
  restoring.value = true
  restoreError.value = ''
  void nextTick(() => dialog.value?.focus())
  try {
    await restoreAdminCategory(target.id)
    if (current !== restoreRequest) return
    restoring.value = false
    closeRestore(false)
    notice.value = `Đã khôi phục danh mục “${target.name}”.`
    await load()
    await nextTick()
    searchField.value?.focus()
  } catch (cause) {
    if (current === restoreRequest) restoreError.value = restoreErrorMessage(cause)
  } finally {
    if (current === restoreRequest) {
      restoring.value = false
      if (restoreTarget.value) void nextTick(() => cancelButton.value?.focus())
    }
  }
}
watch(() => auth.role, role => {
  if (role !== 'super_admin') {
    restoreRequest++
    restoring.value = false
    restoreTarget.value = null
    restoreError.value = ''
  }
})
onBeforeUnmount(() => { listRequest++; restoreRequest++; clearTimeout(searchTimer) })
</script>

<template>
  <section class="min-w-0 space-y-4 pb-6" aria-label="Thùng rác danh mục" data-testid="category-trash-page">
    <RouterLink to="/admin/categories" class="inline-flex items-center gap-1.5 rounded-md text-[0.8125rem] font-medium text-primary-700 hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"><ArrowLeft class="size-4" aria-hidden="true" />Danh sách danh mục</RouterLink>
    <div class="min-w-0 overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-black/[0.05]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/55 px-4 py-4 sm:px-6">
        <div class="min-w-0"><p class="text-[0.6875rem] font-semibold uppercase tracking-[0.13em] text-primary-700">Quản lý danh mục</p><h1 class="mt-1 flex items-center gap-2 text-lg font-semibold text-primary-950"><Trash2 class="size-4.5 text-primary-700" aria-hidden="true" />Thùng rác</h1><p class="mt-1 text-[0.75rem] leading-5 text-muted-foreground">Danh mục đã xóa mềm. Khôi phục không tự đưa danh mục con hoặc sản phẩm về vị trí cũ.</p></div>
        <span v-if="!loading && !error" class="rounded-full bg-white px-3 py-1 text-[0.75rem] font-medium tabular-nums text-primary-800 ring-1 ring-primary-100" data-testid="category-trash-total">{{ pagination.total }} danh mục</span>
      </div>
      <div class="border-b border-border/60 px-4 py-3 sm:px-6">
        <label class="relative block max-w-md"><span class="sr-only">Tìm danh mục đã xóa theo tên hoặc slug</span><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input ref="searchField" :value="searchInput" type="text" role="searchbox" class="h-10 w-full rounded-xl border border-border bg-white pl-10 pr-10 text-[0.8125rem] text-primary-950 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" placeholder="Tìm theo tên hoặc slug" data-testid="category-trash-search" @input="onSearchInput(($event.target as HTMLInputElement).value)"><button v-if="searchInput" type="button" class="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-primary-50" aria-label="Xóa tìm kiếm" data-testid="category-trash-clear-search" @click="clearSearch"><X class="size-3.5" aria-hidden="true" /></button></label>
      </div>
      <p v-if="notice" class="mx-4 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[0.8125rem] font-medium text-emerald-800 sm:mx-6" role="status" data-testid="category-trash-notice">{{ notice }}</p>
      <div v-if="loading" class="space-y-2 p-4 sm:p-6" role="status" aria-label="Đang tải thùng rác danh mục" data-testid="category-trash-loading"><BaseSkeleton v-for="index in 4" :key="index" class="h-16 rounded-xl" /></div>
      <div v-else-if="error" class="px-5 py-12 text-center text-[0.8125rem]" role="alert" data-testid="category-trash-error"><p class="font-medium text-primary-950">{{ error === 'unauthorized' ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : error === 'forbidden' ? 'Bạn không có quyền xem thùng rác danh mục.' : 'Không thể tải thùng rác danh mục. Vui lòng thử lại.' }}</p><button v-if="error === 'unavailable'" type="button" class="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-primary-700 hover:bg-primary-50" data-testid="category-trash-retry" @click="load"><RefreshCw class="size-4" aria-hidden="true" />Thử lại</button></div>
      <div v-else-if="!rows.length" class="px-5 py-12 text-center text-[0.8125rem] text-muted-foreground" data-testid="category-trash-empty"><Trash2 class="mx-auto mb-3 size-6 text-primary-400" aria-hidden="true" />{{ keyword ? 'Không tìm thấy danh mục đã xóa theo từ khóa này.' : 'Thùng rác danh mục đang trống.' }}</div>
      <template v-else>
        <div class="hidden overflow-x-auto xl:block" data-testid="category-trash-table"><table class="w-full table-fixed text-left text-[0.8125rem]"><thead class="bg-primary-50/65 text-[0.75rem] font-semibold text-primary-800"><tr><th class="w-[27%] px-5 py-3">Danh mục</th><th class="w-[13%] px-3 py-3">Trạng thái</th><th class="w-[30%] px-3 py-3">Vị trí trước khi xóa</th><th class="w-[17%] px-3 py-3">Thời điểm xóa</th><th class="w-[13%] px-3 py-3 text-right">Thao tác</th></tr></thead><tbody class="divide-y divide-border/60"><tr v-for="row in rows" :key="row.id" :data-testid="`category-trash-row-${row.id}`"><td class="px-5 py-3.5"><p class="break-words font-semibold text-primary-950">{{ row.name }}</p><p class="mt-0.5 break-all text-[0.75rem] text-muted-foreground">ID {{ row.id }} · {{ row.slug }}</p></td><td class="px-3 py-3.5"><span class="rounded-full bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-700">{{ statusLabels[row.status] }}</span><span v-if="row.is_featured" class="mt-1 block text-[0.75rem] font-medium text-amber-800">Nổi bật</span></td><td class="px-3 py-3.5"><p class="break-words font-medium text-primary-900">{{ originalLocation(row) }}</p><p v-if="currentParent(row)" class="mt-0.5 break-words text-[0.75rem] text-muted-foreground">{{ currentParent(row) }}</p></td><td class="px-3 py-3.5 tabular-nums text-muted-foreground">{{ formatDeletedAt(row.deleted_at) }}</td><td class="px-3 py-3.5 text-right"><button v-if="row.delete_snapshot_captured && auth.role === 'super_admin'" type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-1.5 font-semibold text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" :data-testid="`category-trash-restore-${row.id}`" @click="openRestore(row, $event)"><RotateCcw class="size-3.5" aria-hidden="true" />Khôi phục</button><span v-else class="text-[0.75rem] text-muted-foreground">Chưa thể khôi phục</span></td></tr></tbody></table></div>
        <div class="grid gap-3 p-4 md:grid-cols-2 xl:hidden" data-testid="category-trash-cards"><article v-for="row in rows" :key="row.id" class="min-w-0 rounded-xl border border-border/70 bg-white p-4 shadow-xs" :data-testid="`category-trash-card-${row.id}`"><div class="flex min-w-0 items-start justify-between gap-2"><div class="min-w-0"><h2 class="break-words text-[0.8125rem] font-semibold text-primary-950">{{ row.name }}</h2><p class="mt-0.5 break-all text-[0.75rem] text-muted-foreground">ID {{ row.id }} · {{ row.slug }}</p></div><span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-700">{{ statusLabels[row.status] }}</span></div><p v-if="row.is_featured" class="mt-2 text-[0.75rem] font-medium text-amber-800">Nổi bật</p><div class="mt-3 border-t border-border/60 pt-3 text-[0.75rem]"><p class="break-words font-medium text-primary-900">{{ originalLocation(row) }}</p><p v-if="currentParent(row)" class="mt-0.5 break-words text-muted-foreground">{{ currentParent(row) }}</p><p class="mt-2 tabular-nums text-muted-foreground">Đã xóa: {{ formatDeletedAt(row.deleted_at) }}</p></div><div class="mt-3 flex justify-end"><button v-if="row.delete_snapshot_captured && auth.role === 'super_admin'" type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-1.5 text-[0.75rem] font-semibold text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" :data-testid="`category-trash-mobile-restore-${row.id}`" @click="openRestore(row, $event)"><RotateCcw class="size-3.5" aria-hidden="true" />Khôi phục</button><span v-else class="text-muted-foreground">Thiếu snapshot vị trí; chưa thể khôi phục</span></div></article></div>
      </template>
      <div v-if="!loading && !error && pagination.last_page > 1" class="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-[0.75rem] text-muted-foreground sm:px-6" data-testid="category-trash-pagination"><span>Trang {{ pagination.current_page }} / {{ pagination.last_page }}</span><div class="flex gap-2"><button type="button" class="rounded-lg border border-border px-3 py-1.5 font-medium text-primary-800 hover:bg-primary-50 disabled:opacity-40" :disabled="page <= 1" data-testid="category-trash-prev" @click="page--">Trước</button><button type="button" class="rounded-lg border border-border px-3 py-1.5 font-medium text-primary-800 hover:bg-primary-50 disabled:opacity-40" :disabled="page >= pagination.last_page" data-testid="category-trash-next" @click="page++">Tiếp</button></div></div>
    </div>
    <div v-if="restoreTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-3 sm:p-5" data-testid="category-restore-backdrop" @click.self="closeRestore()"><section ref="dialog" role="dialog" aria-modal="true" aria-labelledby="category-restore-title" aria-describedby="category-restore-description" tabindex="-1" class="w-full max-w-md rounded-2xl border border-primary-100 bg-white p-5 shadow-2xl shadow-primary-950/15 sm:p-6" data-testid="category-restore-dialog" @keydown="onDialogKeydown"><div class="grid size-9 place-items-center rounded-xl bg-primary-50 text-primary-700"><RotateCcw class="size-4" aria-hidden="true" /></div><h2 id="category-restore-title" class="mt-3 text-base font-semibold text-primary-950">Khôi phục danh mục</h2><p id="category-restore-description" class="mt-2 text-[0.8125rem] leading-6 text-primary-800">Danh mục sẽ trở lại vị trí cha được lưu lúc xóa nếu cấu trúc hiện tại cho phép. Danh mục con và sản phẩm không được tự động chuyển theo.</p><p class="mt-4 break-words rounded-xl bg-primary-50/60 px-3 py-2.5 text-[0.8125rem] font-semibold text-primary-950" data-testid="category-restore-identity">{{ restoreTarget.name }} <span class="font-normal tabular-nums text-muted-foreground">· ID {{ restoreTarget.id }}</span></p><p class="mt-2 text-[0.75rem] text-muted-foreground">{{ originalLocation(restoreTarget) }}</p><p v-if="restoreError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[0.8125rem] leading-5 text-red-800" role="alert" data-testid="category-restore-error">{{ restoreError }}</p><div class="mt-5 flex flex-wrap justify-end gap-2"><button ref="cancelButton" type="button" class="rounded-xl border border-border px-4 py-2 text-[0.8125rem] font-medium text-primary-900 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50" :disabled="restoring" data-testid="category-restore-cancel" @click="closeRestore()">Hủy</button><button type="button" class="rounded-xl bg-primary-800 px-4 py-2 text-[0.8125rem] font-semibold text-white hover:bg-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50" :disabled="restoring" :aria-busy="restoring" data-testid="category-restore-confirm" @click="confirmRestore">{{ restoring ? 'Đang khôi phục…' : 'Xác nhận khôi phục' }}</button></div></section></div>
  </section>
</template>
