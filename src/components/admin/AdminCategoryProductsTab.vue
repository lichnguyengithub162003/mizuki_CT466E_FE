<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Check, ChevronDown, Copy, Image as ImageIcon, RefreshCw, Search } from '@lucide/vue'
import { getAdminCategories, getAdminCategoryProducts, reassignAdminProductCategory } from '@/api/adminApi'
import { isApplicationError } from '@/types/admin'
import { useAuthStore } from '@/stores/auth'
import type { AdminCategoryProduct, AdminCategoryProductParams, AdminPagination } from '@/types/admin'
import type { AdminCategoryRecord, AdminCategoryPagination } from '@/types/adminCategory'

const props = defineProps<{ categoryId: number }>()
const auth = useAuthStore()
const canMoveProducts = computed(() => auth.role === 'super_admin' || auth.role === 'branch_manager')
const scope = ref<AdminCategoryProductParams['category_scope']>('direct')
const sort = ref<AdminCategoryProductParams['sort']>('newest')
const searchInput = ref('')
const search = ref('')
const page = ref(1)
const products = ref<AdminCategoryProduct[]>([])
const pagination = ref<AdminPagination>({ current_page: 1, per_page: 15, total: 0, last_page: 1 })
const loading = ref(false)
const error = ref<'forbidden' | 'unavailable' | ''>('')
const failedImages = ref<number[]>([])
const copiedProductId = ref<number | null>(null)
const sortMenuOpen = ref(false)
const sortTrigger = ref<HTMLButtonElement | null>(null)
const sortMenu = ref<HTMLElement | null>(null)
const activeSortIndex = ref(0)
const sortOptions = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name', label: 'Tên sản phẩm' },
] as const
const movingProduct = ref<AdminCategoryProduct | null>(null)
const selectedDestination = ref<AdminCategoryRecord | null>(null)
const destinationItems = ref<AdminCategoryRecord[]>([])
const destinationSearchInput = ref('')
const destinationSearch = ref('')
const destinationPage = ref(1)
const destinationPagination = ref<AdminCategoryPagination>({ current_page: 1, per_page: 15, total: 0, last_page: 1 })
const destinationLoading = ref(false)
const destinationError = ref(false)
const moveSaving = ref(false)
const moveError = ref('')
const moveNotice = ref('')
const dialogRef = ref<HTMLElement | null>(null)
const destinationSearchRef = ref<HTMLInputElement | null>(null)
const productsSearchRef = ref<HTMLInputElement | null>(null)
const availableDestinations = computed(() => movingProduct.value
  ? destinationItems.value.filter(item => item.id !== currentCategoryId(movingProduct.value!)) : [])
let moveOpener: HTMLElement | null = null
let destinationSequence = 0
let moveSequence = 0
let destinationSearchTimer: ReturnType<typeof setTimeout> | undefined
let sequence = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined
let copyTimer: ReturnType<typeof setTimeout> | undefined

function resetPage(): void { page.value = 1 }
function setScope(value: AdminCategoryProductParams['category_scope']): void {
  if (scope.value === value) return
  scope.value = value
  resetPage()
}
function onSearchInput(value: string): void {
  searchInput.value = value
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
    resetPage()
  }, 300)
}
function setSort(value: AdminCategoryProductParams['sort']): void {
  sort.value = value
  resetPage()
  closeSortMenu(true)
}
function closeSortMenu(restoreFocus = false): void {
  sortMenuOpen.value = false
  if (restoreFocus) void nextTick(() => sortTrigger.value?.focus())
}
function focusSortOption(index: number): void {
  activeSortIndex.value = (index + sortOptions.length) % sortOptions.length
  void nextTick(() => sortMenu.value?.querySelectorAll<HTMLButtonElement>('[role="option"]')[activeSortIndex.value]?.focus())
}
function openSortMenu(): void {
  sortMenuOpen.value = true
  focusSortOption(sortOptions.findIndex(option => option.value === sort.value))
}
function onSortTriggerKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (sortMenuOpen.value) closeSortMenu(true)
    else openSortMenu()
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!sortMenuOpen.value) openSortMenu()
    else focusSortOption(activeSortIndex.value + (event.key === 'ArrowDown' ? 1 : -1))
  } else if (event.key === 'Escape' && sortMenuOpen.value) {
    event.preventDefault()
    closeSortMenu(true)
  }
}
function onSortMenuKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    focusSortOption(activeSortIndex.value + (event.key === 'ArrowDown' ? 1 : -1))
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    focusSortOption(event.key === 'Home' ? 0 : sortOptions.length - 1)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    setSort(sortOptions[activeSortIndex.value]!.value)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeSortMenu(true)
  }
}
function onSortOutsidePointer(event: PointerEvent): void {
  const target = event.target
  if (target instanceof Node && !sortTrigger.value?.contains(target) && !sortMenu.value?.contains(target)) closeSortMenu()
}
watch(sortMenuOpen, open => {
  if (open) document.addEventListener('pointerdown', onSortOutsidePointer)
  else document.removeEventListener('pointerdown', onSortOutsidePointer)
})
function imageFor(product: AdminCategoryProduct): string {
  return failedImages.value.includes(product.id) ? '' : product.primary_image_thumb_url || product.image_url || ''
}
async function copyProductId(id: number): Promise<void> {
  try {
    await navigator.clipboard.writeText(String(id))
    clearTimeout(copyTimer)
    copiedProductId.value = id
    copyTimer = setTimeout(() => { copiedProductId.value = null }, 2000)
  } catch { copiedProductId.value = null }
}
function errorStatus(cause: unknown): number | undefined {
  if (typeof cause !== 'object' || cause === null) return undefined
  const value = cause as { status?: number; kind?: string; response?: { status?: number } }
  return value.kind === 'forbidden' ? 403 : value.status ?? value.response?.status
}
function currentCategoryId(product: AdminCategoryProduct): number | null {
  return product.category?.id ?? (scope.value === 'direct' ? props.categoryId : null)
}
function closeMoveDialog(force = false, restoreFocus = true): void {
  if (moveSaving.value && !force) return
  destinationSequence++
  clearTimeout(destinationSearchTimer)
  movingProduct.value = null
  selectedDestination.value = null
  destinationItems.value = []
  destinationError.value = false
  moveError.value = ''
  if (force) { moveSequence++; moveSaving.value = false }
  const opener = moveOpener
  moveOpener = null
  if (restoreFocus) void nextTick(() => opener?.isConnected && opener.focus())
}
function openMoveDialog(product: AdminCategoryProduct, event: MouseEvent): void {
  if (!canMoveProducts.value) return
  const queryChanged = destinationSearch.value !== '' || destinationPage.value !== 1
  moveOpener = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  movingProduct.value = product
  selectedDestination.value = null
  destinationSearchInput.value = ''
  destinationSearch.value = ''
  destinationPage.value = 1
  moveError.value = ''
  moveNotice.value = ''
  if (!queryChanged) void loadDestinations()
  void nextTick(() => destinationSearchRef.value?.focus())
}
function onDestinationSearch(value: string): void {
  destinationSearchInput.value = value
  clearTimeout(destinationSearchTimer)
  destinationSearchTimer = setTimeout(() => {
    destinationSearch.value = value.trim()
    destinationPage.value = 1
  }, 300)
}
async function loadDestinations(): Promise<void> {
  if (!movingProduct.value) return
  const current = ++destinationSequence
  destinationLoading.value = true
  destinationError.value = false
  destinationItems.value = []
  try {
    const result = await getAdminCategories({
      mode: 'flat', page: destinationPage.value, per_page: 15, sort: 'name', direction: 'asc',
      ...(destinationSearch.value ? { search: destinationSearch.value } : {}),
    })
    if (current !== destinationSequence || !movingProduct.value) return
    destinationItems.value = result.items
    destinationPagination.value = result.pagination
  } catch {
    if (current === destinationSequence) destinationError.value = true
  } finally {
    if (current === destinationSequence) destinationLoading.value = false
  }
}
watch([destinationSearch, destinationPage], () => { if (movingProduct.value) void loadDestinations() })
watch(canMoveProducts, allowed => { if (!allowed && movingProduct.value) closeMoveDialog(true) })
function onDialogKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMoveDialog()
  } else if (event.key === 'Tab') {
    const focusable = dialogRef.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')
    if (!focusable?.length) return
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
}
async function confirmMove(): Promise<void> {
  const product = movingProduct.value
  const target = selectedDestination.value
  if (!canMoveProducts.value || !product || !target || moveSaving.value || target.id === currentCategoryId(product)) return
  const current = ++moveSequence
  const categoryId = props.categoryId
  moveSaving.value = true
  moveError.value = ''
  try {
    await reassignAdminProductCategory(product.id, target.id)
    if (current !== moveSequence || categoryId !== props.categoryId) return
    moveSaving.value = false
    closeMoveDialog(false, false)
    moveNotice.value = `Đã chuyển sản phẩm ID ${product.id} sang “${target.name}”.`
    await load()
    await nextTick()
    productsSearchRef.value?.focus()
  } catch (cause) {
    if (current !== moveSequence) return
    if (isApplicationError(cause) && cause.kind === 'validation') {
      moveError.value = cause.validationErrors?.category_id?.[0] || 'Danh mục đích không hợp lệ. Vui lòng chọn lại.'
    } else if (errorStatus(cause) === 422) {
      moveError.value = 'Danh mục đích không hợp lệ. Vui lòng chọn lại.'
    } else if (errorStatus(cause) === 403) {
      moveError.value = 'Bạn không có quyền chuyển sản phẩm này.'
    } else {
      moveError.value = 'Không thể chuyển danh mục do lỗi hệ thống. Vui lòng thử lại sau.'
    }
  } finally {
    if (current === moveSequence) moveSaving.value = false
  }
}
async function load(): Promise<void> {
  const current = ++sequence
  clearTimeout(copyTimer)
  copiedProductId.value = null
  loading.value = true
  error.value = ''
  products.value = []
  failedImages.value = []
  try {
    const result = await getAdminCategoryProducts({
      category_id: props.categoryId, category_scope: scope.value,
      search: search.value, sort: sort.value, page: page.value, per_page: 15,
    })
    if (current !== sequence) return
    products.value = result.items
    pagination.value = result.pagination
    if (page.value > 1 && !result.items.length && result.pagination.last_page < page.value) {
      page.value = Math.max(1, result.pagination.last_page)
    }
  } catch (cause) {
    if (current === sequence) error.value = errorStatus(cause) === 403 ? 'forbidden' : 'unavailable'
  } finally {
    if (current === sequence) loading.value = false
  }
}
watch(() => props.categoryId, () => {
  if (movingProduct.value) closeMoveDialog(true)
  moveNotice.value = ''
  clearTimeout(searchTimer)
  scope.value = 'direct'
  sort.value = 'newest'
  searchInput.value = ''
  search.value = ''
  page.value = 1
})
watch([() => props.categoryId, scope, search, sort, page], () => { void load() }, { immediate: true })
onBeforeUnmount(() => { sequence++; destinationSequence++; moveSequence++; clearTimeout(searchTimer); clearTimeout(copyTimer); clearTimeout(destinationSearchTimer); document.removeEventListener('pointerdown', onSortOutsidePointer) })
</script>

<template>
  <div class="min-w-0" data-testid="category-products-tab">
    <div class="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-[0.9375rem] font-semibold text-primary-950">Sản phẩm trong danh mục</h2>
        <p class="mt-1 text-[0.75rem] text-muted-foreground">Xem sản phẩm trực tiếp hoặc trong toàn bộ cây danh mục.</p>
      </div>
      <p v-if="!loading && !error" class="rounded-full bg-primary-50 px-3 py-1 text-[0.75rem] font-medium tabular-nums text-primary-800" data-testid="category-products-total">{{ pagination.total }} sản phẩm</p>
    </div>
    <p v-if="moveNotice" class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[0.8125rem] font-medium text-emerald-800" role="status" data-testid="category-product-move-notice">{{ moveNotice }}</p>

    <div class="mt-5 flex flex-wrap items-center gap-3 lg:flex-nowrap" data-testid="category-products-controls">
      <div class="inline-flex shrink-0 rounded-xl bg-primary-50/80 p-1" role="group" aria-label="Phạm vi sản phẩm">
        <button type="button" :aria-pressed="scope === 'direct'" :class="['rounded-lg px-3 py-2 text-[0.8125rem] font-medium', scope === 'direct' ? 'bg-white text-primary-950 shadow-xs' : 'text-primary-700 hover:text-primary-950']" data-testid="category-products-direct" @click="setScope('direct')">Trực tiếp</button>
        <button type="button" :aria-pressed="scope === 'tree'" :class="['rounded-lg px-3 py-2 text-[0.8125rem] font-medium', scope === 'tree' ? 'bg-white text-primary-950 shadow-xs' : 'text-primary-700 hover:text-primary-950']" data-testid="category-products-tree" @click="setScope('tree')">Toàn bộ cây</button>
      </div>
      <label class="relative min-w-0 flex-1 max-lg:basis-full">
        <span class="sr-only">Tìm theo tên sản phẩm</span>
        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input ref="productsSearchRef" :value="searchInput" type="text" class="h-10 w-full rounded-xl border border-border bg-white pl-10 pr-3 text-[0.8125rem] text-primary-950 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" placeholder="Tìm theo tên sản phẩm" data-testid="category-products-search" @input="onSearchInput(($event.target as HTMLInputElement).value)">
      </label>
      <div class="relative shrink-0">
        <button ref="sortTrigger" type="button" class="inline-flex h-10 min-w-36 items-center justify-between gap-3 rounded-xl border border-border bg-gradient-to-b from-white to-primary-50/40 px-3.5 text-[0.8125rem] font-medium text-primary-950 shadow-xs transition-colors hover:border-primary-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" aria-label="Sắp xếp sản phẩm" aria-haspopup="listbox" :aria-expanded="sortMenuOpen" aria-controls="category-products-sort-options" data-testid="category-products-sort" @click="sortMenuOpen ? closeSortMenu() : openSortMenu()" @keydown="onSortTriggerKeydown">
          {{ sortOptions.find(option => option.value === sort)?.label }}
          <ChevronDown class="size-4 text-primary-600 transition-transform" :class="sortMenuOpen ? 'rotate-180' : ''" aria-hidden="true" />
        </button>
        <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="translate-y-1 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-100 ease-in" leave-from-class="translate-y-0 opacity-100" leave-to-class="translate-y-1 opacity-0">
          <div v-if="sortMenuOpen" id="category-products-sort-options" ref="sortMenu" class="absolute right-0 z-30 mt-2 min-w-44 rounded-xl border border-border/80 bg-white p-1.5 shadow-lg shadow-primary-950/10" role="listbox" aria-label="Sắp xếp sản phẩm" data-testid="category-products-sort-options" @keydown="onSortMenuKeydown">
            <button v-for="option in sortOptions" :key="option.value" type="button" role="option" :aria-selected="sort === option.value" class="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left text-[0.8125rem] transition-colors hover:bg-primary-50 focus:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400" :class="sort === option.value ? 'font-semibold text-primary-800' : 'text-primary-950'" :data-testid="'category-products-sort-' + option.value" @click="setSort(option.value)">
              {{ option.label }}<Check v-if="sort === option.value" class="size-4 text-primary-700" aria-hidden="true" />
            </button>
          </div>
        </Transition>
      </div>
    </div>
    <p class="mt-2 text-[0.75rem] leading-5 text-muted-foreground" data-testid="category-products-scope-help">{{ scope === 'direct' ? 'Chỉ hiển thị sản phẩm thuộc đúng danh mục này.' : 'Hiển thị sản phẩm của danh mục này và mọi danh mục con.' }}</p>

    <div v-if="loading" class="mt-5 space-y-2" role="status" aria-label="Đang tải sản phẩm" data-testid="category-products-loading">
      <p class="text-[0.75rem] text-muted-foreground">{{ page > 1 ? 'Đang tải trang sản phẩm…' : 'Đang tải sản phẩm…' }}</p>
      <div v-for="item in 3" :key="item" class="h-16 animate-pulse rounded-xl bg-primary-50/70" />
    </div>
    <div v-else-if="error" class="mt-5 rounded-xl border border-border bg-primary-50/40 px-4 py-6 text-center" role="alert" data-testid="category-products-error">
      <p class="text-[0.8125rem] font-medium text-primary-950">{{ error === 'forbidden' ? 'Bạn không có quyền xem sản phẩm.' : 'Không thể tải sản phẩm. Vui lòng thử lại.' }}</p>
      <button v-if="error !== 'forbidden'" type="button" class="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[0.8125rem] font-semibold text-primary-700 hover:bg-primary-50" data-testid="category-products-retry" @click="load"><RefreshCw class="size-4" aria-hidden="true" />Thử lại</button>
    </div>
    <p v-else-if="!products.length" class="mt-5 rounded-xl border border-border/70 px-4 py-8 text-center text-[0.8125rem] text-muted-foreground" data-testid="category-products-empty">{{ search ? 'Không tìm thấy sản phẩm theo tên này.' : 'Chưa có sản phẩm trong phạm vi đã chọn.' }}</p>
    <div v-else class="mt-5 min-w-0 divide-y divide-border/60 border-y border-border/60" data-testid="category-products-list">
      <article v-for="product in products" :key="product.id" class="flex min-w-0 items-center gap-3 py-3 sm:gap-4" :data-testid="'category-product-' + product.id">
        <div class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-50 text-primary-600 sm:size-14">
          <img v-if="imageFor(product)" :src="imageFor(product)" :alt="'Ảnh ' + product.name" class="size-full object-cover" @error="failedImages.push(product.id)">
          <ImageIcon v-else class="size-5" aria-label="Sản phẩm chưa có ảnh hoặc ảnh không tải được" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="break-words text-[0.8125rem] font-semibold text-primary-950">{{ product.name }}</p>
          <p class="mt-0.5 break-words text-[0.75rem] text-muted-foreground">{{ product.brand?.name || 'Chưa có thương hiệu' }} · {{ product.category?.name || 'Chưa có danh mục' }}</p>
          <div class="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-muted-foreground"><span class="tabular-nums" :data-testid="'category-product-id-' + product.id">ID: {{ product.id }}</span><button type="button" class="grid size-6 shrink-0 place-items-center rounded-md text-primary-600 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary-500" :aria-label="copiedProductId === product.id ? `Đã sao chép ID sản phẩm ${product.id}` : `Sao chép ID sản phẩm ${product.id}`" :data-testid="'category-product-copy-' + product.id" @click="copyProductId(product.id)"><Check v-if="copiedProductId === product.id" class="size-3.5 text-emerald-700" aria-hidden="true" /><Copy v-else class="size-3.5" aria-hidden="true" /></button></div>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1 text-[0.6875rem] sm:flex-row sm:items-center sm:gap-2">
          <span v-if="product.is_featured" class="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-900">Nổi bật</span>
          <span :class="['rounded-full px-2 py-0.5 font-medium', product.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700']">{{ product.is_active ? 'Đang hoạt động' : 'Tạm ẩn' }}</span>
          <span class="tabular-nums text-muted-foreground">{{ product.variant_count }} biến thể</span>
          <button v-if="canMoveProducts" type="button" class="mt-1 rounded-lg border border-primary-200/80 bg-white px-2.5 py-1.5 font-medium text-primary-800 transition-colors hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:mt-0" :aria-label="`Chuyển danh mục cho sản phẩm ${product.name}, ID ${product.id}`" :data-testid="'category-product-move-' + product.id" @click="openMoveDialog(product, $event)">Chuyển danh mục</button>
        </div>
      </article>
    </div>

    <div v-if="!loading && !error && pagination.last_page > 1" class="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.75rem] text-muted-foreground" data-testid="category-products-pagination">
      <span>Trang {{ pagination.current_page }} / {{ pagination.last_page }}</span>
      <div class="flex gap-2">
        <button type="button" class="rounded-lg border border-border px-3 py-1.5 font-medium text-primary-800 hover:bg-primary-50 disabled:opacity-40" :disabled="page <= 1" data-testid="category-products-prev" @click="page--">Trước</button>
        <button type="button" class="rounded-lg border border-border px-3 py-1.5 font-medium text-primary-800 hover:bg-primary-50 disabled:opacity-40" :disabled="page >= pagination.last_page" data-testid="category-products-next" @click="page++">Tiếp</button>
      </div>
    </div>

    <div v-if="movingProduct" class="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/35 p-3 sm:p-5" data-testid="category-product-move-backdrop" @click.self="closeMoveDialog()">
      <section ref="dialogRef" role="dialog" aria-modal="true" aria-labelledby="category-product-move-title" aria-describedby="category-product-move-description" class="flex max-h-[min(90dvh,48rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-2xl shadow-primary-950/15" data-testid="category-product-move-dialog" @keydown="onDialogKeydown">
        <div class="border-b border-border/70 px-5 py-4 sm:px-6">
          <h3 id="category-product-move-title" class="text-base font-semibold text-primary-950">Chuyển danh mục</h3>
          <p id="category-product-move-description" class="mt-1 text-[0.8125rem] text-muted-foreground">Chuyển sản phẩm sang một danh mục khác. Sản phẩm không được sao chép.</p>
          <p class="mt-3 break-words text-[0.8125rem] font-medium text-primary-950" data-testid="category-product-move-identity">{{ movingProduct.name }} <span class="font-normal tabular-nums text-muted-foreground">· ID {{ movingProduct.id }}</span></p>
          <p class="mt-1 text-[0.75rem] text-muted-foreground">Danh mục hiện tại: <span class="font-medium text-primary-900">{{ movingProduct.category?.name || 'Chưa xác định' }}</span></p>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div v-if="selectedDestination" class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[0.8125rem] text-emerald-900" data-testid="category-product-move-selected">
            Danh mục đích: <span class="font-semibold">{{ selectedDestination.name }}</span>
            <span v-if="selectedDestination.ancestors.length" class="mt-0.5 block break-words text-[0.75rem] text-emerald-800">{{ selectedDestination.ancestors.map(item => item.name).join(' / ') }}</span>
          </div>
          <label class="block text-[0.8125rem] font-medium text-primary-950" for="category-product-destination-search">Tìm danh mục đích</label>
          <div class="relative mt-2">
            <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input id="category-product-destination-search" ref="destinationSearchRef" :value="destinationSearchInput" type="text" class="h-10 w-full rounded-xl border border-border bg-white pl-10 pr-3 text-[0.8125rem] text-primary-950 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" placeholder="Tên hoặc slug danh mục" data-testid="category-product-destination-search" @input="onDestinationSearch(($event.target as HTMLInputElement).value)">
          </div>
          <p v-if="destinationLoading" class="py-5 text-center text-[0.8125rem] text-muted-foreground" role="status" data-testid="category-product-destination-loading">Đang tải danh mục…</p>
          <div v-else-if="destinationError" class="py-5 text-center text-[0.8125rem]" role="alert" data-testid="category-product-destination-error">
            <p>Không thể tải danh mục. Vui lòng thử lại.</p>
            <button type="button" class="mt-2 rounded-lg px-3 py-2 font-medium text-primary-800 hover:bg-primary-50" data-testid="category-product-destination-retry" @click="loadDestinations">Thử lại</button>
          </div>
          <p v-else-if="!availableDestinations.length" class="py-5 text-center text-[0.8125rem] text-muted-foreground" data-testid="category-product-destination-empty">{{ destinationSearch ? 'Không tìm thấy danh mục đích ở trang này.' : 'Chưa có danh mục đích ở trang này.' }}</p>
          <div v-else class="mt-3 space-y-1" role="group" aria-label="Chọn danh mục đích" data-testid="category-product-destinations">
            <button v-for="item in availableDestinations" :key="item.id" type="button" class="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[0.8125rem] transition-colors hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" :class="selectedDestination?.id === item.id ? 'bg-emerald-50 text-emerald-900' : 'text-primary-950'" :aria-pressed="selectedDestination?.id === item.id" :data-testid="'category-product-destination-' + item.id" @click="selectedDestination = item; moveError = ''">
              <span class="min-w-0"><span class="block break-words font-medium">{{ item.name }}</span><span class="mt-0.5 block break-words text-[0.75rem] text-muted-foreground">{{ item.ancestors.length ? item.ancestors.map(ancestor => ancestor.name).join(' / ') + ' / ' : '' }}Cấp {{ item.depth + 1 }} · ID {{ item.id }}</span></span>
              <Check v-if="selectedDestination?.id === item.id" class="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
            </button>
          </div>
          <div v-if="!destinationLoading && !destinationError && destinationPagination.last_page > 1" class="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-[0.75rem] text-muted-foreground" data-testid="category-product-destination-pagination">
            <span>Trang {{ destinationPagination.current_page }} / {{ destinationPagination.last_page }}</span>
            <div class="flex gap-2"><button type="button" class="rounded-lg border border-border px-2.5 py-1.5 disabled:opacity-40" :disabled="destinationPage <= 1" data-testid="category-product-destination-prev" @click="destinationPage--">Trước</button><button type="button" class="rounded-lg border border-border px-2.5 py-1.5 disabled:opacity-40" :disabled="destinationPage >= destinationPagination.last_page" data-testid="category-product-destination-next" @click="destinationPage++">Tiếp</button></div>
          </div>
        </div>
        <div class="border-t border-border/70 bg-white px-5 py-4 sm:px-6">
          <p v-if="moveError" class="mb-3 break-words text-[0.8125rem] text-red-700" role="alert" data-testid="category-product-move-error">{{ moveError }}</p>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <button type="button" class="rounded-xl border border-border px-4 py-2 text-[0.8125rem] font-medium text-primary-900 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50" :disabled="moveSaving" data-testid="category-product-move-cancel" @click="closeMoveDialog()">Hủy</button>
            <button type="button" class="rounded-xl bg-primary-800 px-4 py-2 text-[0.8125rem] font-semibold text-white hover:bg-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-50" :disabled="moveSaving || !selectedDestination || selectedDestination.id === currentCategoryId(movingProduct)" :aria-busy="moveSaving" data-testid="category-product-move-confirm" @click="confirmMove">{{ moveSaving ? 'Đang chuyển…' : 'Xác nhận chuyển' }}</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
