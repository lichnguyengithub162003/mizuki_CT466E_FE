<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { ArrowDown, ArrowLeft, ArrowUpRight, Check, ChevronRight, Copy, FolderTree, Image as ImageIcon, RefreshCw, Sparkles, Trash2 } from '@lucide/vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import { deleteAdminCategory, getAdminCategories, getAdminCategory } from '@/api/adminApi'
import { useAuthStore } from '@/stores/auth'
import type { AdminCategoryRecord, AdminCategoryStatus } from '@/types/adminCategory'

type DetailError = 'not-found' | 'forbidden' | 'unavailable' | ''
type AncestorState = 'not-needed' | 'loading' | 'ready' | 'unknown'
const route = useRoute()
const router = useRouter()
const AdminCategoryEditor = defineAsyncComponent(() => import('./AdminCategoryEditorPage.vue'))
const AdminCategoryProductsTab = defineAsyncComponent(() => import('@/components/admin/AdminCategoryProductsTab.vue'))
const auth = useAuthStore()
const id = computed(() => String(route.params.id ?? ''))
const category = ref<AdminCategoryRecord | null>(null)
const loading = ref(true)
const error = ref<DetailError>('')
const failedImages = ref<string[]>([])
const ancestorState = ref<AncestorState>('not-needed')
const ancestorDetails = ref<AdminCategoryRecord[]>([])
const children = ref<AdminCategoryRecord[]>([])
const childrenPage = ref(0)
const childrenLastPage = ref(1)
const childrenTotal = ref(0)
const childrenLoading = ref(false)
const childrenError = ref('')
type DetailTab = 'overview' | 'structure' | 'products' | 'edit'
const activeTab = ref<DetailTab>('overview')
const overviewTab = ref<HTMLButtonElement | null>(null)
const structureTab = ref<HTMLButtonElement | null>(null)
const productsTab = ref<HTMLButtonElement | null>(null)
const editTab = ref<HTMLButtonElement | null>(null)
const editDirty = ref(false)
const saveNotice = ref('')
const copiedField = ref<'id' | 'slug' | null>(null)
const copyError = ref(false)
const detailRoot = ref<HTMLElement | null>(null)
const showScrollCue = ref(false)
const scrollCueStyle = ref<Record<string, string>>({})
const deleteDialogOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const deleteTrigger = ref<HTMLButtonElement | null>(null)
const deleteCancel = ref<HTMLButtonElement | null>(null)
const deleteDialog = ref<HTMLElement | null>(null)
let request = 0
let childrenRequest = 0
let deleteRequest = 0
let copyTimer: ReturnType<typeof setTimeout> | undefined
let detailResizeObserver: ResizeObserver | undefined
let detailScrollOwner: HTMLElement | null = null

const statusLabels: Record<AdminCategoryStatus, string> = {
  draft: 'Bản nháp', published: 'Đã xuất bản', hidden: 'Đã ẩn',
}
const imageUrl = computed(() => [category.value?.image_rendition_url, category.value?.image_url]
  .find(url => url && !failedImages.value.includes(url)) || '')
const blockingAncestor = computed(() => ancestorDetails.value.find(item => item.status !== 'published' || !item.is_active))
function ancestorStatus(id: number): string {
  if (ancestorState.value === 'loading') return 'Đang kiểm tra'
  const ancestor = ancestorDetails.value.find(item => item.id === id)
  return ancestor ? `${statusLabels[ancestor.status]}${ancestor.is_active ? '' : ' · Không hoạt động'}` : 'Chưa xác định'
}
function confirmDiscardEdit(): boolean {
  return !editDirty.value || window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ bản nháp?')
}
function openDeleteDialog(): void {
  if (auth.role !== 'super_admin' || !category.value || deleting.value) return
  if (editDirty.value && !window.confirm('Bạn có thay đổi chưa lưu. Nếu xóa danh mục, bản nháp này sẽ bị bỏ. Tiếp tục?')) return
  deleteError.value = ''
  deleteDialogOpen.value = true
  void nextTick(() => deleteCancel.value?.focus())
}
function closeDeleteDialog(): void {
  if (deleting.value) return
  deleteDialogOpen.value = false
  deleteError.value = ''
  void nextTick(() => deleteTrigger.value?.focus())
}
function onDeleteDialogKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeDeleteDialog()
  } else if (event.key === 'Tab') {
    const focusable = deleteDialog.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
    if (!focusable?.length) { event.preventDefault(); return }
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
}
function deleteErrorMessage(cause: unknown): string {
  const value = typeof cause === 'object' && cause !== null
    ? cause as { status?: number; kind?: string; response?: { status?: number } } : null
  const status = value?.status ?? value?.response?.status
  if (status === 409) return 'Không thể xóa danh mục do xung đột dữ liệu hoặc thao tác đồng thời. Vui lòng kiểm tra và thử lại.'
  if (status === 401 || value?.kind === 'unauthenticated') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại trước khi xóa danh mục.'
  if (status === 403 || value?.kind === 'forbidden') return 'Bạn không có quyền xóa danh mục này.'
  if (status === 404 || value?.kind === 'not-found') return 'Danh mục không còn tồn tại. Vui lòng quay về danh sách danh mục.'
  return 'Không thể xóa danh mục do lỗi hệ thống. Vui lòng thử lại sau.'
}
async function confirmDelete(): Promise<void> {
  const target = category.value
  if (!deleteDialogOpen.value || deleting.value || auth.role !== 'super_admin' || !target) return
  const current = ++deleteRequest
  deleting.value = true
  deleteError.value = ''
  void nextTick(() => deleteDialog.value?.focus())
  try {
    await deleteAdminCategory(target.id)
    if (current !== deleteRequest || category.value?.id !== target.id) return
    deleteDialogOpen.value = false
    editDirty.value = false
    await router.replace({ name: 'admin-categories' })
  } catch (cause) {
    if (current === deleteRequest) deleteError.value = deleteErrorMessage(cause)
  } finally {
    if (current === deleteRequest) {
      deleting.value = false
      if (deleteDialogOpen.value) void nextTick(() => deleteCancel.value?.focus())
    }
  }
}
async function copyMetadata(field: 'id' | 'slug', value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    clearTimeout(copyTimer)
    copiedField.value = field
    copyError.value = false
    copyTimer = setTimeout(() => { copiedField.value = null }, 2000)
  } catch {
    copiedField.value = null
    copyError.value = true
  }
}
function selectTab(next: DetailTab): boolean {
  if (activeTab.value === 'edit' && next !== 'edit' && !confirmDiscardEdit()) return false
  activeTab.value = next
  if (next === 'edit') saveNotice.value = ''
  if (next !== 'edit') editDirty.value = false
  return true
}
function updateScrollCue(): void {
  const element = detailScrollOwner
  if (!element) { showScrollCue.value = false; return }
  const bounds = element.getBoundingClientRect()
  scrollCueStyle.value = {
    left: `${bounds.left}px`, width: `${bounds.width}px`,
    bottom: `${Math.max(0, window.innerHeight - bounds.bottom)}px`,
  }
  showScrollCue.value = element.scrollHeight - element.scrollTop - element.clientHeight > 48
}
function scrollDetailDown(): void {
  const element = detailScrollOwner
  if (element) element.scrollBy({
    top: Math.max(240, element.clientHeight * 0.65),
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}
function releaseDetailScrollOwner(): void {
  detailResizeObserver?.disconnect()
  detailResizeObserver = undefined
  window.removeEventListener('resize', updateScrollCue)
  if (detailScrollOwner) {
    detailScrollOwner.removeEventListener('scroll', updateScrollCue)
    detailScrollOwner.classList.remove('category-detail-scrolling')
  }
  detailScrollOwner = null
  showScrollCue.value = false
}
onMounted(() => {
  detailScrollOwner = detailRoot.value?.closest('main') ?? null
  if (!detailScrollOwner) return
  detailScrollOwner.classList.add('category-detail-scrolling')
  detailScrollOwner.addEventListener('scroll', updateScrollCue, { passive: true })
  window.addEventListener('resize', updateScrollCue)
  if (typeof ResizeObserver !== 'undefined') {
    detailResizeObserver = new ResizeObserver(updateScrollCue)
    detailResizeObserver.observe(detailScrollOwner)
    if (detailRoot.value) detailResizeObserver.observe(detailRoot.value)
  }
  updateScrollCue()
})
watch(activeTab, async () => { await nextTick(); updateScrollCue() })
onBeforeRouteLeave(confirmDiscardEdit)
onBeforeRouteUpdate(confirmDiscardEdit)
function onTabKeydown(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const tabs: DetailTab[] = auth.role === 'super_admin' ? ['overview', 'structure', 'products', 'edit']
    : auth.role === 'branch_manager' ? ['overview', 'structure', 'products'] : ['overview', 'structure']
  const index = tabs.indexOf(activeTab.value)
  const next = event.key === 'Home' ? tabs[0]!
    : event.key === 'End' ? tabs[tabs.length - 1]!
      : tabs[(index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length]!
  if (selectTab(next)) void nextTick(() => ({
    overview: overviewTab.value, structure: structureTab.value, products: productsTab.value, edit: editTab.value,
  })[next]?.focus())
}
function onEditorSaved(saved: AdminCategoryRecord): void {
  if (String(saved.id) !== id.value) return
  editDirty.value = false
  saveNotice.value = 'Đã lưu thay đổi danh mục.'
  void load()
}
function goBack(): void {
  const previous = router.options.history.state.back
  if (typeof previous === 'string' && previous.startsWith('/') && !previous.startsWith('//')) {
    try {
      const target = router.resolve(previous)
      if (target.name === 'admin-categories' || (target.name === 'admin-category-detail' && target.params.id !== route.params.id)) {
        router.back()
        return
      }
    } catch { /* Invalid history falls back to the Category List. */ }
  }
  void router.push({ name: 'admin-categories' })
}
const visibility = computed(() => {
  const item = category.value
  if (!item) return { label: '', detail: '', positive: false }
  if (item.status !== 'published' || !item.is_active) return {
    label: 'Chưa thể hiển thị công khai', detail: 'Trạng thái của danh mục này chưa cho phép xuất hiện trong điều hướng cửa hàng.', positive: false,
  }
  if (ancestorState.value === 'loading') return { label: 'Đang kiểm tra đường dẫn', detail: 'Đang xác minh trạng thái các danh mục cấp trên.', positive: false }
  if (ancestorState.value === 'unknown') return { label: 'Chưa xác định khả năng hiển thị', detail: 'Không tải được trạng thái danh mục cấp trên. Vui lòng thử lại.', positive: false }
  if (blockingAncestor.value) return { label: 'Chưa thể hiển thị công khai', detail: `Danh mục cấp trên “${blockingAncestor.value.name}” chưa được xuất bản.`, positive: false }
  return { label: 'Đủ điều kiện hiển thị', detail: 'Danh mục này và các cấp trên đều đã xuất bản. Việc xuất hiện thực tế còn phụ thuộc quy tắc cửa hàng.', positive: true }
})

function dateLabel(value: string | null): string {
  if (!value) return 'Chưa có dữ liệu'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
}
function detailErrorKind(cause: unknown): DetailError {
  if (typeof cause === 'object' && cause !== null) {
    const details = cause as { kind?: unknown; status?: unknown }
    if (details.kind === 'not-found' || details.status === 404) return 'not-found'
    if (details.kind === 'forbidden' || details.status === 403) return 'forbidden'
  }
  return 'unavailable'
}
function resetChildren(): void {
  childrenRequest += 1
  children.value = []
  childrenPage.value = 0
  childrenLastPage.value = 1
  childrenTotal.value = 0
  childrenLoading.value = false
  childrenError.value = ''
}
async function loadChildren(page = 1): Promise<void> {
  const item = category.value
  if (!item || childrenLoading.value || (page > 1 && page > childrenLastPage.value)) return
  const current = ++childrenRequest
  const parentId = item.id
  childrenLoading.value = true
  childrenError.value = ''
  try {
    const result = await getAdminCategories({ mode: 'children', parent_id: parentId, page, per_page: 12, sort: 'sort_order', direction: 'asc' })
    if (current !== childrenRequest || category.value?.id !== parentId) return
    const unique = new Map<number, AdminCategoryRecord>(page === 1 ? [] : children.value.map(child => [child.id, child]))
    for (const child of result.items) unique.set(child.id, child)
    children.value = [...unique.values()]
    childrenPage.value = result.pagination.current_page
    childrenLastPage.value = result.pagination.last_page
    childrenTotal.value = result.pagination.total
  } catch {
    if (current === childrenRequest) childrenError.value = page === 1 ? 'Không thể tải danh mục con.' : 'Không thể tải thêm danh mục con.'
  } finally {
    if (current === childrenRequest) childrenLoading.value = false
  }
}
async function loadAncestorStatuses(item: AdminCategoryRecord, current: number): Promise<void> {
  ancestorState.value = 'loading'
  ancestorDetails.value = []
  try {
    const results = await Promise.all(item.ancestors.map(ancestor => getAdminCategory(ancestor.id)))
    if (current !== request) return
    ancestorDetails.value = results
    ancestorState.value = 'ready'
  } catch {
    if (current === request) ancestorState.value = 'unknown'
  }
}
async function load(): Promise<void> {
  const current = ++request
  activeTab.value = 'overview'
  editDirty.value = false
  resetChildren()
  loading.value = true
  error.value = ''
  category.value = null
  failedImages.value = []
  ancestorState.value = 'not-needed'
  ancestorDetails.value = []
  try {
    const result = await getAdminCategory(id.value)
    if (current !== request) return
    category.value = result
    if (result.status === 'published' && result.is_active) {
      if (result.ancestors.length) void loadAncestorStatuses(result, current)
      else if (result.parent_id !== null) ancestorState.value = 'unknown'
    }
    if (result.children_count > 0) void loadChildren()
  } catch (cause) {
    if (current === request) error.value = detailErrorKind(cause)
  } finally {
    if (current === request) {
      loading.value = false
      void nextTick(updateScrollCue)
    }
  }
}
watch(id, () => { deleteRequest += 1; deleteDialogOpen.value = false; deleting.value = false; deleteError.value = ''; saveNotice.value = ''; copiedField.value = null; copyError.value = false; clearTimeout(copyTimer); void load() }, { immediate: true })
watch(() => auth.role, role => { if (role !== 'super_admin') { deleteRequest += 1; deleteDialogOpen.value = false; deleting.value = false; deleteError.value = '' } })
onBeforeUnmount(() => { request += 1; childrenRequest += 1; deleteRequest += 1; clearTimeout(copyTimer); releaseDetailScrollOwner() })
</script>

<template>
  <section ref="detailRoot" class="min-w-0 space-y-4 pb-6" aria-label="Chi tiết danh mục" data-testid="category-detail-page">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button type="button" class="inline-flex items-center gap-1.5 rounded-md text-[0.8125rem] font-medium text-primary-700 hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" data-testid="category-back" @click="goBack">
        <ArrowLeft class="size-4" aria-hidden="true" />Quay lại
      </button>
      <button v-if="auth.role === 'super_admin' && category && !loading && !error" ref="deleteTrigger" type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-red-200/80 bg-white px-3 py-1.5 text-[0.75rem] font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500" data-testid="category-delete-open" @click="openDeleteDialog"><Trash2 class="size-3.5" aria-hidden="true" />Xóa danh mục</button>
    </div>
    <p v-if="saveNotice && !loading && !error" class="text-[0.8125rem] font-medium text-emerald-800" role="status" data-testid="category-save-notice">{{ saveNotice }}</p>

    <div v-if="loading" class="space-y-4" role="status" aria-label="Đang tải danh mục" data-testid="category-detail-loading">
      <div class="rounded-2xl bg-surface p-6 ring-1 ring-black/[0.04]">
        <div class="flex items-center gap-4"><BaseSkeleton class="size-20 shrink-0 rounded-xl" /><div class="flex-1 space-y-3"><BaseSkeleton class="h-6 max-w-72" /><BaseSkeleton class="h-4 max-w-48" /></div></div>
        <BaseSkeleton class="mt-7 h-64 rounded-xl" />
      </div>
    </div>
    <div v-else-if="error" class="rounded-2xl bg-surface px-6 py-12 text-center ring-1 ring-black/[0.04]" role="alert" data-testid="category-detail-error">
      <div class="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-50 text-primary-700"><FolderTree class="size-5" aria-hidden="true" /></div>
      <h1 class="mt-4 text-lg font-semibold text-primary-950">{{ error === 'not-found' ? 'Không tìm thấy danh mục' : error === 'forbidden' ? 'Bạn không có quyền xem danh mục này' : 'Không thể tải danh mục' }}</h1>
      <p class="mx-auto mt-2 max-w-md text-[0.8125rem] leading-6 text-muted-foreground">{{ error === 'unavailable' ? 'Dữ liệu hiện chưa sẵn sàng. Vui lòng thử lại sau.' : 'Kiểm tra lại đường dẫn hoặc quay về danh sách danh mục.' }}</p>
      <button v-if="error === 'unavailable'" type="button" class="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-800 px-4 py-2 text-[0.8125rem] font-semibold text-white hover:bg-primary-900" @click="load"><RefreshCw class="size-4" aria-hidden="true" />Thử lại</button>
    </div>

    <div v-else-if="category" class="min-w-0 overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-black/[0.05]">
      <header class="min-w-0 border-b border-emerald-100/70 bg-gradient-to-br from-emerald-100/85 via-teal-50/80 to-amber-50/75 px-4 py-4 sm:px-6 sm:py-5" data-testid="category-detail-header">
        <nav class="mb-4 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.75rem] text-muted-foreground" aria-label="Đường dẫn danh mục">
          <RouterLink to="/admin/categories" class="hover:text-primary-800">Danh mục</RouterLink>
          <template v-for="ancestor in category.ancestors" :key="ancestor.id">
            <ChevronRight class="size-3.5 shrink-0" aria-hidden="true" />
            <RouterLink :to="'/admin/categories/' + ancestor.id" class="max-w-full break-words hover:text-primary-800">{{ ancestor.name }}</RouterLink>
          </template>
          <ChevronRight class="size-3.5 shrink-0" aria-hidden="true" />
          <span class="min-w-0 break-words font-medium text-primary-800" aria-current="page">{{ category.name }}</span>
        </nav>
        <div class="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-7">
          <div class="flex min-w-0 items-center gap-4 lg:min-w-0 lg:flex-1">
            <div class="grid size-[4.5rem] shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-100 sm:size-20" data-testid="category-detail-image">
              <img v-if="imageUrl" :src="imageUrl" :alt="'Ảnh danh mục ' + category.name" class="size-full object-cover" @error="failedImages.push(imageUrl)">
              <ImageIcon v-else class="size-6" aria-label="Danh mục chưa có ảnh hoặc ảnh không tải được" />
            </div>
            <div class="min-w-0">
              <p class="text-[0.6875rem] font-semibold uppercase tracking-[0.13em] text-primary-700">Danh mục cấp {{ category.depth + 1 }}</p>
              <h1 class="mt-1 break-words text-xl font-semibold tracking-tight text-primary-950 sm:text-2xl">{{ category.name }}</h1>
            </div>
          </div>
          <dl class="grid min-w-0 grid-cols-2 gap-x-5 gap-y-3 border-t border-border/70 pt-4 text-[0.8125rem] lg:w-[min(25rem,42%)] lg:shrink-0 lg:border-l lg:border-t-0 lg:py-1 lg:pl-7" data-testid="category-header-metadata">
            <div class="min-w-0"><dt class="text-[0.6875rem] text-muted-foreground">Trạng thái</dt><dd class="mt-1"><span :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium', category.status === 'published' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700']" data-testid="category-lifecycle"><span :class="['size-1.5 rounded-full', category.status === 'published' ? 'bg-emerald-600' : 'bg-slate-500']" />{{ statusLabels[category.status] }}</span></dd></div>
            <div class="min-w-0"><dt class="text-[0.6875rem] text-muted-foreground">Nổi bật</dt><dd class="mt-1 font-medium text-primary-950"><span v-if="category.is_featured" class="inline-flex items-center gap-1 text-amber-800" data-testid="category-featured"><Sparkles class="size-3.5" aria-hidden="true" />Có</span><span v-else>Không</span></dd></div>
            <div class="min-w-0"><dt class="text-[0.6875rem] text-muted-foreground">ID danh mục</dt><dd class="mt-0.5 flex min-w-0 items-center gap-1 font-medium tabular-nums text-primary-950"><span>{{ category.id }}</span><button type="button" class="grid size-7 shrink-0 place-items-center rounded-md text-primary-600 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary-500" :aria-label="copiedField === 'id' ? 'Đã sao chép ID danh mục' : 'Sao chép ID danh mục'" data-testid="category-copy-id" @click="copyMetadata('id', String(category.id))"><Check v-if="copiedField === 'id'" class="size-3.5 text-emerald-700" aria-hidden="true" /><Copy v-else class="size-3.5" aria-hidden="true" /></button></dd></div>
            <div class="min-w-0"><dt class="text-[0.6875rem] text-muted-foreground">Slug</dt><dd class="mt-0.5 flex min-w-0 items-start gap-1 font-medium text-primary-950"><span class="min-w-0 break-all">{{ category.slug }}</span><button type="button" class="grid size-7 shrink-0 place-items-center rounded-md text-primary-600 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary-500" :aria-label="copiedField === 'slug' ? 'Đã sao chép slug' : 'Sao chép slug'" data-testid="category-copy-slug" @click="copyMetadata('slug', category.slug)"><Check v-if="copiedField === 'slug'" class="size-3.5 text-emerald-700" aria-hidden="true" /><Copy v-else class="size-3.5" aria-hidden="true" /></button></dd></div>
          </dl>
        </div>
        <p v-if="copyError" class="mt-2 text-[0.75rem] text-red-700" role="status">Không thể sao chép. Vui lòng thử lại.</p>
      </header>

      <div class="flex gap-1 overflow-x-auto border-b border-border/60 px-4 pt-1 sm:px-6" role="tablist" aria-label="Nội dung danh mục" @keydown="onTabKeydown">
        <button id="category-tab-overview" ref="overviewTab" type="button" role="tab" aria-controls="category-panel-overview" :aria-selected="activeTab === 'overview'" :tabindex="activeTab === 'overview' ? 0 : -1" :class="['shrink-0 border-b-2 px-3 py-3 text-[0.8125rem] font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary-500', activeTab === 'overview' ? 'border-primary-700 text-primary-900' : 'border-transparent text-muted-foreground hover:text-primary-900']" data-testid="category-tab-overview" @click="selectTab('overview')">Tổng quan</button>
        <button id="category-tab-structure" ref="structureTab" type="button" role="tab" aria-controls="category-panel-structure" :aria-selected="activeTab === 'structure'" :tabindex="activeTab === 'structure' ? 0 : -1" :class="['shrink-0 border-b-2 px-3 py-3 text-[0.8125rem] font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary-500', activeTab === 'structure' ? 'border-primary-700 text-primary-900' : 'border-transparent text-muted-foreground hover:text-primary-900']" data-testid="category-tab-structure" @click="selectTab('structure')">Cấu trúc danh mục</button>
        <button v-if="auth.role === 'super_admin' || auth.role === 'branch_manager'" id="category-tab-products" ref="productsTab" type="button" role="tab" aria-controls="category-panel-products" :aria-selected="activeTab === 'products'" :tabindex="activeTab === 'products' ? 0 : -1" :class="['shrink-0 border-b-2 px-3 py-3 text-[0.8125rem] font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary-500', activeTab === 'products' ? 'border-primary-700 text-primary-900' : 'border-transparent text-muted-foreground hover:text-primary-900']" data-testid="category-tab-products" @click="selectTab('products')">Sản phẩm</button>
        <button v-if="auth.role === 'super_admin'" id="category-tab-edit" ref="editTab" type="button" role="tab" aria-controls="category-panel-edit" :aria-selected="activeTab === 'edit'" :tabindex="activeTab === 'edit' ? 0 : -1" :class="['shrink-0 border-b-2 px-3 py-3 text-[0.8125rem] font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary-500', activeTab === 'edit' ? 'border-primary-700 text-primary-900' : 'border-transparent text-muted-foreground hover:text-primary-900']" data-testid="category-tab-edit" @click="selectTab('edit')">Chỉnh sửa</button>
      </div>

      <section v-if="activeTab === 'overview'" id="category-panel-overview" class="min-w-0 px-4 py-5 sm:px-6 sm:py-6" role="tabpanel" aria-labelledby="category-tab-overview" tabindex="0" data-testid="category-overview">
        <div class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,1fr)] lg:gap-8">
          <div class="min-w-0 space-y-6">
            <div>
              <h2 class="text-[0.9375rem] font-semibold text-primary-950">Mô tả</h2>
              <p class="mt-2 whitespace-pre-wrap break-words text-[0.8125rem] leading-6 text-primary-950">{{ category.description || 'Chưa có mô tả' }}</p>
            </div>
            <div class="grid grid-cols-2 gap-3 border-y border-border/60 py-4">
              <div><p class="text-[0.75rem] text-muted-foreground">Danh mục con trực tiếp</p><p class="mt-1 text-xl font-semibold tabular-nums text-primary-950">{{ category.children_count }}</p></div>
              <div><p class="text-[0.75rem] text-muted-foreground">Sản phẩm trực tiếp</p><p class="mt-1 text-xl font-semibold tabular-nums text-primary-950">{{ category.product_count }}</p></div>
            </div>
            <div data-testid="category-effective-visibility">
              <h2 class="text-[0.9375rem] font-semibold text-primary-950">Hiển thị công khai</h2>
              <p :class="['mt-2 text-[0.8125rem] font-semibold', visibility.positive ? 'text-emerald-800' : 'text-primary-950']">{{ visibility.label }}</p>
              <p class="mt-1 text-[0.75rem] leading-5 text-muted-foreground">{{ visibility.detail }}</p>
              <p v-if="category.is_featured" class="mt-2 text-[0.75rem] leading-5 text-muted-foreground">Nổi bật là thuộc tính danh mục, không xác nhận vị trí hiển thị trên trang chủ.</p>
            </div>
          </div>
          <dl class="grid min-w-0 content-start gap-x-5 gap-y-5 border-t border-border/60 pt-5 text-[0.8125rem] sm:grid-cols-2 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:py-1 lg:pl-6">
            <div><dt class="text-[0.75rem] text-muted-foreground">Danh mục cha</dt><dd class="mt-1 font-medium text-primary-950"><RouterLink v-if="category.parent" :to="'/admin/categories/' + category.parent.id" class="inline-flex min-w-0 items-center gap-1 text-primary-700 hover:underline" data-testid="category-parent-link"><span class="break-words">{{ category.parent.name }}</span><ArrowUpRight class="size-3.5 shrink-0" aria-hidden="true" /></RouterLink><span v-else>{{ category.parent_id === null ? 'Danh mục gốc' : 'Chưa xác định danh mục cha' }}</span></dd></div>
            <div><dt class="text-[0.75rem] text-muted-foreground">Thứ tự sắp xếp</dt><dd class="mt-1 font-medium tabular-nums text-primary-950">{{ category.sort_order }}</dd></div>
            <div><dt class="text-[0.75rem] text-muted-foreground">Ngày tạo</dt><dd class="mt-1 font-medium text-primary-950">{{ dateLabel(category.created_at) }}</dd></div>
            <div><dt class="text-[0.75rem] text-muted-foreground">Cập nhật gần nhất</dt><dd class="mt-1 font-medium text-primary-950">{{ dateLabel(category.updated_at) }}</dd></div>
          </dl>
        </div>
      </section>

      <section v-if="activeTab === 'structure'" id="category-panel-structure" class="min-w-0 px-4 py-5 sm:px-6 sm:py-6" role="tabpanel" aria-labelledby="category-tab-structure" tabindex="0" data-testid="category-children">
        <div class="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div><h2 class="text-[0.9375rem] font-semibold text-primary-950">Cây danh mục</h2><p class="mt-1 text-[0.75rem] text-muted-foreground">Đường dẫn hiện tại và {{ category.children_count }} danh mục con trực tiếp</p></div>
          <span v-if="childrenPage && childrenLastPage > 1" class="text-[0.75rem] text-muted-foreground">Trang con {{ childrenPage }}/{{ childrenLastPage }}</span>
        </div>
        <div class="min-w-0 space-y-1" data-testid="category-tree">
          <RouterLink v-for="(ancestor, index) in category.ancestors" :key="ancestor.id" :to="'/admin/categories/' + ancestor.id" :style="{ marginInlineStart: Math.min(index, 3) * 20 + 'px' }" class="group flex min-w-0 items-center gap-3 rounded-lg border-l-2 border-primary-200 px-3 py-2.5 hover:bg-primary-50/60 focus-visible:outline-2 focus-visible:outline-primary-500" :data-testid="'category-ancestor-' + ancestor.id">
            <FolderTree class="size-4 shrink-0 text-primary-600" aria-hidden="true" />
            <span class="min-w-0 flex-1"><span class="block break-words text-[0.8125rem] font-medium text-primary-950">{{ ancestor.name }}</span><span class="text-[0.6875rem] text-muted-foreground">Cấp {{ index + 1 }} · {{ ancestorStatus(ancestor.id) }}</span></span>
            <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </RouterLink>
          <div :style="{ marginInlineStart: Math.min(category.depth, 3) * 20 + 'px' }" class="flex min-w-0 items-center gap-3 rounded-xl border border-primary-200 bg-primary-50/75 px-3 py-3" aria-current="page" data-testid="category-current-node">
            <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-800 text-white"><FolderTree class="size-4" aria-hidden="true" /></span>
            <span class="min-w-0 flex-1"><span class="block break-words text-[0.8125rem] font-semibold text-primary-950">{{ category.name }}</span><span class="text-[0.6875rem] text-primary-700">Đang xem · Cấp {{ category.depth + 1 }} · {{ statusLabels[category.status] }}{{ category.is_active ? '' : ' · Không hoạt động' }}</span></span>
          </div>
          <div :style="{ marginInlineStart: Math.min(category.depth + 1, 3) * 20 + 'px' }" class="min-w-0 border-l-2 border-primary-200 pl-3 sm:pl-4">
            <div v-if="category.children_count === 0" class="py-4 text-[0.8125rem] text-muted-foreground" data-testid="category-children-empty">Chưa có danh mục con trực tiếp.</div>
            <div v-else-if="childrenLoading && !childrenPage" class="space-y-2 py-3" role="status" aria-label="Đang tải danh mục con"><BaseSkeleton v-for="index in 3" :key="index" class="h-12 rounded-lg" /></div>
            <div v-else-if="childrenError && !childrenPage" class="py-4 text-[0.8125rem]" role="alert"><p class="text-muted-foreground">{{ childrenError }}</p><button type="button" class="mt-2 font-semibold text-primary-700 hover:underline" @click="loadChildren(1)">Thử lại</button></div>
            <template v-else>
              <p v-if="!children.length" class="py-4 text-[0.8125rem] text-muted-foreground">Không có danh mục con trong trang dữ liệu này.</p>
              <ul v-else class="space-y-1">
                <li v-for="child in children" :key="child.id">
                  <RouterLink :to="'/admin/categories/' + child.id" class="group flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-primary-50/60 focus-visible:outline-2 focus-visible:outline-primary-500" :data-testid="'category-child-' + child.id">
                    <FolderTree class="size-4 shrink-0 text-primary-600" aria-hidden="true" />
                    <span class="min-w-0 flex-1"><span class="block break-words text-[0.8125rem] font-medium text-primary-950">{{ child.name }}</span><span class="block break-all text-[0.6875rem] text-muted-foreground">Cấp {{ child.depth + 1 }} · {{ statusLabels[child.status] }}{{ child.is_active ? '' : ' · Không hoạt động' }} · {{ child.slug }}</span></span>
                    <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </RouterLink>
                </li>
              </ul>
              <div v-if="childrenPage < childrenLastPage || childrenError" class="pt-3 text-center">
                <p v-if="childrenError" class="mb-2 text-[0.75rem] text-red-700" role="alert">{{ childrenError }}</p>
                <button type="button" class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[0.8125rem] font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50" :disabled="childrenLoading" data-testid="category-children-more" @click="loadChildren(childrenPage + 1)"><RefreshCw v-if="childrenLoading" class="size-3.5 animate-spin" aria-hidden="true" />{{ childrenLoading ? 'Đang tải…' : 'Tải thêm danh mục con' }}</button>
              </div>
              <p v-else-if="childrenLastPage > 1" class="pt-3 text-center text-[0.75rem] text-muted-foreground">Đã hiển thị {{ children.length }}/{{ childrenTotal }} danh mục con</p>
            </template>
          </div>
        </div>
      </section>
      <section v-if="(auth.role === 'super_admin' || auth.role === 'branch_manager') && activeTab === 'products'" id="category-panel-products" class="min-w-0 px-4 py-5 sm:px-6" role="tabpanel" aria-labelledby="category-tab-products" tabindex="0" data-testid="category-products-panel">
        <AdminCategoryProductsTab :category-id="category.id" />
      </section>
      <section v-if="auth.role === 'super_admin' && activeTab === 'edit'" id="category-panel-edit" class="relative min-w-0 px-4 py-5 sm:px-6" role="tabpanel" aria-labelledby="category-tab-edit" tabindex="0" data-testid="category-edit-panel">
        <AdminCategoryEditor :category-id="category.id" :initial-category="category" embedded @dirty-change="editDirty = $event" @saved="onEditorSaved" />
      </section>
    </div>
    <div v-if="deleteDialogOpen && category" class="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/40 p-3 sm:p-5" data-testid="category-delete-backdrop" @click.self="closeDeleteDialog">
      <section ref="deleteDialog" role="dialog" aria-modal="true" aria-labelledby="category-delete-title" aria-describedby="category-delete-description" tabindex="-1" class="w-full max-w-md rounded-2xl border border-red-100 bg-white p-5 shadow-2xl shadow-primary-950/15 sm:p-6" data-testid="category-delete-dialog" @keydown="onDeleteDialogKeydown">
        <div class="grid size-9 place-items-center rounded-xl bg-red-50 text-red-700"><Trash2 class="size-4" aria-hidden="true" /></div>
        <h2 id="category-delete-title" class="mt-3 text-base font-semibold text-primary-950">Xóa danh mục</h2>
        <p id="category-delete-description" class="mt-2 text-[0.8125rem] leading-6 text-primary-800">Danh mục sẽ được đưa vào thùng rác, không bị xóa vĩnh viễn. Danh mục con trực tiếp được nâng lên cùng cấp với danh mục này; các sản phẩm và danh mục con khác được giữ nguyên.</p>
        <div class="mt-4 rounded-xl border border-border/70 bg-primary-50/50 px-3.5 py-3 text-[0.8125rem] text-primary-950">
          <p class="break-words font-semibold" data-testid="category-delete-identity">{{ category.name }} <span class="font-normal tabular-nums text-muted-foreground">· ID {{ category.id }}</span></p>
          <p class="mt-1.5 text-muted-foreground">{{ category.product_count }} sản phẩm trực tiếp · {{ category.children_count }} danh mục con trực tiếp</p>
        </div>
        <p class="mt-3 text-[0.75rem] leading-5 text-muted-foreground">Nếu còn sản phẩm được gán trực tiếp, hãy chuyển chúng sang danh mục khác trước khi xóa.</p>
        <p v-if="deleteError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[0.8125rem] leading-5 text-red-800" role="alert" data-testid="category-delete-error">{{ deleteError }}</p>
        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <button ref="deleteCancel" type="button" class="rounded-xl border border-border px-4 py-2 text-[0.8125rem] font-medium text-primary-900 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50" :disabled="deleting" data-testid="category-delete-cancel" @click="closeDeleteDialog">Hủy</button>
          <button type="button" class="rounded-xl bg-red-700 px-4 py-2 text-[0.8125rem] font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-50" :disabled="deleting" :aria-busy="deleting" data-testid="category-delete-confirm" @click="confirmDelete">{{ deleting ? 'Đang xóa…' : 'Xác nhận xóa' }}</button>
        </div>
      </section>
    </div>
    <div v-if="showScrollCue" class="pointer-events-none fixed z-20 flex h-28 items-start justify-center bg-gradient-to-t from-white/85 via-white/40 to-transparent pt-2" :style="scrollCueStyle" data-testid="category-detail-scroll-cue">
      <button type="button" class="pointer-events-auto grid size-9 place-items-center rounded-full border border-primary-200 bg-white/95 text-primary-800 shadow-sm transition hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary-500" aria-label="Cuộn xuống để xem thêm" @click="scrollDetailDown"><ArrowDown class="size-4" aria-hidden="true" /></button>
    </div>
  </section>
</template>

<style scoped>
:global(main.category-detail-scrolling) { scrollbar-width: none; }
:global(main.category-detail-scrolling::-webkit-scrollbar) { display: none; }
</style>
