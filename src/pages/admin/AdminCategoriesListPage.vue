<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDown, ChevronRight, Columns3, FolderTree, Image as ImageIcon, Plus, RefreshCw, Search, SlidersHorizontal, X } from '@lucide/vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import BasePopover from '@/components/common/BasePopover.vue'
import { getAdminCategories } from '@/api/adminApi'
import type { AdminCategoryListParams, AdminCategoryPage, AdminCategoryRecord } from '@/types/adminCategory'

interface SiblingGroup {
  items: AdminCategoryRecord[]
  pagination: AdminCategoryPage['pagination'] | null
  loaded: boolean
  loading: boolean
  loadingMore: boolean
  error: string
  pageError: string
}
type VisibleRow =
  | { kind: 'category'; category: AdminCategoryRecord; depth: number }
  | { kind: 'feedback'; parentId: number | null; depth: number; state: 'loading' | 'error' | 'more' | 'empty' }

const PAGE_SIZE = 30
const ROOT = 'root'
const router = useRouter()
type SortKey = NonNullable<AdminCategoryListParams['sort']>
type ColumnKey = 'parent' | 'children' | 'products' | 'order' | 'status' | 'slug'
type BooleanChoice = '' | 'true' | 'false'
const sortOptions: Array<{ label: string; sort: SortKey; direction: 'asc' | 'desc' }> = [
  { label: 'Thứ tự tăng dần', sort: 'sort_order', direction: 'asc' },
  { label: 'Thứ tự giảm dần', sort: 'sort_order', direction: 'desc' },
  { label: 'Tên A–Z', sort: 'name', direction: 'asc' },
  { label: 'Tên Z–A', sort: 'name', direction: 'desc' },
  { label: 'Tạo mới nhất', sort: 'created_at', direction: 'desc' },
  { label: 'Tạo cũ nhất', sort: 'created_at', direction: 'asc' },
  { label: 'Cập nhật mới nhất', sort: 'updated_at', direction: 'desc' },
  { label: 'Cập nhật cũ nhất', sort: 'updated_at', direction: 'asc' },
  { label: 'Nhiều sản phẩm nhất', sort: 'product_count', direction: 'desc' },
  { label: 'Ít sản phẩm nhất', sort: 'product_count', direction: 'asc' },
]
const columnOptions: Array<{ key: ColumnKey; label: string }> = [
  { key: 'parent', label: 'Danh mục cha' }, { key: 'children', label: 'Danh mục con' },
  { key: 'products', label: 'Sản phẩm' }, { key: 'order', label: 'Ưu tiên' },
  { key: 'status', label: 'Trạng thái' }, { key: 'slug', label: 'Slug' },
]
const defaultColumns: ColumnKey[] = ['parent', 'children', 'products', 'status']
function loadColumns(): Set<ColumnKey> {
  try {
    const stored = JSON.parse(localStorage.getItem('admin.categories.visibleColumns') ?? 'null')
    if (Array.isArray(stored)) return new Set(stored.filter((value): value is ColumnKey => columnOptions.some(option => option.key === value)))
  } catch { /* Invalid local preference: use defaults. */ }
  return new Set(defaultColumns)
}
const visibleColumns = reactive(loadColumns())
const searchInput = ref('')
const keyword = ref('')
const statusChoice = ref<BooleanChoice>('')
const structureChoice = ref<BooleanChoice>('')
const sortKey = ref<SortKey>('sort_order')
const direction = ref<'asc' | 'desc'>('asc')
const filtersOpen = ref(false)
const sortOpen = ref(false)
const columnsOpen = ref(false)
let searchTimer: number | undefined
const flatMode = computed(() => Boolean(keyword.value || statusChoice.value || structureChoice.value))
const activeFilters = computed(() => Number(statusChoice.value !== '') + Number(structureChoice.value !== ''))
const sortLabel = computed(() => sortOptions.find(option => option.sort === sortKey.value && option.direction === direction.value)?.label ?? 'Sắp xếp')
const visibleColumnCount = computed(() => 1 + columnOptions.filter(option => visibleColumns.has(option.key)).length)
const groups = ref<Record<string, SiblingGroup>>({})
const expanded = ref<Set<number>>(new Set())
const failedImages = ref<Record<number, string>>({})
const requestVersions = new Map<string, number>()
let disposed = false

function keyOf(parentId: number | null): string { return parentId === null ? ROOT : String(parentId) }
function groupOf(parentId: number | null): SiblingGroup {
  const key = keyOf(parentId)
  if (!groups.value[key]) {
    groups.value[key] = { items: [], pagination: null, loaded: false, loading: false, loadingMore: false, error: '', pageError: '' }
  }
  return groups.value[key]!
}
const root = computed(() => groups.value[ROOT])

watch(searchInput, value => {
  window.clearTimeout(searchTimer)
  if (!value.trim()) { keyword.value = ''; return }
  searchTimer = window.setTimeout(() => { keyword.value = value.trim() }, 320)
})
watch(visibleColumns, () => localStorage.setItem('admin.categories.visibleColumns', JSON.stringify([...visibleColumns])))
watch([keyword, statusChoice, structureChoice, sortKey, direction], () => {
  groups.value = {}
  expanded.value = new Set()
  void loadGroup(null)
})
function chooseSort(option: (typeof sortOptions)[number]): void {
  sortKey.value = option.sort
  direction.value = option.direction
  sortOpen.value = false
}
function clearFilters(): void { statusChoice.value = ''; structureChoice.value = '' }
function clearSearch(): void { searchInput.value = ''; keyword.value = '' }
function toggleColumn(key: ColumnKey): void {
  if (visibleColumns.has(key)) visibleColumns.delete(key)
  else visibleColumns.add(key)
}
function columnVisible(key: ColumnKey): boolean { return visibleColumns.has(key) }
function openCategory(id: number): void { void router.push(`/admin/categories/${id}`) }
function rowKeydown(event: KeyboardEvent, id: number): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  openCategory(id)
}

async function loadGroup(parentId: number | null, page = 1): Promise<void> {
  const key = keyOf(parentId)
  const group = groupOf(parentId)
  if (group.loading || group.loadingMore) return
  if (page > 1 && (!group.pagination || page !== group.pagination.current_page + 1 || page > group.pagination.last_page)) return
  const version = (requestVersions.get(key) ?? 0) + 1
  requestVersions.set(key, version)
  group.error = ''
  group.pageError = ''
  if (page === 1) group.loading = true
  else group.loadingMore = true
  try {
    const common = {
      page, per_page: PAGE_SIZE, sort: sortKey.value, direction: direction.value,
      ...(keyword.value ? { search: keyword.value } : {}),
      ...(statusChoice.value ? { is_active: statusChoice.value === 'true' } : {}),
      ...(structureChoice.value ? { has_children: structureChoice.value === 'true' } : {}),
    }
    const params: AdminCategoryListParams = parentId === null
      ? { ...common, mode: flatMode.value ? 'flat' : 'root' }
      : { ...common, mode: 'children', parent_id: parentId }
    const result = await getAdminCategories(params)
    if (disposed || requestVersions.get(key) !== version || groups.value[key] !== group) return
    const unique = new Map<number, AdminCategoryRecord>(page === 1 ? [] : group.items.map(item => [item.id, item]))
    for (const item of result.items) unique.set(item.id, item)
    group.items = [...unique.values()]
    group.pagination = result.pagination
    group.loaded = true
  } catch {
    if (disposed || requestVersions.get(key) !== version || groups.value[key] !== group) return
    if (page === 1) group.error = 'Không thể tải danh mục. Vui lòng thử lại.'
    else group.pageError = 'Không thể tải thêm danh mục.'
  } finally {
    if (!disposed && requestVersions.get(key) === version && groups.value[key] === group) {
      group.loading = false
      group.loadingMore = false
    }
  }
}

function toggle(category: AdminCategoryRecord): void {
  if (flatMode.value || !category.has_children) return
  const next = new Set(expanded.value)
  if (next.has(category.id)) next.delete(category.id)
  else {
    next.add(category.id)
    const childGroup = groupOf(category.id)
    if (!childGroup.loaded && !childGroup.loading) void loadGroup(category.id)
  }
  expanded.value = next
}
function hasNext(parentId: number | null): boolean {
  const pagination = groups.value[keyOf(parentId)]?.pagination
  return Boolean(pagination && pagination.current_page < pagination.last_page)
}
function loadMore(parentId: number | null): void {
  const page = groups.value[keyOf(parentId)]?.pagination?.current_page
  if (page !== undefined) void loadGroup(parentId, page + 1)
}
function visibleRows(): VisibleRow[] {
  const result: VisibleRow[] = []
  const append = (parentId: number | null, depth: number): void => {
    const group = groups.value[keyOf(parentId)]
    if (!group) return
    for (const category of group.items) {
      result.push({ kind: 'category', category, depth })
      if (!flatMode.value && expanded.value.has(category.id)) append(category.id, depth + 1)
    }
    if (group.loading && !group.loaded) result.push({ kind: 'feedback', parentId, depth, state: 'loading' })
    else if (group.error) result.push({ kind: 'feedback', parentId, depth, state: 'error' })
    else if (group.loaded && parentId !== null && !group.items.length) result.push({ kind: 'feedback', parentId, depth, state: 'empty' })
    if (group.loaded && (hasNext(parentId) || group.loadingMore || group.pageError)) {
      result.push({ kind: 'feedback', parentId, depth, state: 'more' })
    }
  }
  append(null, 0)
  return result
}
const rows = computed(visibleRows)
function indent(depth: number): string { return `${Math.min(depth, 5) * 19}px` }
function imageSrc(category: AdminCategoryRecord): string | null {
  const url = category.image_rendition_url || category.image_url
  return url && failedImages.value[category.id] !== url ? url : null
}
function imageFailed(category: AdminCategoryRecord): void {
  const url = category.image_rendition_url || category.image_url
  if (url) failedImages.value[category.id] = url
}
function ancestorTitle(category: AdminCategoryRecord): string {
  return [...category.ancestors.map(ancestor => ancestor.name), category.name].join(' / ')
}
function ancestorPath(category: AdminCategoryRecord): string {
  return category.ancestors.map(ancestor => ancestor.name).join(' / ') || 'Danh mục gốc'
}
function feedbackLabel(row: Extract<VisibleRow, { kind: 'feedback' }>): string {
  const group = groups.value[keyOf(row.parentId)]
  if (row.state === 'loading') return 'Đang tải danh mục con…'
  if (row.state === 'error') return group?.error || 'Không thể tải danh mục con.'
  if (row.state === 'empty') return 'Chưa có danh mục con.'
  if (group?.loadingMore) return 'Đang tải thêm…'
  return group?.pageError || 'Tải thêm cùng cấp'
}

onMounted(() => { void loadGroup(null) })
onBeforeUnmount(() => { disposed = true; window.clearTimeout(searchTimer); requestVersions.clear() })
</script>

<template>
  <section class="categories-v2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label="Quản lý danh mục" data-testid="admin-categories-page">
    <div class="categories-shell mb-3 shrink-0 p-2 shadow-xs ring-1 ring-black/[0.035]" data-testid="categories-toolbar">
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-[14rem] flex-[1_1_20rem]">
          <span class="sr-only">Tìm danh mục theo tên hoặc slug</span>
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input v-model="searchInput" type="search" placeholder="Tìm theo tên hoặc slug" class="categories-control w-full pl-9 pr-9" data-testid="categories-search">
          <button v-if="searchInput" type="button" aria-label="Xóa tìm kiếm" class="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-primary-50" @click="clearSearch"><X class="size-3.5" /></button>
        </label>
        <BasePopover v-model="filtersOpen" align="end" class="w-64 p-3">
          <template #trigger><button type="button" class="categories-control categories-trigger" :aria-expanded="filtersOpen" data-testid="categories-filter-trigger"><SlidersHorizontal class="size-4" /> Bộ lọc <span v-if="activeFilters" class="rounded-full bg-primary-100 px-1.5 text-[0.6875rem]">{{ activeFilters }}</span></button></template>
          <div class="space-y-3">
            <fieldset><legend class="mb-1 text-[0.75rem] font-medium">Trạng thái</legend><label v-for="option in [{ value: '', label: 'Tất cả' }, { value: 'true', label: 'Đang hoạt động' }, { value: 'false', label: 'Tạm ẩn' }]" :key="option.value" class="categories-option"><input v-model="statusChoice" type="radio" name="category-status" :value="option.value" :data-testid="`category-status-${option.value || 'all'}`" class="accent-primary-700">{{ option.label }}</label></fieldset>
            <fieldset><legend class="mb-1 text-[0.75rem] font-medium">Cấu trúc</legend><label v-for="option in [{ value: '', label: 'Tất cả' }, { value: 'true', label: 'Có danh mục con' }, { value: 'false', label: 'Danh mục lá' }]" :key="option.value" class="categories-option"><input v-model="structureChoice" type="radio" name="category-structure" :value="option.value" :data-testid="`category-structure-${option.value || 'all'}`" class="accent-primary-700">{{ option.label }}</label></fieldset>
            <button v-if="activeFilters" type="button" class="categories-action border-t border-border/60 pt-2" data-testid="categories-clear-filters" @click="clearFilters">Xóa bộ lọc</button>
          </div>
        </BasePopover>
        <BasePopover v-model="sortOpen" align="end" class="max-h-80 w-60 overflow-y-auto p-2">
          <template #trigger><button type="button" class="categories-control categories-trigger min-w-[11rem]" :aria-expanded="sortOpen" data-testid="categories-sort-trigger">{{ sortLabel }} <ChevronDown class="ml-auto size-3.5" /></button></template>
          <div role="group" aria-label="Sắp xếp danh mục"><button v-for="option in sortOptions" :key="`${option.sort}-${option.direction}`" type="button" class="categories-menu-item" :data-testid="`category-sort-${option.sort}-${option.direction}`" :aria-pressed="sortKey === option.sort && direction === option.direction" @click="chooseSort(option)">{{ option.label }}</button></div>
        </BasePopover>
        <BasePopover v-model="columnsOpen" align="end" class="w-56 p-2">
          <template #trigger><button type="button" class="categories-control categories-trigger" :aria-expanded="columnsOpen" data-testid="categories-columns-trigger"><Columns3 class="size-4" /> Ẩn/hiện cột</button></template>
          <div><p class="px-2 py-1 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Tùy chỉnh bảng</p><label v-for="column in columnOptions" :key="column.key" class="categories-option"><input type="checkbox" :checked="columnVisible(column.key)" :data-testid="`category-column-${column.key}`" class="accent-primary-700" @change="toggleColumn(column.key)">{{ column.label }}</label><p class="mt-1 border-t border-border/60 px-2 pt-2 text-[0.6875rem] text-muted-foreground">Cột Danh mục luôn hiển thị</p></div>
        </BasePopover>
        <button type="button" class="categories-create ml-auto" data-testid="category-create" @click="router.push('/admin/categories/create')"><Plus class="size-4" aria-hidden="true" />Thêm danh mục</button>
      </div>
      <p v-if="flatMode" class="px-1 pt-2 text-[0.75rem] text-muted-foreground">Kết quả toàn bộ cấp · hiển thị dạng danh sách, không phải cây danh mục đầy đủ.</p>
    </div>

    <div v-if="root?.loading && !root.loaded" class="categories-shell min-h-0 flex-1 p-4" role="status" aria-label="Đang tải danh mục" data-testid="categories-loading"><div class="grid gap-3"><BaseSkeleton class="h-11 rounded-lg" /><BaseSkeleton v-for="index in 7" :key="index" class="h-16 rounded-lg" /></div></div>
    <div v-else-if="root?.error && !root.loaded" class="categories-shell flex min-h-48 flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="alert" data-testid="categories-error"><p class="font-medium">{{ root.error }}</p><button type="button" class="categories-action" @click="loadGroup(null)"><RefreshCw class="size-4" aria-hidden="true" /> Thử lại</button></div>
    <div v-else-if="root?.loaded && !root.items.length" class="categories-shell flex min-h-48 flex-1 flex-col items-center justify-center gap-2 p-6 text-center" data-testid="categories-empty"><FolderTree class="size-7 text-primary-700" aria-hidden="true" /><h2 class="font-medium">{{ flatMode ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục' }}</h2><p class="text-[0.8125rem] text-muted-foreground">{{ flatMode ? 'Thử điều chỉnh từ khóa hoặc bộ lọc.' : 'Danh mục gốc sẽ xuất hiện tại đây khi được tạo.' }}</p></div>

    <template v-else-if="root?.loaded">
      <div class="categories-shell hidden min-h-0 flex-1 shadow-[0_1px_2px_rgba(16,28,19,.04),0_12px_30px_rgba(16,28,19,.04)] ring-1 ring-black/[0.035] md:flex" data-testid="categories-table-shell">
        <div class="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain" data-testid="categories-scroll-region">
          <table class="w-full min-w-[48rem] table-fixed border-separate border-spacing-0 text-left text-[0.8125rem]">
            <colgroup><col class="w-[34%]"><col v-if="columnVisible('parent')" class="w-[18%]"><col v-if="columnVisible('children')" class="w-[11%]"><col v-if="columnVisible('products')" class="w-[8%]"><col v-if="columnVisible('order')" class="w-[8%]"><col v-if="columnVisible('status')" class="w-[12%]"><col v-if="columnVisible('slug')" class="w-[12%]"></colgroup>
            <thead class="sticky top-0 z-20 bg-white/95 text-xs text-muted-foreground backdrop-blur-md"><tr><th class="sticky left-0 z-30 border-b border-border/70 bg-white/95 px-5 py-3 font-medium">Danh mục</th><th v-if="columnVisible('parent')" class="border-b border-border/70 px-4 py-3 font-medium">Danh mục cha</th><th v-if="columnVisible('children')" class="whitespace-nowrap border-b border-border/70 px-1 py-3 text-center font-medium">Danh mục con</th><th v-if="columnVisible('products')" class="border-b border-border/70 px-3 py-3 text-right font-medium">Sản phẩm</th><th v-if="columnVisible('order')" class="border-b border-border/70 px-3 py-3 text-right font-medium">Ưu tiên</th><th v-if="columnVisible('status')" class="border-b border-border/70 px-4 py-3 font-medium">Trạng thái</th><th v-if="columnVisible('slug')" class="border-b border-border/70 px-4 py-3 font-medium">Slug</th></tr></thead>
            <tbody>
              <template v-for="(row, index) in rows" :key="row.kind === 'category' ? `category-${row.category.id}` : `feedback-${row.parentId ?? 'root'}-${row.state}-${index}`">
                <tr v-if="row.kind === 'category'" :data-testid="`category-row-${row.category.id}`" class="h-16 cursor-pointer transition-colors hover:bg-[#f8fbf9] focus-visible:outline-2 focus-visible:outline-primary-500" tabindex="0" :aria-label="`Xem danh mục ${row.category.name}`" @click="openCategory(row.category.id)" @keydown="rowKeydown($event, row.category.id)">
                  <td class="sticky left-0 z-10 border-b border-border/55 bg-surface px-5 py-2.5 shadow-[6px_0_12px_-13px_rgba(16,28,19,.38)]"><div class="flex min-w-0 items-center gap-2" :style="{ paddingLeft: flatMode ? '0px' : indent(row.depth) }"><button v-if="!flatMode && row.category.has_children" type="button" class="category-expand" :aria-label="`${expanded.has(row.category.id) ? 'Thu gọn' : 'Mở rộng'} ${row.category.name}`" :aria-expanded="expanded.has(row.category.id)" :data-testid="`category-expand-${row.category.id}`" @click.stop="toggle(row.category)" @keydown.stop><ChevronDown v-if="expanded.has(row.category.id)" class="size-4" aria-hidden="true" /><ChevronRight v-else class="size-4" aria-hidden="true" /></button><span v-else class="size-7 shrink-0" aria-hidden="true" /><span class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-50 text-primary-700" aria-hidden="true"><img v-if="imageSrc(row.category)" :src="imageSrc(row.category)!" alt="" loading="lazy" decoding="async" class="size-full object-cover" @error="imageFailed(row.category)"><ImageIcon v-else class="size-4" data-testid="category-image-fallback" /></span><span class="min-w-0 flex-1"><span class="block truncate font-medium text-primary-950" :title="ancestorTitle(row.category)">{{ row.category.name }}</span><span class="block truncate text-[0.6875rem] text-muted-foreground" :title="flatMode ? ancestorTitle(row.category) : row.category.slug">{{ flatMode ? ancestorPath(row.category) : row.depth > 5 ? `Cấp ${row.depth + 1} · ${row.category.slug}` : row.category.slug }}</span></span></div></td>
                  <td v-if="columnVisible('parent')" class="border-b border-border/55 px-4 py-2.5 text-muted-foreground"><span class="block truncate" :title="ancestorPath(row.category)">{{ flatMode ? ancestorPath(row.category) : row.category.parent?.name || 'Danh mục gốc' }}</span></td>
                  <td v-if="columnVisible('children')" class="border-b border-border/55 px-1 py-2.5 text-center tabular-nums">{{ row.category.children_count }}</td>
                  <td v-if="columnVisible('products')" class="border-b border-border/55 px-3 py-2.5 text-right tabular-nums">{{ row.category.product_count }}</td>
                  <td v-if="columnVisible('order')" class="border-b border-border/55 px-3 py-2.5 text-right tabular-nums">{{ row.category.sort_order }}</td>
                  <td v-if="columnVisible('status')" class="border-b border-border/55 px-4 py-2.5"><span class="inline-flex items-center gap-2 whitespace-nowrap"><span :class="['size-2 rounded-full', row.category.is_active ? 'bg-emerald-600' : 'bg-slate-400']" />{{ row.category.is_active ? 'Đang hoạt động' : 'Tạm ẩn' }}</span></td>
                  <td v-if="columnVisible('slug')" class="border-b border-border/55 px-4 py-2.5"><span class="block truncate" :title="row.category.slug">{{ row.category.slug }}</span></td>
                </tr>
                <tr v-else :data-testid="`category-feedback-${row.parentId ?? 'root'}`"><td :colspan="visibleColumnCount" class="border-b border-border/55 px-5 py-3 text-[0.75rem] text-muted-foreground"><div class="flex items-center gap-2" :style="{ paddingLeft: indent(row.depth) }"><span v-if="row.state === 'loading' || groups[keyOf(row.parentId)]?.loadingMore" role="status">{{ feedbackLabel(row) }}</span><button v-else-if="row.state === 'error'" type="button" class="categories-action" @click="loadGroup(row.parentId)">{{ feedbackLabel(row) }} <span class="font-semibold">Thử lại</span></button><button v-else-if="row.state === 'more'" type="button" class="categories-action" @click="loadMore(row.parentId)">{{ feedbackLabel(row) }} <ChevronDown class="size-3.5" aria-hidden="true" /></button><span v-else>{{ feedbackLabel(row) }}</span></div></td></tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain md:hidden" data-testid="categories-mobile-list"><div class="grid gap-2 pb-3">
        <template v-for="(row, index) in rows" :key="row.kind === 'category' ? `mobile-category-${row.category.id}` : `mobile-feedback-${row.parentId ?? 'root'}-${row.state}-${index}`">
          <article v-if="row.kind === 'category'" class="categories-shell cursor-pointer p-3.5 shadow-xs ring-1 ring-black/[0.035] focus-visible:outline-2 focus-visible:outline-primary-500" :data-testid="`category-mobile-${row.category.id}`" tabindex="0" :aria-label="`Xem danh mục ${row.category.name}`" @click="openCategory(row.category.id)" @keydown="rowKeydown($event, row.category.id)">
            <div class="flex min-w-0 items-start gap-2" :style="{ paddingLeft: flatMode ? '0px' : indent(row.depth) }">
              <button v-if="!flatMode && row.category.has_children" type="button" class="category-expand" :aria-label="`${expanded.has(row.category.id) ? 'Thu gọn' : 'Mở rộng'} ${row.category.name}`" :aria-expanded="expanded.has(row.category.id)" @click.stop="toggle(row.category)" @keydown.stop><ChevronDown v-if="expanded.has(row.category.id)" class="size-4" aria-hidden="true" /><ChevronRight v-else class="size-4" aria-hidden="true" /></button><span v-else class="size-7 shrink-0" aria-hidden="true" />
              <span class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-50 text-primary-700" aria-hidden="true"><img v-if="imageSrc(row.category)" :src="imageSrc(row.category)!" alt="" loading="lazy" class="size-full object-cover" @error="imageFailed(row.category)"><ImageIcon v-else class="size-4" data-testid="category-image-fallback" /></span>
              <div class="min-w-0 flex-1"><h2 class="truncate text-[0.8125rem] font-medium text-primary-950" :title="ancestorTitle(row.category)">{{ row.category.name }}</h2><p class="truncate text-[0.6875rem] text-muted-foreground">{{ row.depth > 5 && !flatMode ? `Cấp ${row.depth + 1} · ` : '' }}{{ row.category.slug }}</p><p v-if="flatMode" class="mt-1 truncate text-[0.6875rem] text-muted-foreground" :title="ancestorTitle(row.category)">{{ ancestorPath(row.category) }}</p><p class="mt-2 text-[0.6875rem] text-muted-foreground">{{ row.category.children_count }} danh mục con · {{ row.category.product_count }} sản phẩm · Ưu tiên {{ row.category.sort_order }}</p></div>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[0.6875rem]"><span class="truncate text-muted-foreground">{{ row.category.parent?.name || 'Danh mục gốc' }}</span><span class="ml-2 inline-flex shrink-0 items-center gap-1.5"><span :class="['size-1.5 rounded-full', row.category.is_active ? 'bg-emerald-600' : 'bg-slate-400']" />{{ row.category.is_active ? 'Đang hoạt động' : 'Tạm ẩn' }}</span></div>
          </article>
          <div v-else class="categories-shell px-4 py-3 text-[0.75rem] text-muted-foreground" :data-testid="`category-mobile-feedback-${row.parentId ?? 'root'}`"><span v-if="row.state === 'loading' || groups[keyOf(row.parentId)]?.loadingMore" role="status">{{ feedbackLabel(row) }}</span><button v-else-if="row.state === 'error'" type="button" class="categories-action" @click="loadGroup(row.parentId)">{{ feedbackLabel(row) }} <span class="font-semibold">Thử lại</span></button><button v-else-if="row.state === 'more'" type="button" class="categories-action" @click="loadMore(row.parentId)">{{ feedbackLabel(row) }} <ChevronDown class="size-3.5" aria-hidden="true" /></button><span v-else>{{ feedbackLabel(row) }}</span></div>
        </template>
      </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.categories-shell { overflow: hidden; border-radius: 1rem; background: var(--surface); isolation: isolate; }
.category-expand { display: grid; width: 1.75rem; height: 1.75rem; flex: none; place-items: center; border-radius: .5rem; color: var(--primary-800); }
.category-expand:hover { background: var(--primary-50); }
.category-expand:focus-visible, .categories-action:focus-visible { outline: 2px solid var(--primary-500); outline-offset: 2px; }
.categories-action { display: inline-flex; align-items: center; gap: .375rem; color: var(--primary-700); font-weight: 600; }
.categories-action:hover { color: var(--primary-900); }
.categories-control { height: 2.5rem; border: 1px solid rgba(16, 28, 19, .06); border-radius: .75rem; background: var(--surface-subtle); color: var(--foreground); font-size: .8125rem; outline: none; transition: background-color 150ms, border-color 150ms, box-shadow 150ms; }
.categories-control:focus-visible { border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(39, 93, 70, .1); }
.categories-control:hover { background: var(--surface); }
.categories-trigger { display: inline-flex; align-items: center; gap: .5rem; padding: 0 .75rem; white-space: nowrap; }
.categories-option { display: flex; cursor: pointer; align-items: center; gap: .625rem; border-radius: .5rem; padding: .5rem; font-size: .8125rem; }
.categories-option:hover, .categories-menu-item:hover { background: var(--surface-subtle); }
.categories-menu-item { display: block; width: 100%; border-radius: .5rem; padding: .5rem .625rem; text-align: left; font-size: .8125rem; }
.categories-menu-item[aria-pressed="true"] { background: var(--primary-50); color: var(--primary-800); font-weight: 600; }
.categories-create { display: inline-flex; min-height: 2.5rem; flex: none; align-items: center; justify-content: center; gap: .4rem; border-radius: .75rem; background: var(--primary-800); padding: 0 .85rem; color: white; font-size: .8125rem; font-weight: 600; }
.categories-create:hover { background: var(--primary-900); }
.categories-create:focus-visible { outline: 2px solid var(--primary-500); outline-offset: 2px; }
</style>
