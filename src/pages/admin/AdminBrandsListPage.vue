<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { ChevronDown, Columns3, Image as ImageIcon, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, X } from '@lucide/vue'
import BasePopover from '@/components/common/BasePopover.vue'
import { getAdminBrandOriginCountries, getAdminBrands } from '@/api/adminApi'
import { useAuthStore } from '@/stores/auth'
import type { AdminBrandListParams, AdminBrandRecord, AdminBrandStatus } from '@/types/adminBrand'

type Column = 'slug' | 'country' | 'products' | 'status' | 'created'
const columns: Array<{ key: Column; label: string }> = [
  { key: 'country', label: 'Xuất xứ' }, { key: 'products', label: 'Sản phẩm' },
  { key: 'status', label: 'Trạng thái' }, { key: 'slug', label: 'Slug' }, { key: 'created', label: 'Ngày tạo' },
]
const defaultColumns: Column[] = ['country', 'products', 'status']
const columnWeights: Record<Column, number> = { country: 18, products: 12, status: 20, slug: 16, created: 14 }
function loadColumns(): Set<Column> {
  try {
    const saved = JSON.parse(localStorage.getItem('admin.brands.visibleColumns') ?? 'null')
    if (Array.isArray(saved)) return new Set(saved.filter((value): value is Column => columns.some(column => column.key === value)))
  } catch { /* Keep the default columns when local storage is unavailable. */ }
  return new Set(defaultColumns)
}
const visible = reactive(loadColumns())
const brandColumnWidth = computed(() => `${28 / (28 + [...visible].reduce((sum, key) => sum + columnWeights[key], 0)) * 100}%`)
function columnWidth(key: Column): string { return `${columnWeights[key] / (28 + [...visible].reduce((sum, item) => sum + columnWeights[item], 0)) * 100}%` }
watch(visible, () => localStorage.setItem('admin.brands.visibleColumns', JSON.stringify([...visible])))
const statusLabels: Record<AdminBrandStatus, string> = { published: 'Đã xuất bản', hidden: 'Đã ẩn', draft: 'Bản nháp' }
const sortOptions: Array<{ label: string; value: string }> = [
  { label: 'Tên A–Z', value: 'name:asc' }, { label: 'Tên Z–A', value: 'name:desc' },
  { label: 'Tạo mới nhất', value: 'created_at:desc' }, { label: 'Tạo cũ nhất', value: 'created_at:asc' },
  { label: 'Nhiều sản phẩm nhất', value: 'product_count:desc' }, { label: 'Ít sản phẩm nhất', value: 'product_count:asc' },
]
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const rows = ref<AdminBrandRecord[]>([])
const pagination = ref({ current_page: 1, last_page: 1, per_page: 20, total: 0 })
const searchInput = ref(String(route.query.search ?? ''))
const countries = ref<string[]>([])
const countriesError = ref(false)
const loading = ref(false)
const error = ref('')
const filtersOpen = ref(false)
const sortOpen = ref(false)
const columnsOpen = ref(false)
const failedImages = ref<Set<number>>(new Set())
let timer: ReturnType<typeof setTimeout> | undefined
let sequence = 0
let countriesSequence = 0

const params = computed<AdminBrandListParams>(() => ({
  search: String(route.query.search ?? '') || undefined,
  status: ['published', 'hidden', 'draft'].includes(String(route.query.status)) ? route.query.status as AdminBrandStatus : undefined,
  origin_country: String(route.query.origin_country ?? '') || undefined,
  product_count_min: route.query.product_count_min !== undefined ? Number(route.query.product_count_min) : undefined,
  product_count_max: route.query.product_count_max !== undefined ? Number(route.query.product_count_max) : undefined,
  sort: ['name', 'created_at', 'product_count'].includes(String(route.query.sort)) ? route.query.sort as AdminBrandListParams['sort'] : 'name',
  direction: route.query.direction === 'desc' ? 'desc' : 'asc',
  page: Math.max(1, Number(route.query.page) || 1), per_page: 20,
}))
const sortChoice = computed(() => `${params.value.sort}:${params.value.direction}`)
const sortLabel = computed(() => sortOptions.find(option => option.value === sortChoice.value)?.label ?? 'Sắp xếp')
const productChoice = computed(() => params.value.product_count_min === 1 ? 'with' : params.value.product_count_max === 0 ? 'without' : '')
const activeFilters = computed(() => Number(Boolean(params.value.status)) + Number(Boolean(params.value.origin_country)) + Number(Boolean(productChoice.value)))
const hasFilters = computed(() => Boolean(params.value.search || activeFilters.value))

function setQuery(patch: Record<string, string | number | undefined>): void {
  const query = { ...route.query, ...patch }
  for (const key of Object.keys(query)) if (query[key] === '' || query[key] === undefined) delete query[key]
  void router.replace({ query })
}
function onSearch(value: string): void {
  searchInput.value = value
  clearTimeout(timer)
  timer = setTimeout(() => setQuery({ search: value.trim() || undefined, page: undefined }), 320)
}
function clearSearch(): void { clearTimeout(timer); searchInput.value = ''; setQuery({ search: undefined, page: undefined }) }
function setSort(value: string): void {
  const [sort, direction] = value.split(':')
  sortOpen.value = false
  setQuery({ sort, direction, page: undefined })
}
function setProductChoice(value: string): void {
  setQuery({ product_count_min: value === 'with' ? 1 : undefined, product_count_max: value === 'without' ? 0 : undefined, page: undefined })
}
function clearFilters(): void {
  filtersOpen.value = false
  clearTimeout(timer)
  searchInput.value = ''
  setQuery({ search: undefined, status: undefined, origin_country: undefined, product_count_min: undefined, product_count_max: undefined, page: undefined })
}
function toggleColumn(column: Column): void {
  if (visible.has(column)) visible.delete(column)
  else visible.add(column)
}
function imageSrc(row: AdminBrandRecord): string | null { return failedImages.value.has(row.id) ? null : row.logo_rendition_url || row.logo_url }
function markImageFailed(id: number): void { failedImages.value = new Set([...failedImages.value, id]) }
function openBrand(id: number): void { void router.push(`/admin/brands/${id}`) }
function rowKeydown(event: KeyboardEvent, id: number): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault(); openBrand(id)
}
async function loadCountries(): Promise<void> {
  const current = ++countriesSequence
  countriesError.value = false
  try {
    const result = await getAdminBrandOriginCountries()
    if (current === countriesSequence) countries.value = result
  } catch { if (current === countriesSequence) countriesError.value = true }
}
async function load(): Promise<void> {
  const current = ++sequence
  loading.value = true; error.value = ''
  try {
    const result = await getAdminBrands(params.value)
    if (current !== sequence) return
    rows.value = result.items
    pagination.value = result.pagination
    if (!result.items.length && params.value.page > result.pagination.last_page) setQuery({ page: Math.max(1, result.pagination.last_page) })
  } catch { if (current === sequence) error.value = 'Không thể tải danh sách thương hiệu. Vui lòng thử lại.' }
  finally { if (current === sequence) loading.value = false }
}
watch(() => route.query, () => { searchInput.value = String(route.query.search ?? ''); void load() }, { immediate: true })
void loadCountries()
onBeforeUnmount(() => { sequence++; countriesSequence++; clearTimeout(timer) })
</script>

<template>
  <section class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 pb-6" aria-label="Danh sách thương hiệu" data-testid="admin-brands-list">
    <h1 class="sr-only">Thương hiệu</h1>
    <div class="brands-shell shrink-0 p-2 shadow-xs ring-1 ring-black/[0.035]" data-testid="brands-toolbar">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-[13rem] flex-[1_1_19rem]"><label for="brands-search" class="sr-only">Tìm thương hiệu</label><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input id="brands-search" :value="searchInput" type="text" role="searchbox" class="brands-control w-full pl-9 pr-9" placeholder="Tìm theo tên, slug hoặc ID" data-testid="brands-search" @input="onSearch(($event.target as HTMLInputElement).value)"><button v-if="searchInput" type="button" class="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md hover:bg-primary-50" aria-label="Xóa tìm kiếm" @click="clearSearch"><X class="size-3.5" /></button></div>
        <BasePopover v-model="filtersOpen" align="end" class="w-72 p-3"><template #trigger><button type="button" class="brands-control brands-trigger" :aria-expanded="filtersOpen" data-testid="brands-filter-trigger"><SlidersHorizontal class="size-4" />Bộ lọc <span v-if="activeFilters" class="rounded-full bg-primary-100 px-1.5 text-xs">{{ activeFilters }}</span></button></template><div class="space-y-3"><fieldset><legend class="mb-1 text-xs font-medium">Trạng thái xuất bản</legend><label v-for="option in [{ value: '', label: 'Tất cả' }, { value: 'published', label: 'Đã xuất bản' }, { value: 'hidden', label: 'Đã ẩn' }, { value: 'draft', label: 'Bản nháp' }]" :key="option.value" class="brands-option"><input type="radio" name="brand-status" :checked="(params.status ?? '') === option.value" :value="option.value" data-testid="brands-status" @change="setQuery({ status: option.value || undefined, page: undefined })">{{ option.label }}</label></fieldset><fieldset><legend class="mb-1 text-xs font-medium">Xuất xứ</legend><select :value="params.origin_country ?? ''" aria-label="Lọc xuất xứ thương hiệu" class="brands-control w-full px-3" @change="setQuery({ origin_country: ($event.target as HTMLSelectElement).value || undefined, page: undefined })"><option value="">Mọi xuất xứ</option><option v-for="country in countries" :key="country" :value="country">{{ country }}</option></select><p v-if="countriesError" class="mt-1 text-xs text-red-800">Không tải được xuất xứ. <button type="button" class="underline" @click="loadCountries">Thử lại</button></p></fieldset><fieldset><legend class="mb-1 text-xs font-medium">Số sản phẩm</legend><label v-for="option in [{ value: '', label: 'Tất cả' }, { value: 'with', label: 'Có sản phẩm' }, { value: 'without', label: 'Chưa có sản phẩm' }]" :key="option.value" class="brands-option"><input type="radio" name="brand-products" :checked="productChoice === option.value" @change="setProductChoice(option.value)">{{ option.label }}</label></fieldset><button v-if="activeFilters" type="button" class="text-xs font-semibold text-primary-700" @click="clearFilters">Xóa bộ lọc</button></div></BasePopover>
        <BasePopover v-model="sortOpen" align="end" class="w-56 p-2"><template #trigger><button type="button" class="brands-control brands-trigger min-w-36" :aria-expanded="sortOpen" data-testid="brands-sort-trigger">{{ sortLabel }}<ChevronDown class="ml-auto size-3.5" /></button></template><button v-for="option in sortOptions" :key="option.value" type="button" class="brands-menu-item" :aria-pressed="sortChoice === option.value" @click="setSort(option.value)">{{ option.label }}</button></BasePopover>
        <BasePopover v-model="columnsOpen" align="end" class="w-52 p-2"><template #trigger><button type="button" class="brands-control brands-trigger" :aria-expanded="columnsOpen"><Columns3 class="size-4" />Ẩn/hiện cột</button></template><label v-for="column in columns" :key="column.key" class="brands-option"><input type="checkbox" :checked="visible.has(column.key)" @change="toggleColumn(column.key)">{{ column.label }}</label></BasePopover>
        <div v-if="auth.role === 'super_admin'" class="ml-auto flex items-center gap-2"><RouterLink to="/admin/brands/trash" class="brands-control brands-trigger text-primary-700" data-testid="brands-trash-link"><Trash2 class="size-4" />Thùng rác</RouterLink><RouterLink to="/admin/brands/create" class="brands-create" data-testid="brands-create-link"><Plus class="size-4" />Thêm thương hiệu</RouterLink></div>
      </div><button v-if="hasFilters" type="button" class="mt-2 px-1 text-xs font-semibold text-primary-700" @click="clearFilters">Xóa tìm kiếm và bộ lọc</button>
    </div>
    <div v-if="loading" class="brands-shell space-y-3 p-5" role="status" data-testid="brands-loading"><div v-for="index in 6" :key="index" class="h-14 animate-pulse rounded-lg bg-primary-50" /></div>
    <div v-else-if="error" class="brands-shell p-10 text-center" role="alert"><p class="text-sm text-red-800">{{ error }}</p><button type="button" class="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-700" @click="load"><RefreshCw class="size-4" />Thử lại</button></div>
    <div v-else-if="!rows.length" class="brands-shell p-10 text-center text-sm text-muted-foreground" data-testid="brands-empty">Không tìm thấy thương hiệu phù hợp.</div>
    <template v-else>
      <div class="brands-shell hidden min-w-0 overflow-x-auto shadow-xs ring-1 ring-black/[0.035] md:block"><table class="w-full min-w-[44rem] table-fixed text-left text-[0.8125rem]"><colgroup><col :style="{ width: brandColumnWidth }"><col v-for="column in columns.filter(item => visible.has(item.key))" :key="column.key" :style="{ width: columnWidth(column.key) }"></colgroup><thead class="bg-primary-50/65 text-xs text-primary-800"><tr><th class="px-5 py-3 font-medium">Thương hiệu</th><th v-if="visible.has('country')" class="px-4 py-3 font-medium">Xuất xứ</th><th v-if="visible.has('products')" class="px-4 py-3 text-center font-medium">Sản phẩm</th><th v-if="visible.has('status')" class="px-4 py-3 font-medium">Trạng thái</th><th v-if="visible.has('slug')" class="px-4 py-3 font-medium">Slug</th><th v-if="visible.has('created')" class="px-4 py-3 font-medium">Ngày tạo</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id" :data-testid="`brand-row-${row.id}`" tabindex="0" class="h-16 cursor-pointer border-t border-border/55 transition-colors hover:bg-[#f8fbf9] focus-visible:outline-2 focus-visible:outline-primary-500" :aria-label="`Xem thương hiệu ${row.name}`" @click="openBrand(row.id)" @keydown="rowKeydown($event, row.id)"><td class="px-5 py-2.5"><div class="flex min-w-0 items-center gap-3"><span class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-50 p-1.5 text-primary-500"><img v-if="imageSrc(row)" :src="imageSrc(row)!" alt="" class="size-full object-contain" @error="markImageFailed(row.id)"><ImageIcon v-else class="size-4" /></span><span class="min-w-0"><span class="block min-w-0 truncate font-medium text-primary-950" :title="row.name">{{ row.name }}</span><span class="block text-[0.6875rem] text-muted-foreground">ID {{ row.id }}</span></span></div></td><td v-if="visible.has('country')" class="truncate px-4 py-2.5">{{ row.origin_country || '—' }}</td><td v-if="visible.has('products')" class="px-4 py-2.5 text-center tabular-nums">{{ row.product_count }}</td><td v-if="visible.has('status')" class="px-4 py-2.5"><span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium" :class="row.status === 'published' ? 'bg-emerald-50 text-emerald-800' : row.status === 'hidden' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'"><span class="size-1.5 rounded-full bg-current" />{{ statusLabels[row.status] }}</span></td><td v-if="visible.has('slug')" class="truncate px-4 py-2.5 text-muted-foreground">{{ row.slug }}</td><td v-if="visible.has('created')" class="px-4 py-2.5 text-muted-foreground">{{ row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '—' }}</td></tr></tbody></table></div>
      <div class="grid gap-3 md:hidden"><article v-for="row in rows" :key="row.id" :data-testid="`brand-mobile-row-${row.id}`" tabindex="0" role="link" class="brands-shell cursor-pointer p-4 focus-visible:outline-2 focus-visible:outline-primary-500" :aria-label="`Xem thương hiệu ${row.name}`" @click="openBrand(row.id)" @keydown="rowKeydown($event, row.id)"><div class="flex gap-3"><span class="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-50 p-2 text-primary-500"><img v-if="imageSrc(row)" :src="imageSrc(row)!" alt="" class="size-full object-contain" @error="markImageFailed(row.id)"><ImageIcon v-else class="size-5" /></span><div class="min-w-0 flex-1"><h2 class="truncate text-sm font-semibold text-primary-950" :title="row.name">{{ row.name }}</h2><p class="mt-1 text-xs text-muted-foreground">{{ row.origin_country || 'Chưa có xuất xứ' }} · {{ row.product_count }} sản phẩm</p><span class="mt-2 inline-flex rounded-full bg-primary-50 px-2 py-1 text-xs text-primary-800">{{ statusLabels[row.status] }}</span></div></div></article></div>
    </template>
    <div v-if="!loading && !error && pagination.last_page > 1" class="brands-shell flex items-center justify-between gap-2 px-4 py-3 text-xs"><span>Trang {{ pagination.current_page }} / {{ pagination.last_page }} · {{ pagination.total }} thương hiệu</span><div class="flex gap-2"><button type="button" :disabled="params.page <= 1" class="brands-control px-3 disabled:opacity-40" @click="setQuery({ page: params.page - 1 })">Trước</button><button type="button" :disabled="params.page >= pagination.last_page" class="brands-control px-3 disabled:opacity-40" @click="setQuery({ page: params.page + 1 })">Tiếp</button></div></div>
  </section>
</template>

<style scoped>
.brands-shell { overflow: hidden; border-radius: 1rem; background: var(--surface); }
.brands-control { height: 2.5rem; border: 1px solid rgba(16, 28, 19, .08); border-radius: .75rem; background: var(--surface-subtle); color: var(--foreground); font-size: .8125rem; outline: none; }
.brands-control:focus-visible { border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(39, 93, 70, .1); }
.brands-control:hover { background: var(--surface); }
.brands-trigger { display: inline-flex; align-items: center; gap: .5rem; padding: 0 .75rem; white-space: nowrap; }
.brands-option { display: flex; cursor: pointer; align-items: center; gap: .625rem; border-radius: .5rem; padding: .5rem; font-size: .8125rem; }
.brands-option:hover, .brands-menu-item:hover { background: var(--surface-subtle); }
.brands-menu-item { display: block; width: 100%; border-radius: .5rem; padding: .5rem .625rem; text-align: left; font-size: .8125rem; }
.brands-menu-item[aria-pressed="true"] { background: var(--primary-50); color: var(--primary-800); font-weight: 600; }
.brands-create { display: inline-flex; min-height: 2.5rem; align-items: center; gap: .4rem; border-radius: .75rem; background: var(--primary-800); padding: 0 .85rem; color: white; font-size: .8125rem; font-weight: 600; white-space: nowrap; }
.brands-create:hover { background: var(--primary-900); }
</style>
