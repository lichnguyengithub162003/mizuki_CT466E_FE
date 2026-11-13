<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter, RouterLink } from 'vue-router'
import { ArrowLeft, Check, ChevronDown, Image as ImageIcon, RefreshCw, Star, Trash2 } from '@lucide/vue'
import BasePopover from '@/components/common/BasePopover.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { deleteAdminBrand, getAdminBrand, getAdminBrandDeletePreview, getAdminBrandProducts, getAdminBrandEvents, setAdminBrandFeaturedProduct, updateAdminBrand } from '@/api/adminApi'
import { useAuthStore } from '@/stores/auth'
import type { AdminBrandDeletePreview, AdminBrandEvent, AdminBrandProduct, AdminBrandRecord, AdminBrandStatus } from '@/types/adminBrand'
import { brandEventDetails, brandEventTitle } from '@/utils/brandAuditPresentation'

type Tab = 'overview' | 'profile' | 'products' | 'storefront' | 'promotions' | 'audit'
const AdminBrandEditor = defineAsyncComponent(() => import('./AdminBrandEditorPage.vue'))
const AdminBrandStorefrontTab = defineAsyncComponent(() => import('@/components/admin/AdminBrandStorefrontTab.vue'))
const AdminBrandPromotionsTab = defineAsyncComponent(() => import('@/components/admin/AdminBrandPromotionsTab.vue'))
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const id = computed(() => Number(route.params.id))
const brand = ref<AdminBrandRecord | null>(null)
const loading = ref(true)
const error = ref('')
const activeTab = ref<Tab>(route.query.tab === 'profile' && auth.role === 'super_admin' ? 'profile' : 'overview')
const editDirty = ref(false)
const storefrontDirty = ref(false)
const logoFailed = ref(false)
const deleteOpen = ref(false)
const deleteStep = ref<1 | 2>(1)
const deleteMode = ref<'brand_only' | 'brand_and_products'>('brand_only')
const confirmName = ref('')
const preview = ref<AdminBrandDeletePreview | null>(null)
const previewError = ref('')
const deleting = ref(false)
const deleteError = ref('')
const statusPending = ref(false)
const statusError = ref('')
const products = ref<AdminBrandProduct[]>([])
const failedProductImages = ref<Set<number>>(new Set())
const productNames = computed(() => new Map(products.value.map(product => [product.id, product.name])))
const featuring = ref<number | null>(null)
const featuredError = ref('')
const productPage = ref(1)
const productLastPage = ref(1)
const productTotal = ref(0)
const productLoading = ref(false)
const productError = ref('')
const productSearch = ref('')
const events = ref<AdminBrandEvent[]>([])
const eventPage = ref(1)
const eventLastPage = ref(1)
const eventAction = ref('')
const eventFilterOpen = ref(false)
const statusDialogOpen = ref(false)
const nextStatus = ref<AdminBrandStatus>('hidden')
const eventLoading = ref(false)
const eventError = ref('')
let eventSequence = 0
let detailSequence = 0
let productSequence = 0
const labels: Record<AdminBrandStatus, string> = { published: 'Đã xuất bản', hidden: 'Đã ẩn', draft: 'Bản nháp' }
const logoSrc = computed(() => logoFailed.value ? null : brand.value?.logo_rendition_url || brand.value?.logo_url)

function selectTab(tab: Tab): void {
  if (tab === activeTab.value || ((tab === 'profile' || tab === 'storefront' || tab === 'promotions' || tab === 'audit') && auth.role !== 'super_admin')) return
  if (activeTab.value === 'profile' && editDirty.value && !window.confirm('Bạn có thay đổi chưa lưu. Bỏ bản nháp?')) return
  if (activeTab.value === 'storefront' && storefrontDirty.value && !window.confirm('Bạn có thay đổi thiết kế chưa lưu. Bỏ thay đổi?')) return
  activeTab.value = tab
  editDirty.value = false
  storefrontDirty.value = false
  void router.replace({ query: { ...route.query, tab } })
}
async function loadEvents(): Promise<void> {
  if (!brand.value || activeTab.value !== 'audit' || auth.role !== 'super_admin') return
  const current = ++eventSequence
  eventLoading.value = true; eventError.value = ''
  try {
    const result = await getAdminBrandEvents(brand.value.id, eventPage.value, eventAction.value)
    if (current !== eventSequence) return
    events.value = result.items
    eventLastPage.value = result.pagination.last_page
  } catch { if (current === eventSequence) eventError.value = 'Không thể tải lịch sử thương hiệu.' }
  finally { if (current === eventSequence) eventLoading.value = false }
}
async function load(): Promise<void> {
  const current = ++detailSequence
  loading.value = true; error.value = ''
  try {
    const result = await getAdminBrand(id.value)
    if (current !== detailSequence) return
    brand.value = result
    logoFailed.value = false
    if (route.query.action === 'delete' && auth.role === 'super_admin') void openDelete()
  } catch { if (current === detailSequence) error.value = 'Không thể tải thương hiệu. Vui lòng thử lại.' }
  finally { if (current === detailSequence) loading.value = false }
}
async function loadProducts(): Promise<void> {
  if (!brand.value || activeTab.value !== 'products') return
  const current = ++productSequence
  productLoading.value = true; productError.value = ''
  try {
    const result = await getAdminBrandProducts(brand.value.id, productPage.value, productSearch.value)
    if (current !== productSequence) return
    products.value = result.items; productLastPage.value = result.pagination.last_page; productTotal.value = result.pagination.total
    if (!result.items.length && productPage.value > result.pagination.last_page) productPage.value = Math.max(1, result.pagination.last_page)
  } catch { if (current === productSequence) productError.value = 'Không thể tải sản phẩm của thương hiệu.' }
  finally { if (current === productSequence) productLoading.value = false }
}
async function toggleFeatured(product: AdminBrandProduct): Promise<void> {
  if (!brand.value || auth.role !== 'super_admin' || featuring.value !== null) return
  featuring.value = product.id; featuredError.value = ''
  try {
    await setAdminBrandFeaturedProduct(brand.value.id, product.id, product.brand_featured_sort_order === null)
    await loadProducts()
  } catch { featuredError.value = 'Không thể cập nhật sản phẩm nổi bật. Vui lòng thử lại.' }
  finally { featuring.value = null }
}
async function openDelete(): Promise<void> {
  if (!brand.value || auth.role !== 'super_admin' || deleting.value) return
  if (editDirty.value && !window.confirm('Bỏ thay đổi chưa lưu để xóa thương hiệu?')) return
  deleteOpen.value = true; deleteStep.value = 1; deleteMode.value = 'brand_only'; confirmName.value = ''; deleteError.value = ''; previewError.value = ''
  try { preview.value = await getAdminBrandDeletePreview(brand.value.id) }
  catch { previewError.value = 'Chưa lấy được số liệu tác động. Vui lòng thử lại.' }
}
function openStatusDialog(): void {
  if (!brand.value || statusPending.value || auth.role !== 'super_admin') return
  nextStatus.value = brand.value.status === 'published' ? 'hidden' : 'published'
  statusError.value = ''
  statusDialogOpen.value = true
}
async function confirmStatus(): Promise<void> {
  if (!brand.value || statusPending.value || auth.role !== 'super_admin' || !statusDialogOpen.value) return
  statusPending.value = true; statusError.value = ''
  try { brand.value = await updateAdminBrand(brand.value.id, { status: nextStatus.value }); statusDialogOpen.value = false }
  catch { statusError.value = 'Không thể cập nhật trạng thái thương hiệu. Vui lòng thử lại.' }
  finally { statusPending.value = false }
}
function closeDelete(): void { if (!deleting.value) { deleteOpen.value = false; void router.replace({ query: { ...route.query, action: undefined } }) } }
async function confirmDelete(): Promise<void> {
  if (!brand.value || deleting.value || !preview.value || (deleteMode.value === 'brand_and_products' && confirmName.value !== brand.value.name)) return
  deleting.value = true; deleteError.value = ''
  try {
    await deleteAdminBrand(brand.value.id, deleteMode.value, confirmName.value)
    editDirty.value = false
    await router.replace({ name: 'admin-brands' })
  } catch { deleteError.value = 'Không thể xóa thương hiệu do xung đột hoặc lỗi hệ thống. Vui lòng kiểm tra và thử lại.' }
  finally { deleting.value = false }
}
function onSaved(saved: AdminBrandRecord): void { brand.value = saved; editDirty.value = false; activeTab.value = 'overview'; void router.replace({ query: { ...route.query, tab: 'overview' } }) }
watch(id, () => { brand.value = null; productPage.value = 1; void load() }, { immediate: true })
watch([activeTab, productPage, productSearch], () => { if (activeTab.value === 'products') void loadProducts() })
watch([activeTab, eventPage, eventAction], () => { if (activeTab.value === 'audit') void loadEvents() })
onBeforeRouteLeave(() => !storefrontDirty.value || window.confirm('Bạn có thay đổi thiết kế chưa lưu. Rời trang và bỏ thay đổi?'))
onBeforeUnmount(() => { detailSequence++; productSequence++; eventSequence++ })
</script>

<template>
  <section class="min-w-0 space-y-3 pb-8" data-testid="admin-brand-detail">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <RouterLink to="/admin/brands" class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700"><ArrowLeft class="size-4" />Danh sách thương hiệu</RouterLink>
      <div v-if="brand && auth.role === 'super_admin'" class="flex items-center gap-2">
        <button type="button" :disabled="statusPending" class="rounded-lg border border-primary-200 px-3 py-2 text-xs font-semibold text-primary-800 disabled:opacity-50" @click="openStatusDialog">{{ brand.status === 'published' ? 'Ẩn' : 'Xuất bản' }}</button>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50" data-testid="brand-delete-open" @click="openDelete"><Trash2 class="size-4" />Xóa thương hiệu</button>
      </div>
    </div>
    <p v-if="statusError" role="alert" class="text-xs text-red-800">{{ statusError }}</p>
    <div v-if="loading" role="status" class="rounded-2xl bg-white p-8 text-sm text-muted-foreground">Đang tải thương hiệu…</div>
    <div v-else-if="error" role="alert" class="rounded-2xl bg-white p-8 text-center"><p class="text-sm text-red-800">{{ error }}</p><button type="button" class="mt-2 inline-flex items-center gap-2 font-semibold text-primary-700" @click="load"><RefreshCw class="size-4" />Thử lại</button></div>
    <template v-else-if="brand">
      <header class="flex min-w-0 flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-r from-primary-50 via-white to-white p-4 shadow-xs ring-1 ring-primary-100/70 sm:p-5">
        <span class="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-2 ring-1 ring-primary-100"><img v-if="logoSrc" :src="logoSrc" :alt="'Logo ' + brand.name" class="size-full object-contain" @error="logoFailed = true"><ImageIcon v-else class="size-7 text-primary-300" /></span>
        <div class="min-w-0 flex-1"><p class="text-[0.6875rem] font-semibold uppercase tracking-[.13em] text-primary-600">THƯƠNG HIỆU · ID {{ brand.id }}</p><h1 class="mt-1 break-words text-xl font-semibold tracking-tight text-primary-950 sm:text-2xl">{{ brand.name }}</h1><p class="mt-1 text-xs text-primary-700">{{ brand.origin_country || 'Chưa có xuất xứ' }}</p></div>
        <div class="flex flex-wrap items-center gap-2"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="brand.status === 'published' ? 'bg-emerald-50 text-emerald-800' : brand.status === 'hidden' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'">{{ labels[brand.status] }}</span><span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-primary-800 ring-1 ring-primary-100">{{ brand.product_count }} sản phẩm</span></div>
      </header>
      <div class="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-black/[0.05]">
        <div class="flex overflow-x-auto border-b border-border/70 px-2 sm:px-4" role="tablist" aria-label="Nội dung thương hiệu">
          <button v-for="tab in (auth.role === 'super_admin' ? ['overview', 'profile', 'products', 'storefront', 'promotions', 'audit'] : ['overview', 'products']) as Tab[]" :key="tab" type="button" role="tab" :aria-selected="activeTab === tab" :data-testid="'brand-tab-' + tab" class="shrink-0 border-b-2 px-3 py-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary-500" :class="activeTab === tab ? 'border-primary-700 text-primary-900' : 'border-transparent text-muted-foreground hover:text-primary-800'" @click="selectTab(tab)">{{ tab === 'overview' ? 'Tổng quan' : tab === 'profile' ? 'Hồ sơ & chỉnh sửa' : tab === 'products' ? 'Sản phẩm' : tab === 'storefront' ? 'Thiết kế gian hàng' : tab === 'promotions' ? 'Ưu đãi' : 'Lịch sử' }}</button>
        </div>
        <div v-if="activeTab === 'overview'" class="grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(15rem,.7fr)]" role="tabpanel" data-testid="brand-overview">
          <section><h2 class="text-sm font-semibold text-primary-950">Giới thiệu</h2><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-primary-800">{{ brand.description || 'Chưa có mô tả thương hiệu.' }}</p><dl class="mt-5 grid gap-3 border-t border-border/60 pt-4 text-xs sm:grid-cols-2"><div><dt class="text-muted-foreground">Website chính thức</dt><dd v-if="brand.official_website" class="mt-1 break-all font-medium text-primary-700"><a :href="brand.official_website" target="_blank" rel="noopener noreferrer">{{ brand.official_website }}</a></dd><dd v-else>—</dd></div><div><dt class="text-muted-foreground">Năm thành lập</dt><dd class="mt-1 font-medium">{{ brand.established_year ?? '—' }}</dd></div><div><dt class="text-muted-foreground">Ngày tham gia Mizuki</dt><dd class="mt-1 font-medium">{{ brand.joined_at ? new Date(brand.joined_at).toLocaleDateString('vi-VN') : '—' }}</dd></div></dl></section>
          <section><h2 class="text-sm font-semibold text-primary-950">Quy mô hiện tại</h2><dl class="mt-3 grid grid-cols-2 gap-2"><div class="rounded-xl bg-primary-50/70 p-3"><dt class="text-xs text-muted-foreground">Người theo dõi</dt><dd class="mt-1 text-lg font-semibold tabular-nums">{{ brand.follower_count.toLocaleString('vi-VN') }}</dd></div><div class="rounded-xl bg-primary-50/70 p-3"><dt class="text-xs text-muted-foreground">Sản phẩm</dt><dd class="mt-1 text-lg font-semibold tabular-nums">{{ brand.product_count.toLocaleString('vi-VN') }}</dd></div></dl><div v-if="auth.role === 'super_admin'" class="mt-4 border-t border-border/70 pt-4 text-xs"><h3 class="font-semibold text-primary-950">Quan hệ đối tác · nội bộ</h3><p class="mt-2 text-primary-800">{{ brand.partner_name || 'Chưa ghi nhận đối tác' }}</p><p class="mt-1 text-muted-foreground">{{ brand.partner_relationship || 'Chưa phân loại' }} · {{ brand.partnership_started_at ? new Date(brand.partnership_started_at).toLocaleDateString('vi-VN') : 'Chưa có ngày bắt đầu' }}</p></div></section>
        </div>
        <div v-else-if="activeTab === 'profile' && auth.role === 'super_admin'" role="tabpanel" class="bg-slate-50/40 p-3 sm:p-5"><AdminBrandEditor :brand-id="brand.id" embedded @dirty="editDirty = $event" @saved="onSaved" /></div>
        <div v-else-if="activeTab === 'products'" role="tabpanel" class="p-4 sm:p-5"><div class="flex flex-wrap items-center justify-between gap-2"><div><h2 class="text-sm font-semibold text-primary-950">Sản phẩm của {{ brand.name }}</h2><p class="mt-1 text-xs text-muted-foreground">Đánh dấu sản phẩm nổi bật để xuất hiện trên gian hàng.</p></div><input v-model="productSearch" type="text" placeholder="Tìm sản phẩm" aria-label="Tìm sản phẩm thương hiệu" class="h-9 min-w-48 rounded-lg border border-border px-3 text-xs outline-none focus:border-primary-500"></div><p v-if="productLoading" role="status" class="mt-5 text-sm text-muted-foreground">Đang tải sản phẩm…</p><p v-else-if="productError" role="alert" class="mt-5 text-xs text-red-800">{{ productError }} <button type="button" class="font-semibold text-primary-700" @click="loadProducts">Thử lại</button></p><p v-else-if="!products.length" class="mt-5 text-sm text-muted-foreground">Chưa có sản phẩm phù hợp.</p><div v-else class="mt-4 divide-y divide-border/60 rounded-xl border border-border/70"><div v-for="product in products" :key="product.id" class="flex items-center gap-3 px-3 py-2.5 text-xs"><span class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-50 p-1 text-primary-300"><img v-if="product.primary_image_thumb_url && !failedProductImages.has(product.id)" :src="product.primary_image_thumb_url" alt="" class="size-full object-contain" @error="failedProductImages = new Set([...failedProductImages, product.id])"><ImageIcon v-else class="size-5" /></span><div class="min-w-0 flex-1"><RouterLink :to="'/products/' + product.slug" class="line-clamp-2 font-semibold text-primary-950 hover:text-primary-700">{{ product.name }}</RouterLink><p class="mt-1 text-[0.6875rem] text-muted-foreground">ID {{ product.id }} · {{ product.is_active ? 'Đang bán' : 'Tạm ẩn' }}</p></div><button v-if="auth.role === 'super_admin'" type="button" :disabled="featuring !== null" :aria-label="product.brand_featured_sort_order === null ? 'Đánh dấu nổi bật' : 'Bỏ nổi bật'" :aria-pressed="product.brand_featured_sort_order !== null" class="shrink-0 rounded-lg p-2 text-amber-600 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-primary-500 disabled:opacity-50" @click.stop="toggleFeatured(product)"><Star class="size-4" :fill="product.brand_featured_sort_order !== null ? 'currentColor' : 'none'" /></button></div></div><p v-if="featuredError" role="alert" class="mt-3 text-xs text-red-800">{{ featuredError }}</p><div v-if="productLastPage > 1" class="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs"><span>Trang {{ productPage }} / {{ productLastPage }} · {{ productTotal }} sản phẩm</span><div class="flex gap-3"><button type="button" :disabled="productPage <= 1" @click="productPage--">Trước</button><button type="button" :disabled="productPage >= productLastPage" @click="productPage++">Tiếp</button></div></div></div>
        <AdminBrandStorefrontTab v-else-if="activeTab === 'storefront' && auth.role === 'super_admin'" :brand="brand" role="tabpanel" @dirty="storefrontDirty = $event" />
        <AdminBrandPromotionsTab v-else-if="activeTab === 'promotions' && auth.role === 'super_admin'" :brand-id="brand.id" role="tabpanel" />
        <div v-else-if="activeTab === 'audit' && auth.role === 'super_admin'" role="tabpanel" class="p-4 sm:p-5"><div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-sm font-semibold text-primary-950">Lịch sử thay đổi</h2><BasePopover v-model="eventFilterOpen" align="end" class="w-52 p-1.5"><template #trigger><button type="button" aria-label="Lọc hoạt động" :aria-expanded="eventFilterOpen" class="inline-flex h-9 min-w-36 items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 text-xs font-medium text-primary-900 outline-none hover:border-primary-300 focus-visible:ring-2 focus-visible:ring-primary-500">{{ ({ '': 'Mọi hoạt động', created: 'Tạo', updated: 'Cập nhật', deleted: 'Đưa vào thùng rác', restored: 'Khôi phục' } as Record<string, string>)[eventAction] }}<ChevronDown class="size-3.5" /></button></template><button v-for="option in [{ value: '', label: 'Mọi hoạt động' }, { value: 'created', label: 'Tạo' }, { value: 'updated', label: 'Cập nhật' }, { value: 'deleted', label: 'Đưa vào thùng rác' }, { value: 'restored', label: 'Khôi phục' }]" :key="option.value" type="button" :aria-pressed="eventAction === option.value" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-primary-900 hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:outline-none" @click="eventAction = option.value; eventPage = 1; eventFilterOpen = false">{{ option.label }}<Check v-if="eventAction === option.value" class="size-3.5 text-primary-700" /></button></BasePopover></div><p v-if="eventLoading" role="status" class="mt-5 text-sm text-muted-foreground">Đang tải lịch sử…</p><p v-else-if="eventError" role="alert" class="mt-5 text-xs text-red-800">{{ eventError }} <button type="button" class="font-semibold text-primary-700" @click="loadEvents">Thử lại</button></p><p v-else-if="!events.length" class="mt-5 text-sm text-muted-foreground">Chưa có hoạt động phù hợp.</p><ol v-else class="mt-5 space-y-0 border-l border-primary-200 pl-5"><li v-for="event in events" :key="event.id" class="relative border-b border-border/50 py-3 text-xs last:border-0"><span class="absolute -left-[1.48rem] top-4 size-2 rounded-full bg-primary-600 ring-4 ring-white" /><div class="flex flex-wrap items-baseline justify-between gap-2"><h3 class="font-semibold text-primary-950">{{ brandEventTitle(event) }}</h3><time class="text-muted-foreground">{{ new Date(event.created_at).toLocaleString('vi-VN') }}</time></div><p class="mt-1 text-muted-foreground">Người thực hiện: {{ event.actor?.name || 'Tài khoản không còn hiện diện' }}</p><details v-if="brandEventDetails(event, productNames).length" class="mt-2"><summary class="cursor-pointer font-medium text-primary-700">Xem nội dung thay đổi</summary><ul class="mt-2 list-disc space-y-1 pl-4 text-primary-800"><li v-for="(line, index) in brandEventDetails(event, productNames)" :key="index">{{ line }}</li></ul></details></li></ol><div v-if="eventLastPage > 1" class="mt-4 flex justify-between text-xs"><span>Trang {{ eventPage }} / {{ eventLastPage }}</span><div class="flex gap-3"><button type="button" :disabled="eventPage <= 1" @click="eventPage--">Trước</button><button type="button" :disabled="eventPage >= eventLastPage" @click="eventPage++">Tiếp</button></div></div></div>
      </div>
    </template>
    <BaseDialog v-model="statusDialogOpen" :title="nextStatus === 'hidden' ? 'Ẩn thương hiệu' : 'Xuất bản thương hiệu'" :description="brand ? '“' + brand.name + '”' : ''" data-testid="brand-status-dialog">
      <div v-if="nextStatus === 'hidden'" class="space-y-2 text-sm leading-6 text-primary-800"><p>Thương hiệu sẽ không còn hiển thị với khách hàng; sản phẩm thuộc thương hiệu không thể mua.</p><p>Đơn đã hoàn thành được giữ nguyên. Đơn đang xử lý được xem xét theo quy trình Đơn hàng hiện có.</p></div>
      <p v-else class="text-sm text-primary-800">Thương hiệu sẽ được công khai trở lại theo trạng thái hiện tại của sản phẩm.</p>
      <p v-if="statusError" role="alert" class="mt-3 text-sm text-red-800">{{ statusError }}</p>
      <template #footer><button type="button" :disabled="statusPending" class="rounded-lg border border-border px-4 py-2 text-sm" @click="statusDialogOpen = false">Hủy</button><button type="button" :disabled="statusPending" class="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" data-testid="brand-status-confirm" @click="confirmStatus">{{ statusPending ? 'Đang cập nhật…' : nextStatus === 'hidden' ? 'Xác nhận ẩn' : 'Xác nhận xuất bản' }}</button></template>
    </BaseDialog>
    <div v-if="deleteOpen && brand" class="fixed inset-0 z-50 grid place-items-center bg-primary-950/45 p-3" @click.self="closeDelete"><section role="dialog" aria-modal="true" aria-labelledby="brand-delete-title" class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6" data-testid="brand-delete-dialog"><h2 id="brand-delete-title" class="text-base font-semibold text-primary-950">Xóa thương hiệu “{{ brand.name }}”</h2><p v-if="previewError" role="alert" class="mt-3 text-[0.8125rem] text-red-800">{{ previewError }} <button type="button" class="font-semibold underline" @click="openDelete">Thử lại</button></p><div v-if="preview" class="mt-4 space-y-3 text-[0.8125rem]"><p class="rounded-xl bg-amber-50 p-3 text-amber-900">{{ preview.products }} sản phẩm bị ảnh hưởng · {{ preview.pending_orders }} đơn đang xử lý cần xem xét · {{ preview.shipping_orders }} đơn đang giao, không tự hủy.</p><template v-if="deleteStep === 1"><label class="flex items-start gap-2"><input v-model="deleteMode" type="radio" value="brand_only">Chỉ xóa mềm thương hiệu; sản phẩm vẫn giữ dữ liệu và tạm không thể mua.</label><label class="flex items-start gap-2"><input v-model="deleteMode" type="radio" value="brand_and_products">Xóa mềm thương hiệu và {{ preview.products }} sản phẩm hiện còn trong thương hiệu.</label></template><template v-else><p>Đây là bước xác nhận cuối. Không xóa lịch sử đơn hàng, thanh toán hoặc hoàn tiền.</p><label v-if="deleteMode === 'brand_and_products'" class="grid gap-1.5 font-medium">Nhập chính xác tên thương hiệu<input v-model="confirmName" class="h-10 rounded-lg border border-border px-3" autocomplete="off"></label><p v-if="deleteError" role="alert" class="text-red-800">{{ deleteError }}</p></template></div><div class="mt-5 flex justify-end gap-2 text-[0.8125rem]"><button type="button" :disabled="deleting" class="rounded-lg border border-border px-4 py-2" @click="closeDelete">Hủy</button><button v-if="deleteStep === 1" type="button" :disabled="!preview" class="rounded-lg bg-primary-800 px-4 py-2 font-semibold text-white disabled:opacity-50" @click="deleteStep = 2">Tiếp tục</button><button v-else type="button" :disabled="deleting || (deleteMode === 'brand_and_products' && confirmName !== brand.name)" class="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50" data-testid="brand-delete-confirm" @click="confirmDelete">{{ deleting ? 'Đang xóa…' : 'Xác nhận xóa mềm' }}</button></div></section></div>
  </section>
</template>
