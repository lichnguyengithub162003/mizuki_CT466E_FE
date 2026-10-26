<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronDown, FolderTree, Search } from '@lucide/vue'
import AdminImagePicker from '@/components/admin/AdminImagePicker.vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import { createAdminCategory, getAdminCategories, getAdminCategory, updateAdminCategory } from '@/api/adminApi'
import { isApplicationError } from '@/types/admin'
import type { AdminCategoryMutation, AdminCategoryRecord } from '@/types/adminCategory'

type ImageValue = { image_url?: string | null; upload_token?: string | null; preview_url?: string | null }
type ImageAction = 'keep' | 'replace' | 'remove'
const route = useRoute()
const router = useRouter()
const editing = computed(() => route.name === 'admin-category-edit')
const id = computed(() => String(route.params.id ?? ''))
const category = ref<AdminCategoryRecord | null>(null)
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const errors = reactive<Record<string, string>>({})
const form = reactive({ name: '', slug: '', parent_id: null as number | null, description: '', sort_order: 0, is_active: true })
const imageValue = ref<ImageValue | null>(null)
const imageAction = ref<ImageAction>('keep')
const imagePending = ref(false)
const parentOpen = ref(false)
const parentInput = ref('')
const parentQuery = ref('')
const parentItems = ref<AdminCategoryRecord[]>([])
const parentPage = ref(0)
const parentLastPage = ref(1)
const parentLoading = ref(false)
const parentError = ref('')
const selectedParentName = ref('')
let detailVersion = 0
let parentVersion = 0
let parentTimer: number | undefined

function clearErrors(): void { Object.keys(errors).forEach(key => delete errors[key]); saveError.value = '' }
function resetForm(): void {
  Object.assign(form, { name: '', slug: '', parent_id: null, description: '', sort_order: 0, is_active: true })
  category.value = null
  imageValue.value = null
  imageAction.value = 'keep'
  imagePending.value = false
  selectedParentName.value = ''
  parentOpen.value = false
  parentInput.value = ''
  parentQuery.value = ''
  parentItems.value = []
  parentPage.value = 0
  parentLastPage.value = 1
  parentLoading.value = false
  parentVersion += 1
  clearErrors()
}
async function loadDetail(): Promise<void> {
  const version = ++detailVersion
  resetForm()
  loadError.value = ''
  if (!editing.value) { loading.value = false; return }
  loading.value = true
  try {
    const result = await getAdminCategory(id.value)
    if (version !== detailVersion) return
    category.value = result
    Object.assign(form, {
      name: result.name, slug: result.slug, parent_id: result.parent_id,
      description: result.description ?? '', sort_order: result.sort_order, is_active: result.is_active,
    })
    selectedParentName.value = result.parent?.name ?? (result.parent_id === null ? '' : 'Chưa xác định danh mục cha')
    imageValue.value = { image_url: result.image_rendition_url || result.image_url }
  } catch {
    if (version === detailVersion) loadError.value = 'Không thể tải danh mục để chỉnh sửa. Vui lòng thử lại.'
  } finally {
    if (version === detailVersion) loading.value = false
  }
}
watch([editing, id], () => { void loadDetail() }, { immediate: true })
watch(parentInput, value => {
  window.clearTimeout(parentTimer)
  if (!value.trim()) { parentQuery.value = ''; return }
  parentTimer = window.setTimeout(() => { parentQuery.value = value.trim() }, 320)
})
watch(parentQuery, () => {
  parentVersion += 1
  parentItems.value = []
  parentPage.value = 0
  parentLastPage.value = 1
  parentLoading.value = false
  if (parentOpen.value) void loadParents(1)
})
onBeforeUnmount(() => { detailVersion += 1; parentVersion += 1; window.clearTimeout(parentTimer) })

async function loadParents(page: number): Promise<void> {
  if (parentLoading.value || (page > 1 && page > parentLastPage.value)) return
  const version = ++parentVersion
  parentLoading.value = true
  parentError.value = ''
  try {
    const result = await getAdminCategories({
      mode: 'flat', page, per_page: 30, sort: 'name', direction: 'asc',
      ...(parentQuery.value ? { search: parentQuery.value } : {}),
    })
    if (version !== parentVersion || !parentOpen.value) return
    const unique = new Map<number, AdminCategoryRecord>(page === 1 ? [] : parentItems.value.map(item => [item.id, item]))
    for (const item of result.items) unique.set(item.id, item)
    parentItems.value = [...unique.values()]
    parentPage.value = result.pagination.current_page
    parentLastPage.value = result.pagination.last_page
  } catch {
    if (version === parentVersion) parentError.value = 'Không thể tải danh mục cha.'
  } finally {
    if (version === parentVersion) parentLoading.value = false
  }
}
function toggleParents(): void {
  parentOpen.value = !parentOpen.value
  if (parentOpen.value && parentPage.value === 0) void loadParents(1)
  if (!parentOpen.value) { parentVersion += 1; parentLoading.value = false }
}
function selectParent(item: AdminCategoryRecord | null): void {
  form.parent_id = item?.id ?? null
  selectedParentName.value = item?.name ?? ''
  parentOpen.value = false
  parentVersion += 1
  parentLoading.value = false
  delete errors.parent_id
}
function onImageSelection(event: Event): void {
  if ((event.target as HTMLInputElement).files?.length) imagePending.value = true
}
function setImage(value: ImageValue): void {
  imageValue.value = value
  imageAction.value = value.upload_token ? 'replace' : 'remove'
  imagePending.value = false
  delete errors.image_upload_token
  delete errors.image_url
}
async function submit(): Promise<void> {
  if (saving.value || imagePending.value) return
  clearErrors()
  if (!form.name.trim()) errors.name = 'Vui lòng nhập tên danh mục.'
  if (!form.slug.trim()) errors.slug = 'Vui lòng nhập slug.'
  if (!Number.isInteger(Number(form.sort_order)) || Number(form.sort_order) < 0) errors.sort_order = 'Thứ tự phải là số nguyên không âm.'
  if (Object.keys(errors).length) return
  const payload: AdminCategoryMutation = {
    name: form.name.trim(), slug: form.slug.trim(), parent_id: form.parent_id,
    description: form.description.trim() || null, sort_order: Number(form.sort_order), is_active: form.is_active,
  }
  if (imageAction.value === 'replace' && imageValue.value?.upload_token) payload.image_upload_token = imageValue.value.upload_token
  else if (imageAction.value === 'remove') payload.image_url = null
  saving.value = true
  try {
    const saved = editing.value ? await updateAdminCategory(id.value, payload) : await createAdminCategory(payload)
    await router.push(`/admin/categories/${saved.id}`)
  } catch (error) {
    if (isApplicationError(error)) {
      saveError.value = error.message
      for (const [field, messages] of Object.entries(error.validationErrors ?? {})) errors[field] = messages[0] ?? 'Không hợp lệ'
    } else saveError.value = 'Không thể lưu danh mục. Vui lòng thử lại.'
  } finally { saving.value = false }
}
</script>

<template>
  <section class="min-w-0 space-y-4" :aria-label="editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'" data-testid="category-editor-page">
    <RouterLink :to="editing ? `/admin/categories/${id}` : '/admin/categories'" class="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary-700 hover:text-primary-900"><ArrowLeft class="size-4" />{{ editing ? 'Chi tiết danh mục' : 'Danh sách danh mục' }}</RouterLink>
    <div v-if="loading" class="rounded-2xl bg-surface p-6" role="status" aria-label="Đang tải danh mục"><BaseSkeleton class="h-12" /><BaseSkeleton class="mt-4 h-72" /></div>
    <div v-else-if="loadError" class="rounded-2xl bg-surface p-8 text-center" role="alert"><p>{{ loadError }}</p><button type="button" class="mt-3 font-medium text-primary-700" @click="loadDetail">Thử lại</button></div>
    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
      <header class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><p class="text-[0.75rem] font-medium text-primary-700">Danh mục sản phẩm</p><h1 class="mt-1 text-xl font-semibold tracking-tight text-primary-950">{{ editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới' }}</h1><p class="mt-1 text-[0.8125rem] text-muted-foreground">Tên và slug được lưu đúng như bạn nhập; không tự tạo slug.</p></header>
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(17rem,1fr)]">
        <div class="space-y-4">
          <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><h2 class="font-semibold text-primary-950">Thông tin cơ bản</h2><div class="mt-4 grid gap-4">
            <label class="category-field"><span>Tên danh mục <span class="text-red-600">*</span></span><input v-model="form.name" name="name" maxlength="255" :aria-invalid="Boolean(errors.name)" class="category-input"><small v-if="errors.name" role="alert">{{ errors.name }}</small></label>
            <label class="category-field"><span>Slug <span class="text-red-600">*</span></span><input v-model="form.slug" name="slug" maxlength="255" :aria-invalid="Boolean(errors.slug)" class="category-input"><small v-if="errors.slug" role="alert">{{ errors.slug }}</small></label>
            <label class="category-field"><span>Mô tả</span><textarea v-model="form.description" name="description" rows="5" :aria-invalid="Boolean(errors.description)" class="category-input min-h-28 resize-y"></textarea><small v-if="errors.description" role="alert">{{ errors.description }}</small></label>
          </div></section>
          <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><h2 class="flex items-center gap-2 font-semibold text-primary-950"><FolderTree class="size-4" />Vị trí trong cây danh mục</h2><div class="mt-4">
            <span class="mb-1.5 block text-[0.8125rem] font-medium">Danh mục cha</span><button type="button" class="category-input flex items-center justify-between text-left" :aria-expanded="parentOpen" data-testid="category-parent-trigger" @click="toggleParents">{{ selectedParentName || 'Danh mục gốc' }}<ChevronDown class="size-4" aria-hidden="true" /></button>
            <div v-if="parentOpen" class="mt-2 rounded-xl border border-border bg-surface p-2 shadow-sm" data-testid="category-parent-options"><label class="relative block"><span class="sr-only">Tìm danh mục cha</span><Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input v-model="parentInput" type="search" placeholder="Tìm theo tên hoặc slug" class="category-input w-full pl-9" data-testid="category-parent-search"></label><div class="mt-2 max-h-56 overflow-y-auto"><button type="button" class="category-parent-option" @click="selectParent(null)">Không chọn · danh mục gốc</button><button v-for="item in parentItems.filter(candidate => !editing || candidate.id !== category?.id)" :key="item.id" type="button" class="category-parent-option" :data-testid="`category-parent-${item.id}`" @click="selectParent(item)"><span class="block truncate font-medium">{{ item.name }}</span><span class="block truncate text-[0.6875rem] text-muted-foreground">{{ [...item.ancestors.map(ancestor => ancestor.name), item.name].join(' / ') }}</span></button><p v-if="parentLoading" class="px-3 py-2 text-[0.75rem] text-muted-foreground" role="status">Đang tải danh mục…</p><p v-else-if="!parentItems.length && !parentError" class="px-3 py-2 text-[0.75rem] text-muted-foreground">Không có kết quả ở trang này.</p><p v-if="parentError" class="px-3 py-2 text-[0.75rem] text-red-700" role="alert">{{ parentError }} <button type="button" class="font-semibold underline" @click="loadParents(parentPage || 1)">Thử lại</button></p><button v-if="parentPage < parentLastPage" type="button" class="category-parent-option font-semibold text-primary-700" data-testid="category-parent-more" :disabled="parentLoading" @click="loadParents(parentPage + 1)">Tải thêm danh mục</button></div></div>
            <small v-if="errors.parent_id" class="mt-1 block text-[0.75rem] text-red-700" role="alert">{{ errors.parent_id }}</small><p class="mt-2 text-[0.75rem] text-muted-foreground">Tìm kiếm trên toàn bộ danh mục và tải thêm theo từng trang. Quan hệ vòng được máy chủ kiểm tra khi lưu.</p>
          </div></section>
        </div>
        <div class="space-y-4">
          <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><h2 class="font-semibold text-primary-950">Ảnh đại diện danh mục</h2><div class="mt-4" @change.capture="onImageSelection"><AdminImagePicker :model-value="imageValue" label="Ảnh danh mục" :error="errors.image_upload_token || errors.image_url" @update:model-value="setImage" /></div><p v-if="imagePending" class="mt-2 text-[0.75rem] text-amber-800" role="status">Ảnh chưa sẵn sàng. Hãy đợi tải xong, chọn lại hoặc bỏ ảnh trước khi lưu.</p></section>
          <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><h2 class="font-semibold text-primary-950">Hiển thị</h2><div class="mt-4 grid gap-4"><label class="category-field"><span>Thứ tự hiển thị</span><input v-model.number="form.sort_order" name="sort_order" type="number" min="0" step="1" :aria-invalid="Boolean(errors.sort_order)" class="category-input"><small v-if="errors.sort_order" role="alert">{{ errors.sort_order }}</small></label><label class="flex items-center gap-2 text-[0.8125rem] font-medium"><input v-model="form.is_active" type="checkbox" name="is_active" class="size-4 accent-primary-700">Đang hoạt động</label><small v-if="errors.is_active" role="alert" class="text-[0.75rem] text-red-700">{{ errors.is_active }}</small></div></section>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-surface p-4 shadow-xs ring-1 ring-black/[0.04]"><p v-if="saveError" class="mr-auto text-[0.8125rem] text-red-700" role="alert">{{ saveError }}</p><RouterLink :to="editing ? `/admin/categories/${id}` : '/admin/categories'" class="category-secondary">Hủy</RouterLink><button type="submit" class="category-primary" :disabled="saving || imagePending" data-testid="category-save">{{ saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo danh mục' }}</button></div>
    </form>
  </section>
</template>

<style scoped>
.category-field { display: grid; gap: .4rem; font-size: .8125rem; font-weight: 500; }
.category-field small { color: #b42318; font-size: .75rem; }
.category-input { min-height: 2.5rem; width: 100%; border: 1px solid var(--border); border-radius: .75rem; background: var(--surface); padding: .55rem .75rem; color: var(--foreground); font-size: .8125rem; font-weight: 400; outline: none; }
.category-input:focus-visible { border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(39, 93, 70, .1); }
.category-input[aria-invalid="true"] { border-color: #b42318; }
.category-parent-option { display: block; width: 100%; border-radius: .625rem; padding: .55rem .75rem; text-align: left; font-size: .8125rem; }
.category-parent-option:hover { background: var(--surface-subtle); }
.category-primary, .category-secondary { display: inline-flex; min-height: 2.5rem; align-items: center; justify-content: center; border-radius: .75rem; padding: 0 1rem; font-size: .8125rem; font-weight: 600; }
.category-primary { background: var(--primary-800); color: white; }
.category-primary:hover:not(:disabled) { background: var(--primary-900); }
.category-primary:disabled { cursor: not-allowed; opacity: .55; }
.category-secondary { border: 1px solid var(--border); background: var(--surface); }
</style>
