<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink, onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronDown, FolderTree, LoaderCircle, Plus, Search, Trash2, X } from '@lucide/vue'
import AdminImagePicker from '@/components/admin/AdminImagePicker.vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import { createAdminCategory, getAdminCategories, getAdminCategory, updateAdminCategory } from '@/api/adminApi'
import { isApplicationError } from '@/types/admin'
import type { AdminCategoryChildCreateRequest, AdminCategoryCreateRequest, AdminCategoryMutation, AdminCategoryRecord, AdminCategoryStatus } from '@/types/adminCategory'

type ImageValue = { image_url?: string | null; upload_token?: string | null; preview_url?: string | null }
type ImageAction = 'keep' | 'replace' | 'remove'
const props = withDefaults(defineProps<{ embedded?: boolean; categoryId?: number | string; initialCategory?: AdminCategoryRecord }>(), { embedded: false })
const emit = defineEmits<{ saved: [category: AdminCategoryRecord]; 'dirty-change': [dirty: boolean] }>()
const route = useRoute()
const router = useRouter()
const editing = computed(() => props.embedded || route.name === 'admin-category-edit')
const id = computed(() => String(props.embedded ? props.categoryId ?? '' : route.params.id ?? ''))
const category = ref<AdminCategoryRecord | null>(null)
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const errors = reactive<Record<string, string>>({})
const form = reactive({
  name: '', slug: '', parent_id: null as number | null, description: '', sort_order: 0,
  status: 'published' as AdminCategoryStatus | null, is_active: true, is_featured: false,
})
const existingChildIds = ref<number[]>([])
const selectedExistingChildren = ref<AdminCategoryRecord[]>([])
const newChildDrafts = ref<AdminCategoryChildCreateRequest[]>([])
const childDraftKeys = ref<number[]>([])
const childImageValues = reactive<Record<number, ImageValue | null>>({})
const childImagePending = reactive<Record<number, boolean>>({})
const childPickerVersions = reactive<Record<number, number>>({})
const childSlugEdited = reactive<Record<number, boolean>>({})
const slugEdited = ref(false)
const draftDirty = ref(false)
const savedSuccessfully = ref(false)
const initialEditSnapshot = ref('')
const rootPickerVersion = ref(0)
const selectedParentDepth = ref<number | null>(null)
const selectedParentAncestors = ref<number[]>([])
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
const childPickerOpen = ref(false)
const childInput = ref('')
const childQuery = ref('')
const childItems = ref<AdminCategoryRecord[]>([])
const childPage = ref(0)
const childLastPage = ref(1)
const childLoading = ref(false)
const childError = ref('')
let detailVersion = 0
let parentVersion = 0
let parentTimer: number | undefined
let childVersion = 0
let childTimer: number | undefined
let nextChildKey = 0

const createLevel = computed(() => form.parent_id === null ? 1 : (selectedParentDepth.value ?? 0) + 2)
const canHaveChildren = computed(() => createLevel.value < 3)
const anyChildImagePending = computed(() => Object.values(childImagePending).some(Boolean))
const editSnapshot = computed(() => JSON.stringify({
  name: form.name, slug: form.slug, parent_id: form.parent_id, description: form.description,
  sort_order: form.sort_order, status: form.status, is_featured: form.is_featured,
  imageAction: imageAction.value, uploadToken: imageAction.value === 'replace' ? imageValue.value?.upload_token : null,
}))
const hasUnsavedChanges = computed(() => editing.value
  ? !savedSuccessfully.value && (imagePending.value || (initialEditSnapshot.value !== '' && editSnapshot.value !== initialEditSnapshot.value))
  : draftDirty.value && !savedSuccessfully.value)
watch(hasUnsavedChanges, dirty => emit('dirty-change', dirty), { immediate: true })
const attachmentErrors = computed(() => Object.entries(errors)
  .filter(([field]) => field === 'attach_existing_child_ids' || field.startsWith('attach_existing_child_ids.'))
  .map(([, message]) => message))
const statusOptions: { value: AdminCategoryStatus; label: string; description: string }[] = [
  { value: 'draft', label: 'Bản nháp', description: 'Chưa hiển thị trong cửa hàng' },
  { value: 'published', label: 'Đã xuất bản', description: 'Có thể hiển thị khi đủ điều kiện' },
  { value: 'hidden', label: 'Đã ẩn', description: 'Tạm ẩn khỏi cửa hàng' },
]

function slugFromName(value: string): string {
  return value.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function onNameInput(event: Event): void {
  draftDirty.value = true
  if (!editing.value && !slugEdited.value) form.slug = slugFromName((event.target as HTMLInputElement).value)
}
function onChildNameInput(key: number, event: Event): void {
  draftDirty.value = true
  if (childSlugEdited[key]) return
  const index = childDraftKeys.value.indexOf(key)
  if (index >= 0) newChildDrafts.value[index]!.slug = slugFromName((event.target as HTMLInputElement).value)
}

function clearErrors(): void { Object.keys(errors).forEach(key => delete errors[key]); saveError.value = '' }
function resetForm(): void {
  Object.assign(form, { name: '', slug: '', parent_id: null, description: '', sort_order: 0, status: editing.value ? null : 'published', is_active: true, is_featured: false })
  existingChildIds.value = []
  selectedExistingChildren.value = []
  newChildDrafts.value = []
  childDraftKeys.value = []
  for (const key of Object.keys(childImageValues)) delete childImageValues[Number(key)]
  for (const key of Object.keys(childImagePending)) delete childImagePending[Number(key)]
  for (const key of Object.keys(childPickerVersions)) delete childPickerVersions[Number(key)]
  for (const key of Object.keys(childSlugEdited)) delete childSlugEdited[Number(key)]
  slugEdited.value = false
  draftDirty.value = false
  savedSuccessfully.value = false
  initialEditSnapshot.value = ''
  selectedParentDepth.value = null
  selectedParentAncestors.value = []
  childPickerOpen.value = false
  childInput.value = ''
  childQuery.value = ''
  childItems.value = []
  childPage.value = 0
  childLastPage.value = 1
  childLoading.value = false
  childError.value = ''
  childVersion += 1
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
    const result = props.embedded && props.initialCategory?.id === Number(id.value)
      ? props.initialCategory
      : await getAdminCategory(id.value)
    if (version !== detailVersion) return
    category.value = result
    Object.assign(form, {
      name: result.name, slug: result.slug, parent_id: result.parent_id,
      description: result.description ?? '', sort_order: result.sort_order,
      status: result.status, is_active: result.is_active, is_featured: result.is_featured ?? false,
    })
    selectedParentName.value = result.parent?.name ?? (result.parent_id === null ? '' : 'Chưa xác định danh mục cha')
    imageValue.value = { image_url: result.image_rendition_url || result.image_url }
    initialEditSnapshot.value = editSnapshot.value
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
watch(childInput, value => {
  window.clearTimeout(childTimer)
  if (!value.trim()) { childQuery.value = ''; return }
  childTimer = window.setTimeout(() => { childQuery.value = value.trim() }, 320)
})
watch(childQuery, () => {
  childVersion += 1
  childItems.value = []
  childPage.value = 0
  childLastPage.value = 1
  childLoading.value = false
  if (childPickerOpen.value) void loadExistingChildren(1)
})
watch(parentQuery, () => {
  parentVersion += 1
  parentItems.value = []
  parentPage.value = 0
  parentLastPage.value = 1
  parentLoading.value = false
  if (parentOpen.value) void loadParents(1)
})
onBeforeUnmount(() => {
  detailVersion += 1
  parentVersion += 1
  childVersion += 1
  window.clearTimeout(parentTimer)
  window.clearTimeout(childTimer)
})
function confirmLeave(): boolean {
  return props.embedded || !hasUnsavedChanges.value
    || window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ bản nháp?')
}
onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)

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
    for (const item of result.items) {
      if (editing.value || item.depth <= 1) unique.set(item.id, item)
    }
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
  selectedParentDepth.value = item?.depth ?? null
  selectedParentAncestors.value = item?.ancestors.map(ancestor => ancestor.id) ?? []
  draftDirty.value = true
  parentOpen.value = false
  parentVersion += 1
  parentLoading.value = false
  delete errors.parent_id
}
async function loadExistingChildren(page: number): Promise<void> {
  if (childLoading.value || (page > 1 && page > childLastPage.value)) return
  const version = ++childVersion
  childLoading.value = true
  childError.value = ''
  try {
    const result = await getAdminCategories({
      mode: 'flat', page, per_page: 30, sort: 'name', direction: 'asc',
      ...(childQuery.value ? { search: childQuery.value } : {}),
    })
    if (version !== childVersion || !childPickerOpen.value) return
    const unique = new Map<number, AdminCategoryRecord>(page === 1 ? [] : childItems.value.map(item => [item.id, item]))
    for (const item of result.items) unique.set(item.id, item)
    childItems.value = [...unique.values()]
    childPage.value = result.pagination.current_page
    childLastPage.value = result.pagination.last_page
  } catch {
    if (version === childVersion) childError.value = 'Không thể tải danh mục có sẵn.'
  } finally {
    if (version === childVersion) childLoading.value = false
  }
}
function toggleExistingChildren(): void {
  childPickerOpen.value = !childPickerOpen.value
  if (childPickerOpen.value && childPage.value === 0) void loadExistingChildren(1)
  if (!childPickerOpen.value) { childVersion += 1; childLoading.value = false }
}
function attachmentIssue(item: AdminCategoryRecord, checkSelected = true): string {
  if (!canHaveChildren.value) return 'Danh mục cấp 3 không thể có danh mục con.'
  if (item.id === form.parent_id || selectedParentAncestors.value.includes(item.id)) return 'Không thể gắn danh mục cha hoặc tổ tiên làm danh mục con.'
  if (createLevel.value === 2 && item.has_children) return 'Danh mục này có con; chuyển xuống cấp 3 sẽ vượt giới hạn.'
  if (checkSelected && selectedExistingChildren.value.some(selected => selected.id === item.id)) return 'Đã chọn.'
  if (selectedExistingChildren.value.some(selected => selected.id !== item.id && (item.ancestors.some(ancestor => ancestor.id === selected.id)
    || selected.ancestors.some(ancestor => ancestor.id === item.id)))) return 'Không thể chọn đồng thời tổ tiên và hậu duệ.'
  return ''
}
const selectedAttachmentIssue = computed(() => selectedExistingChildren.value
  .map(item => attachmentIssue(item, false)).find(Boolean) ?? '')
function selectExistingChild(item: AdminCategoryRecord): void {
  if (attachmentIssue(item)) return
  selectedExistingChildren.value.push(item)
  existingChildIds.value.push(item.id)
  draftDirty.value = true
  delete errors.attach_existing_child_ids
}
function removeExistingChild(id: number): void {
  selectedExistingChildren.value = selectedExistingChildren.value.filter(item => item.id !== id)
  existingChildIds.value = existingChildIds.value.filter(value => value !== id)
  draftDirty.value = true
}
function addChildDraft(): void {
  if (!canHaveChildren.value) return
  const key = ++nextChildKey
  childDraftKeys.value.push(key)
  newChildDrafts.value.push({ name: '', slug: '', status: 'published', is_featured: false, sort_order: 0 })
  childImageValues[key] = null
  childImagePending[key] = false
  childPickerVersions[key] = 0
  childSlugEdited[key] = false
  draftDirty.value = true
}
function removeChildDraft(key: number): void {
  const index = childDraftKeys.value.indexOf(key)
  if (index < 0) return
  childDraftKeys.value.splice(index, 1)
  newChildDrafts.value.splice(index, 1)
  delete childImageValues[key]
  delete childImagePending[key]
  delete childPickerVersions[key]
  delete childSlugEdited[key]
  draftDirty.value = true
}
function onChildImageSelection(key: number, event: Event): void {
  if ((event.target as HTMLInputElement).files?.length) childImagePending[key] = true
}
function setChildImage(key: number, value: ImageValue): void {
  const index = childDraftKeys.value.indexOf(key)
  if (index < 0) return
  childImageValues[key] = value
  childImagePending[key] = false
  if (value.upload_token) newChildDrafts.value[index]!.image_upload_token = value.upload_token
  else delete newChildDrafts.value[index]!.image_upload_token
  delete errors[`new_children.${index}.image_upload_token`]
  draftDirty.value = true
}
function clearChildImage(key: number): void {
  setChildImage(key, { image_url: null, upload_token: null, preview_url: null })
  childPickerVersions[key] = (childPickerVersions[key] ?? 0) + 1
}
function clearRootImage(): void {
  imagePending.value = false
  imageValue.value = category.value ? { image_url: category.value.image_rendition_url || category.value.image_url } : null
  imageAction.value = 'keep'
  rootPickerVersion.value += 1
}
function onImageSelection(event: Event): void {
  if ((event.target as HTMLInputElement).files?.length) {
    imagePending.value = true
    draftDirty.value = true
  }
}
function setImage(value: ImageValue): void {
  imageValue.value = value
  imageAction.value = value.upload_token ? 'replace' : 'remove'
  imagePending.value = false
  delete errors.image_upload_token
  delete errors.image_url
}
async function submit(): Promise<void> {
  if (saving.value || imagePending.value || anyChildImagePending.value) return
  clearErrors()
  if (!form.name.trim()) errors.name = 'Vui lòng nhập tên danh mục.'
  if (!form.slug.trim()) errors.slug = 'Vui lòng nhập slug.'
  if (!Number.isInteger(Number(form.sort_order)) || Number(form.sort_order) < 0) errors.sort_order = 'Thứ tự phải là số nguyên không âm.'
  if (!form.status) errors.status = 'Vui lòng chọn trạng thái.'
  if (!editing.value) {
    if (!canHaveChildren.value && (existingChildIds.value.length || newChildDrafts.value.length)) {
      errors.new_children = 'Danh mục cấp 3 không thể có danh mục con. Hãy đổi danh mục cha hoặc bỏ các mục con đã nhập.'
    }
    if (selectedAttachmentIssue.value) errors.attach_existing_child_ids = selectedAttachmentIssue.value
    newChildDrafts.value.forEach((child, index) => {
      if (!child.name.trim()) errors[`new_children.${index}.name`] = 'Vui lòng nhập tên danh mục con.'
      if (!child.slug.trim()) errors[`new_children.${index}.slug`] = 'Vui lòng nhập slug danh mục con.'
      if (child.sort_order !== undefined && (!Number.isInteger(Number(child.sort_order)) || Number(child.sort_order) < 0)) {
        errors[`new_children.${index}.sort_order`] = 'Ưu tiên phải là số nguyên không âm.'
      }
    })
  }
  if (Object.keys(errors).length) return
  const fields = {
    name: form.name.trim(), slug: form.slug.trim(), parent_id: form.parent_id,
    description: form.description.trim() || null, sort_order: Number(form.sort_order),
  }
  const payload: AdminCategoryMutation = { ...fields, status: form.status as AdminCategoryStatus }
  if (editing.value) payload.is_featured = form.is_featured
  if (imageAction.value === 'replace' && imageValue.value?.upload_token) payload.image_upload_token = imageValue.value.upload_token
  else if (imageAction.value === 'remove') payload.image_url = null
  saving.value = true
  try {
    const createPayload: AdminCategoryCreateRequest = {
      ...payload,
      is_featured: form.is_featured,
      ...(existingChildIds.value.length ? { attach_existing_child_ids: [...existingChildIds.value] } : {}),
      ...(newChildDrafts.value.length ? { new_children: newChildDrafts.value.map(child => ({ ...child })) } : {}),
    }
    const saved = editing.value ? await updateAdminCategory(id.value, payload) : await createAdminCategory(createPayload)
    if (editing.value) {
      category.value = saved
      Object.assign(form, {
        name: saved.name, slug: saved.slug, parent_id: saved.parent_id,
        description: saved.description ?? '', sort_order: saved.sort_order,
        status: saved.status, is_active: saved.is_active, is_featured: saved.is_featured,
      })
      imageValue.value = { image_url: saved.image_rendition_url || saved.image_url }
      imageAction.value = 'keep'
      initialEditSnapshot.value = editSnapshot.value
    }
    savedSuccessfully.value = true
    if (props.embedded) emit('saved', saved)
    else await router.push(`/admin/categories/${saved.id}`)
  } catch (error) {
    if (isApplicationError(error) && error.kind === 'validation') {
      saveError.value = error.message
      for (const [field, messages] of Object.entries(error.validationErrors ?? {})) errors[field] = messages[0] ?? 'Không hợp lệ'
    } else if (isApplicationError(error) && (error.kind === 'server' || (error.status ?? 0) >= 500)) {
      saveError.value = 'Không thể lưu danh mục do lỗi hệ thống. Vui lòng thử lại sau.'
    } else saveError.value = 'Không thể lưu danh mục. Vui lòng thử lại.'
  } finally { saving.value = false }
}
</script>

<template>
  <section :class="['min-w-0 space-y-4', embedded ? 'category-editor-embedded' : '']" :aria-label="editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'" data-testid="category-editor-page">
    <RouterLink v-if="!embedded" :to="editing ? `/admin/categories/${id}` : '/admin/categories'" class="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary-700 hover:text-primary-900"><ArrowLeft class="size-4" />{{ editing ? 'Chi tiết danh mục' : 'Danh sách danh mục' }}</RouterLink>
    <div v-if="loading" class="rounded-2xl bg-surface p-6" role="status" aria-label="Đang tải danh mục"><BaseSkeleton class="h-12" /><BaseSkeleton class="mt-4 h-72" /></div>
    <div v-else-if="loadError" class="rounded-2xl bg-surface p-8 text-center" role="alert"><p>{{ loadError }}</p><button type="button" class="mt-3 font-medium text-primary-700" @click="loadDetail">Thử lại</button></div>
    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
      <header v-if="editing && !embedded" class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><p class="text-[0.75rem] font-medium text-primary-700">Danh mục sản phẩm</p><h1 class="mt-1 text-xl font-semibold tracking-tight text-primary-950">Chỉnh sửa danh mục</h1><p class="mt-1 text-[0.8125rem] text-muted-foreground">Tên và slug được lưu đúng như bạn nhập.</p></header>
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(17rem,1fr)]">
        <div class="space-y-4">
          <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><h2 class="font-semibold text-primary-950">Thông tin cơ bản</h2><div class="mt-4 grid gap-4">
            <label class="category-field"><span>Tên danh mục <span class="text-red-600">*</span></span><input v-model="form.name" name="name" maxlength="255" :aria-invalid="Boolean(errors.name)" class="category-input" @input="onNameInput"><small v-if="errors.name" role="alert">{{ errors.name }}</small></label>
            <label class="category-field"><span>Slug <span class="text-red-600">*</span></span><input v-model="form.slug" name="slug" maxlength="255" :aria-invalid="Boolean(errors.slug)" class="category-input" @input="slugEdited = true; draftDirty = true"><small v-if="errors.slug" role="alert">{{ errors.slug }}</small></label>
            <label class="category-field"><span>Mô tả</span><textarea v-model="form.description" name="description" rows="4" :aria-invalid="Boolean(errors.description)" class="category-input min-h-24 resize-y" @input="draftDirty = true"></textarea><small v-if="errors.description" role="alert">{{ errors.description }}</small></label>
          </div></section>
          <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><h2 class="flex items-center gap-2 font-semibold text-primary-950"><FolderTree class="size-4" />Vị trí trong cây danh mục</h2><div class="mt-4">
            <span class="mb-1.5 block text-[0.8125rem] font-medium">Danh mục cha</span><button type="button" class="category-input flex items-center justify-between text-left" :aria-expanded="parentOpen" data-testid="category-parent-trigger" @click="toggleParents">{{ selectedParentName || 'Danh mục gốc' }}<ChevronDown class="size-4" aria-hidden="true" /></button>
            <div v-if="parentOpen" class="mt-2 rounded-xl border border-border bg-surface p-2 shadow-sm" data-testid="category-parent-options">
              <label class="relative block"><span class="sr-only">Tìm danh mục cha</span><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input v-model="parentInput" type="search" placeholder="Tìm theo tên hoặc slug" class="category-input category-search-input" data-testid="category-parent-search"></label>
              <div class="mt-2 max-h-56 overflow-y-auto">
                <button type="button" class="category-parent-option" @click="selectParent(null)">Không chọn · danh mục gốc</button>
                <button v-for="item in parentItems.filter(candidate => !editing || candidate.id !== category?.id)" :key="item.id" type="button" class="category-parent-option" :data-testid="`category-parent-${item.id}`" @click="selectParent(item)"><span class="block truncate font-medium">{{ item.name }}</span><span class="block truncate text-[0.6875rem] text-muted-foreground">{{ [...item.ancestors.map(ancestor => ancestor.name), item.name].join(' / ') }} · Cấp {{ item.depth + 1 }}</span></button>
                <p v-if="parentLoading" class="px-3 py-2 text-[0.75rem] text-muted-foreground" role="status">Đang tải danh mục…</p>
                <p v-else-if="!parentItems.length && !parentError" class="px-3 py-2 text-[0.75rem] text-muted-foreground">Không có danh mục cha phù hợp ở trang này.</p>
                <p v-if="parentError" class="px-3 py-2 text-[0.75rem] text-red-700" role="alert">{{ parentError }} <button type="button" class="font-semibold underline" @click="loadParents(parentPage || 1)">Thử lại</button></p>
                <button v-if="parentPage < parentLastPage" type="button" class="category-parent-option font-semibold text-primary-700" data-testid="category-parent-more" :disabled="parentLoading" @click="loadParents(parentPage + 1)">Tải thêm danh mục</button>
              </div>
            </div>
            <small v-if="errors.parent_id" class="mt-1 block text-[0.75rem] text-red-700" role="alert">{{ errors.parent_id }}</small>
            <p class="mt-2 text-[0.75rem] text-muted-foreground">{{ editing ? 'Tìm kiếm trên toàn bộ danh mục. Quan hệ vòng được máy chủ kiểm tra khi lưu.' : `Danh mục mới sẽ ở cấp ${createLevel}/3. Chỉ có thể chọn danh mục cha cấp 1 hoặc 2.` }}</p>
          </div></section>
          <template v-if="!editing">
            <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6" data-testid="category-existing-children">
              <div class="flex flex-wrap items-center justify-between gap-2"><div><h2 class="font-semibold text-primary-950">Gắn danh mục có sẵn</h2><p class="mt-1 text-[0.75rem] text-muted-foreground">Các mục được chọn sẽ đổi danh mục cha, không tạo bản sao.</p></div><button type="button" class="category-secondary gap-1.5" :disabled="!canHaveChildren" :aria-expanded="childPickerOpen" data-testid="category-existing-trigger" @click="toggleExistingChildren"><Search class="size-4" />Chọn danh mục</button></div>
              <p v-if="!canHaveChildren" class="mt-3 text-[0.75rem] text-amber-800">Danh mục cấp 3 không thể có danh mục con. Các lựa chọn đã có vẫn được giữ để bạn đổi lại danh mục cha.</p>
              <div v-if="selectedExistingChildren.length" class="mt-3 flex flex-wrap gap-2"><span v-for="item in selectedExistingChildren" :key="item.id" class="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1.5 text-[0.75rem] text-primary-900"><span class="min-w-0 truncate" :title="[...item.ancestors.map(ancestor => ancestor.name), item.name].join(' / ')">{{ item.name }}</span><button type="button" :aria-label="`Bỏ ${item.name}`" :data-testid="`category-existing-remove-${item.id}`" class="grid size-5 shrink-0 place-items-center rounded hover:bg-primary-100" @click="removeExistingChild(item.id)"><X class="size-3.5" /></button></span></div>
              <div v-if="childPickerOpen" class="mt-3 rounded-xl border border-border p-2" data-testid="category-existing-options">
                <label class="relative block"><span class="sr-only">Tìm danh mục có sẵn</span><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input v-model="childInput" type="search" class="category-input category-search-input" placeholder="Tìm theo tên hoặc slug" data-testid="category-existing-search"></label>
                <div class="mt-2 max-h-56 overflow-y-auto">
                  <button v-for="item in childItems" :key="item.id" type="button" class="category-parent-option disabled:cursor-not-allowed disabled:opacity-50" :data-testid="`category-existing-${item.id}`" :disabled="Boolean(attachmentIssue(item))" @click="selectExistingChild(item)"><span class="block truncate font-medium">{{ item.name }}</span><span class="block truncate text-[0.6875rem] text-muted-foreground">{{ [...item.ancestors.map(ancestor => ancestor.name), item.name].join(' / ') }}{{ item.has_children ? ' · Có danh mục con' : '' }}</span><span v-if="attachmentIssue(item)" class="block text-[0.6875rem] text-amber-800">{{ attachmentIssue(item) }}</span></button>
                  <p v-if="childLoading" class="px-3 py-2 text-[0.75rem] text-muted-foreground" role="status">Đang tải danh mục…</p><p v-else-if="!childItems.length && !childError" class="px-3 py-2 text-[0.75rem] text-muted-foreground">Không tìm thấy danh mục phù hợp.</p>
                  <p v-if="childError" class="px-3 py-2 text-[0.75rem] text-red-700" role="alert">{{ childError }} <button type="button" class="font-semibold underline" @click="loadExistingChildren(childPage || 1)">Thử lại</button></p>
                  <button v-if="childPage < childLastPage" type="button" class="category-parent-option font-semibold text-primary-700" data-testid="category-existing-more" :disabled="childLoading" @click="loadExistingChildren(childPage + 1)">Tải thêm danh mục</button>
                </div>
              </div>
              <p v-if="selectedAttachmentIssue" class="mt-2 text-[0.75rem] text-amber-800" role="alert">{{ selectedAttachmentIssue }}</p>
              <p v-for="(message, index) in attachmentErrors" :key="index" class="mt-2 text-[0.75rem] text-red-700" role="alert">{{ message }}</p>
              <p class="mt-2 text-[0.75rem] text-muted-foreground">Danh mục có cây con sâu sẽ được máy chủ kiểm tra trước khi lưu.</p>
            </section>
            <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6" data-testid="category-new-children">
              <div class="flex flex-wrap items-center justify-between gap-2"><div><h2 class="font-semibold text-primary-950">Thêm danh mục con mới</h2><p class="mt-1 text-[0.75rem] text-muted-foreground">Chỉ thêm một cấp con trực tiếp trong lần tạo này.</p></div><button type="button" class="category-secondary gap-1.5" :disabled="!canHaveChildren" data-testid="category-child-add" @click="addChildDraft"><Plus class="size-4" />Thêm dòng</button></div>
              <p v-if="!canHaveChildren" class="mt-3 text-[0.75rem] text-amber-800">Danh mục mới ở cấp 3; không thể thêm con. Dữ liệu đã nhập được giữ lại nếu bạn đổi danh mục cha.</p>
              <p v-if="errors.new_children" class="mt-3 text-[0.75rem] text-red-700" role="alert">{{ errors.new_children }}</p>
              <div v-if="newChildDrafts.length" class="mt-4 space-y-3">
                <article v-for="(draft, index) in newChildDrafts" :key="childDraftKeys[index]" class="min-w-0 rounded-xl border border-border bg-surface-subtle/40 p-3.5" :data-testid="`category-child-${index}`">
                  <div class="mb-3 flex items-center justify-between gap-2"><h3 class="text-[0.8125rem] font-semibold">Danh mục con {{ index + 1 }}</h3><button type="button" class="inline-flex items-center gap-1 text-[0.75rem] font-medium text-red-700" :aria-label="`Bỏ danh mục con ${index + 1}`" @click="removeChildDraft(childDraftKeys[index]!)"><Trash2 class="size-3.5" />Bỏ dòng</button></div>
                  <div class="grid min-w-0 gap-3 sm:grid-cols-2">
                    <label class="category-field min-w-0"><span>Tên <span class="text-red-600">*</span></span><input v-model="draft.name" :name="`new_children.${index}.name`" class="category-input" maxlength="255" :aria-invalid="Boolean(errors[`new_children.${index}.name`])" @input="onChildNameInput(childDraftKeys[index]!, $event)"><small v-if="errors[`new_children.${index}.name`]" role="alert">{{ errors[`new_children.${index}.name`] }}</small></label>
                    <label class="category-field min-w-0"><span>Slug <span class="text-red-600">*</span></span><input v-model="draft.slug" :name="`new_children.${index}.slug`" class="category-input" maxlength="255" :aria-invalid="Boolean(errors[`new_children.${index}.slug`])" @input="childSlugEdited[childDraftKeys[index]!] = true; draftDirty = true"><small v-if="errors[`new_children.${index}.slug`]" role="alert">{{ errors[`new_children.${index}.slug`] }}</small></label>
                  </div>
                  <details class="mt-3 text-[0.75rem]"><summary class="cursor-pointer font-medium text-primary-700">Tùy chọn thêm</summary><div class="mt-3 grid gap-3 sm:grid-cols-2">
                    <label class="category-field sm:col-span-2"><span>Mô tả</span><textarea v-model="draft.description" rows="2" class="category-input resize-y" @input="draftDirty = true"></textarea></label>
                    <label class="category-field"><span>Trạng thái</span><select v-model="draft.status" class="category-input" @change="draftDirty = true"><option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select><small v-if="errors[`new_children.${index}.status`]" role="alert">{{ errors[`new_children.${index}.status`] }}</small></label>
                    <label class="category-field"><span>Ưu tiên</span><input v-model.number="draft.sort_order" type="number" min="0" step="1" class="category-input" @input="draftDirty = true"><small v-if="errors[`new_children.${index}.sort_order`]" role="alert">{{ errors[`new_children.${index}.sort_order`] }}</small></label>
                    <label class="flex items-center gap-2 text-[0.8125rem]"><input v-model="draft.is_featured" type="checkbox" class="size-4 accent-primary-700" @change="draftDirty = true">Danh mục nổi bật</label>
                    <div class="sm:col-span-2" @change.capture="onChildImageSelection(childDraftKeys[index]!, $event)"><AdminImagePicker :key="`${childDraftKeys[index]}-${childPickerVersions[childDraftKeys[index]!]}`" :model-value="childImageValues[childDraftKeys[index]!]" label="Ảnh danh mục con" :error="errors[`new_children.${index}.image_upload_token`]" @update:model-value="setChildImage(childDraftKeys[index]!, $event)" /><button v-if="childImagePending[childDraftKeys[index]!]" type="button" class="mt-2 text-[0.75rem] font-medium text-primary-700" @click="clearChildImage(childDraftKeys[index]!)">Bỏ ảnh đang chọn</button></div>
                  </div></details>
                </article>
              </div>
            </section>
          </template>
        </div>
        <div class="space-y-4">
          <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><h2 class="font-semibold text-primary-950">Ảnh đại diện danh mục</h2><div class="mt-4" @change.capture="onImageSelection"><AdminImagePicker :key="rootPickerVersion" :model-value="imageValue" label="Ảnh danh mục" :error="errors.image_upload_token || errors.image_url" @update:model-value="setImage" /></div><p v-if="imagePending" class="mt-2 text-[0.75rem] text-amber-800" role="status">Ảnh chưa sẵn sàng. Hãy đợi tải xong, chọn lại hoặc bỏ ảnh trước khi lưu. <button type="button" class="font-semibold underline" @click="clearRootImage">Bỏ ảnh đang chọn</button></p></section>
          <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><h2 class="font-semibold text-primary-950">{{ editing ? 'Hiển thị' : 'Xuất bản' }}</h2><div class="mt-4 grid gap-4">
            <label class="category-field"><span>Trạng thái</span><select v-model="form.status" name="status" class="category-input" :aria-invalid="Boolean(errors.status)" @change="draftDirty = true"><option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select><small v-if="errors.status" role="alert">{{ errors.status }}</small><small class="text-muted-foreground">{{ statusOptions.find(option => option.value === form.status)?.description }}</small></label>
            <label class="flex items-center gap-2 text-[0.8125rem] font-medium"><input v-model="form.is_featured" type="checkbox" name="is_featured" class="size-4 accent-primary-700" @change="draftDirty = true">Danh mục nổi bật</label>
            <label class="category-field"><span class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span>Thứ tự sắp xếp</span><span class="text-[0.75rem] font-normal text-muted-foreground">Số nhỏ ưu tiên trước trong cùng cấp</span></span><input v-model.number="form.sort_order" name="sort_order" type="number" min="0" step="1" :aria-invalid="Boolean(errors.sort_order)" class="category-input" @input="draftDirty = true"><small v-if="errors.sort_order" role="alert">{{ errors.sort_order }}</small></label>
            <small v-if="editing && errors.is_active" role="alert" class="text-[0.75rem] text-red-700">{{ errors.is_active }}</small></div></section>
        </div>
      </div>
      <div :class="['flex flex-wrap items-center justify-end gap-3 bg-surface p-4', embedded ? 'sticky bottom-0 z-10 border-t border-border/60' : 'rounded-2xl shadow-xs ring-1 ring-black/[0.04]']"><p v-if="saveError" class="min-w-0 basis-full break-words text-[0.8125rem] text-red-700 sm:mr-auto sm:basis-auto" role="alert">{{ saveError }}</p><RouterLink v-if="!embedded" :to="editing ? `/admin/categories/${id}` : '/admin/categories'" class="category-secondary">Hủy</RouterLink><button type="submit" class="category-primary gap-2" :disabled="saving || imagePending || anyChildImagePending" :aria-busy="saving" data-testid="category-save"><LoaderCircle v-if="saving" class="size-4 animate-spin" aria-hidden="true" />{{ saving ? (editing ? 'Đang lưu…' : 'Đang tạo danh mục...') : editing ? 'Lưu thay đổi' : 'Tạo danh mục' }}</button></div>
    </form>
  </section>
</template>

<style scoped>
.category-editor-embedded form > .grid section {
  border-radius: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  box-shadow: none;
  padding: 1.25rem 0;
}
.category-field { display: grid; gap: .4rem; font-size: .8125rem; font-weight: 500; }
.category-field small { color: #b42318; font-size: .75rem; }
.category-input { min-height: 2.5rem; width: 100%; border: 1px solid var(--border); border-radius: .75rem; background: var(--surface); padding: .55rem .75rem; color: var(--foreground); font-size: .8125rem; font-weight: 400; outline: none; }
.category-search-input { padding-inline-start: 2.5rem; }
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
