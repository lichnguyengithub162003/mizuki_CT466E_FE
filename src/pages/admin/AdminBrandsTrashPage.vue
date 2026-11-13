<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Image as ImageIcon, RefreshCw, RotateCcw, Search, Trash2 } from '@lucide/vue'
import { getAdminBrandTrash, restoreAdminBrand } from '@/api/adminApi'
import { useAuthStore } from '@/stores/auth'
import type { AdminBrandRecord } from '@/types/adminBrand'

const auth = useAuthStore()
const rows = ref<AdminBrandRecord[]>([])
const page = ref(1)
const pagination = ref({ current_page: 1, last_page: 1, per_page: 20, total: 0 })
const search = ref('')
const keyword = ref('')
const loading = ref(false)
const error = ref('')
const notice = ref('')
const target = ref<AdminBrandRecord | null>(null)
const restoreProducts = ref(false)
const restoring = ref(false)
const restoreError = ref('')
const failedImages = ref<Set<number>>(new Set())
let sequence = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

function onSearch(value: string): void {
  search.value = value; clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { keyword.value = value.trim(); page.value = 1 }, 320)
}
async function load(): Promise<void> {
  const current = ++sequence
  if (auth.role !== 'super_admin') { rows.value = []; error.value = 'Bạn không có quyền xem thùng rác thương hiệu.'; return }
  loading.value = true; error.value = ''
  try {
    const result = await getAdminBrandTrash({ search: keyword.value, page: page.value, per_page: 20 })
    if (current !== sequence) return
    rows.value = result.items; pagination.value = result.pagination
    if (!result.items.length && page.value > result.pagination.last_page) page.value = Math.max(1, result.pagination.last_page)
  } catch { if (current === sequence) error.value = 'Không thể tải thùng rác thương hiệu. Vui lòng thử lại.' }
  finally { if (current === sequence) loading.value = false }
}
function imageSrc(row: AdminBrandRecord): string | null { return failedImages.value.has(row.id) ? null : row.logo_rendition_url || row.logo_url }
function openRestore(row: AdminBrandRecord): void { if (auth.role === 'super_admin') { target.value = row; restoreProducts.value = false; restoreError.value = '' } }
function closeRestore(): void { if (!restoring.value) target.value = null }
async function confirmRestore(): Promise<void> {
  if (!target.value || restoring.value || auth.role !== 'super_admin') return
  const id = target.value.id; const name = target.value.name
  restoring.value = true; restoreError.value = ''
  try {
    await restoreAdminBrand(id, restoreProducts.value)
    target.value = null; notice.value = `Đã khôi phục thương hiệu “${name}”.`
    await load()
  } catch { restoreError.value = 'Không thể khôi phục thương hiệu. Vui lòng kiểm tra dữ liệu và thử lại.' }
  finally { restoring.value = false }
}
watch([keyword, page, () => auth.role], () => { void load() }, { immediate: true })
onBeforeUnmount(() => { sequence++; clearTimeout(searchTimer) })
</script>

<template>
  <section class="min-w-0 space-y-4 pb-8" data-testid="admin-brands-trash"><RouterLink to="/admin/brands" class="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary-700"><ArrowLeft class="size-4" />Danh sách thương hiệu</RouterLink><div class="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-black/[0.05]"><header class="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-primary-50/50 p-5"><div><p class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-primary-700">Quản lý thương hiệu</p><h1 class="mt-1 flex items-center gap-2 text-lg font-semibold text-primary-950"><Trash2 class="size-4" />Thùng rác</h1><p class="mt-1 text-[0.75rem] text-muted-foreground">Khôi phục thương hiệu riêng; sản phẩm chỉ được khôi phục khi bạn chọn rõ.</p></div><span v-if="!loading && !error" class="text-[0.75rem] text-primary-800">{{ pagination.total }} thương hiệu</span></header><label class="relative m-4 block"><span class="sr-only">Tìm thương hiệu đã xóa</span><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input :value="search" type="text" placeholder="Tìm tên hoặc slug" class="h-10 w-full rounded-lg border border-border pl-9 pr-3 text-[0.8125rem]" @input="onSearch(($event.target as HTMLInputElement).value)"></label><p v-if="notice" role="status" class="mx-4 rounded-lg bg-emerald-50 p-3 text-[0.8125rem] text-emerald-800">{{ notice }}</p><div v-if="loading" role="status" class="p-8 text-[0.8125rem] text-muted-foreground">Đang tải thùng rác…</div><div v-else-if="error" role="alert" class="p-8 text-center text-[0.8125rem] text-red-800">{{ error }} <button type="button" class="font-semibold text-primary-700" @click="load"><RefreshCw class="inline size-4" /> Thử lại</button></div><div v-else-if="!rows.length" class="p-8 text-center text-[0.8125rem] text-muted-foreground">Thùng rác chưa có thương hiệu phù hợp.</div><div v-else class="divide-y divide-border/60"><article v-for="row in rows" :key="row.id" class="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-5"><span class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50 p-1.5"><img v-if="imageSrc(row)" :src="imageSrc(row)!" :alt="row.name" class="size-full object-contain" @error="failedImages = new Set([...failedImages, row.id])"><ImageIcon v-else class="size-5 text-slate-400" /></span><div class="min-w-0 flex-1"><p class="break-words text-[0.8125rem] font-semibold text-primary-950">{{ row.name }} <span class="font-normal text-muted-foreground">· ID {{ row.id }}</span></p><p class="break-all text-[0.75rem] text-muted-foreground">{{ row.slug }} · {{ row.deleted_at ? new Date(row.deleted_at).toLocaleString('vi-VN') : 'Chưa có thời điểm xóa' }}</p><p class="text-[0.75rem] text-muted-foreground">{{ row.deletion_mode === 'brand_and_products' ? `${row.deleted_product_count ?? 0} sản phẩm được xóa trong thao tác này` : 'Sản phẩm không bị xóa theo thương hiệu' }}</p></div><button v-if="auth.role === 'super_admin'" type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-2 text-[0.8125rem] font-semibold text-primary-800 hover:bg-primary-50" @click="openRestore(row)"><RotateCcw class="size-4" />Khôi phục</button></article></div><div v-if="pagination.last_page > 1 && !loading && !error" class="flex items-center justify-between border-t border-border/60 p-4 text-[0.75rem]"><span>Trang {{ page }} / {{ pagination.last_page }}</span><div class="flex gap-2"><button type="button" :disabled="page <= 1" @click="page--">Trước</button><button type="button" :disabled="page >= pagination.last_page" @click="page++">Tiếp</button></div></div></div><div v-if="target" class="fixed inset-0 z-50 grid place-items-center bg-primary-950/45 p-3" @click.self="closeRestore"><section role="dialog" aria-modal="true" aria-labelledby="brand-restore-title" class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><h2 id="brand-restore-title" class="text-base font-semibold text-primary-950">Khôi phục “{{ target.name }}”</h2><p class="mt-2 text-[0.8125rem] text-muted-foreground">ID {{ target.id }} · Việc khôi phục không tự thay đổi đơn hàng hay thanh toán.</p><label v-if="target.deletion_mode === 'brand_and_products' && target.deleted_product_count" class="mt-4 flex items-start gap-2 text-[0.8125rem]"><input v-model="restoreProducts" type="checkbox">Khôi phục cả {{ target.deleted_product_count }} sản phẩm đã bị xóa trong đúng thao tác này, nếu vẫn hợp lệ.</label><p v-if="restoreError" role="alert" class="mt-3 text-[0.8125rem] text-red-800">{{ restoreError }}</p><div class="mt-5 flex justify-end gap-2 text-[0.8125rem]"><button type="button" :disabled="restoring" class="rounded-lg border border-border px-4 py-2" @click="closeRestore">Hủy</button><button type="button" :disabled="restoring" class="rounded-lg bg-primary-800 px-4 py-2 font-semibold text-white disabled:opacity-50" data-testid="brand-restore-confirm" @click="confirmRestore">{{ restoring ? 'Đang khôi phục…' : 'Xác nhận khôi phục' }}</button></div></section></div></section>
</template>
