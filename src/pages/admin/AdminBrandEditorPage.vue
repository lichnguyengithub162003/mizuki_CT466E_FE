<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter, RouterLink } from 'vue-router'
import { ArrowLeft, Image as ImageIcon, Info, LoaderCircle } from '@lucide/vue'
import AdminImagePicker from '@/components/admin/AdminImagePicker.vue'
import BaseTooltip from '@/components/common/BaseTooltip.vue'
import { createAdminBrand, getAdminBrand, updateAdminBrand } from '@/api/adminApi'
import { isApplicationError } from '@/types/admin'
import type { AdminBrandMutation, AdminBrandRecord, AdminBrandStatus } from '@/types/adminBrand'

const props = withDefaults(defineProps<{ brandId?: number; embedded?: boolean }>(), { embedded: false })
const emit = defineEmits<{ saved: [brand: AdminBrandRecord]; dirty: [value: boolean] }>()
const route = useRoute()
const router = useRouter()
const id = computed(() => props.brandId ?? Number(route.params.id || 0))
const editing = computed(() => id.value > 0)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const errors = reactive<Record<string, string>>({})
const dirty = ref(false)
const form = reactive({
  name: '', slug: '', description: '', status: 'published' as AdminBrandStatus,
  origin_country: '', official_website: '', established_year: '' as string | number,
  partner_name: '', partner_relationship: '', partnership_started_at: '', joined_at: '',
  seo_title: '', seo_description: '',
})
const logo = ref<{ image_url?: string | null; upload_token?: string | null; preview_url?: string | null } | null>(null)
const logoAction = ref<'keep' | 'replace' | 'remove'>('keep')
const logoPending = ref(false)
const previewLogo = computed(() => logoAction.value === 'remove' ? null : logo.value?.preview_url || logo.value?.image_url)
let request = 0

function markDirty(): void { dirty.value = true; emit('dirty', true) }
function setLogo(value: NonNullable<typeof logo.value>): void {
  logo.value = value
  logoAction.value = value.upload_token ? 'replace' : 'remove'
  logoPending.value = false
  markDirty()
}
function slugFromName(): void {
  if (editing.value || form.slug) return
  form.slug = form.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
async function load(): Promise<void> {
  if (!editing.value) return
  const current = ++request
  loading.value = true
  error.value = ''
  try {
    const brand = await getAdminBrand(id.value)
    if (current !== request) return
    Object.assign(form, {
      name: brand.name, slug: brand.slug, description: brand.description ?? '', status: brand.status,
      origin_country: brand.origin_country ?? '', official_website: brand.official_website ?? '',
      established_year: brand.established_year ?? '', partner_name: brand.partner_name ?? '',
      partner_relationship: brand.partner_relationship ?? '', partnership_started_at: brand.partnership_started_at?.slice(0, 10) ?? '',
      joined_at: brand.joined_at?.slice(0, 10) ?? '', seo_title: brand.seo_title ?? '', seo_description: brand.seo_description ?? '',
    })
    logo.value = { image_url: brand.logo_rendition_url || brand.logo_url }
    logoAction.value = 'keep'; dirty.value = false; emit('dirty', false)
  } catch { if (current === request) error.value = 'Không thể tải hồ sơ thương hiệu. Vui lòng thử lại.' }
  finally { if (current === request) loading.value = false }
}
async function save(): Promise<void> {
  if (saving.value || logoPending.value) return
  Object.keys(errors).forEach(key => delete errors[key])
  error.value = ''
  if (!form.name.trim()) errors.name = 'Vui lòng nhập tên thương hiệu.'
  if (!form.slug.trim()) errors.slug = 'Vui lòng nhập slug.'
  if (form.established_year && (!Number.isInteger(Number(form.established_year)) || Number(form.established_year) < 1800)) errors.established_year = 'Năm thành lập không hợp lệ.'
  if (Object.keys(errors).length) return
  const payload: AdminBrandMutation = {
    name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim() || null,
    status: form.status, origin_country: form.origin_country.trim() || null,
    official_website: form.official_website.trim() || null,
    established_year: form.established_year ? Number(form.established_year) : null,
    partner_name: form.partner_name.trim() || null,
    partner_relationship: form.partner_relationship ? form.partner_relationship as AdminBrandRecord['partner_relationship'] : null,
    partnership_started_at: form.partnership_started_at || null, joined_at: form.joined_at || null,
    seo_title: form.seo_title.trim() || null, seo_description: form.seo_description.trim() || null,
  }
  if (logoAction.value === 'replace' && logo.value?.upload_token) payload.logo_upload_token = logo.value.upload_token
  else if (logoAction.value === 'remove') payload.logo_url = null
  saving.value = true
  try {
    const brand = editing.value ? await updateAdminBrand(id.value, payload) : await createAdminBrand(payload)
    dirty.value = false; emit('dirty', false); emit('saved', brand)
    if (!props.embedded) await router.push(`/admin/brands/${brand.id}`)
  } catch (cause) {
    if (isApplicationError(cause) && cause.status === 422 && cause.validationErrors) {
      for (const [key, values] of Object.entries(cause.validationErrors)) errors[key] = values[0] ?? 'Giá trị không hợp lệ.'
      error.value = 'Vui lòng kiểm tra các trường được đánh dấu.'
    } else error.value = 'Không thể lưu thương hiệu do lỗi hệ thống. Vui lòng thử lại sau.'
  } finally { saving.value = false }
}
onBeforeRouteLeave(() => !dirty.value || window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ bản nháp?'))
watch(id, () => { void load() }, { immediate: true })
onBeforeUnmount(() => { request++ })
</script>

<template>
  <section class="min-w-0 space-y-4 pb-6" data-testid="brand-editor">
    <RouterLink v-if="!embedded" to="/admin/brands" class="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary-700"><ArrowLeft class="size-4" />Danh sách thương hiệu</RouterLink>
    <div v-if="loading" role="status" class="rounded-2xl bg-white p-8 text-[0.8125rem] text-muted-foreground">Đang tải hồ sơ thương hiệu…</div>
    <div v-else-if="error && editing && !form.name" role="alert" class="rounded-2xl bg-white p-8 text-center"><p class="text-red-800">{{ error }}</p><button type="button" class="mt-2 font-semibold text-primary-700" @click="load">Thử lại</button></div>
    <form v-else class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.8fr)]" @submit.prevent="save" @input="markDirty" @change="markDirty">
      <div class="space-y-4">
        <section class="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/[0.05] sm:p-6"><h1 class="text-lg font-semibold text-primary-950">{{ editing ? 'Chỉnh sửa thương hiệu' : 'Tạo thương hiệu' }}</h1><p class="mt-1 text-[0.8125rem] text-muted-foreground">Thông tin thương hiệu và đối tác.</p><div class="mt-5 grid gap-4 sm:grid-cols-2"><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900">Tên thương hiệu *<input v-model="form.name" maxlength="255" class="brand-input" name="name" @input="slugFromName"><small v-if="errors.name" role="alert" class="text-red-700">{{ errors.name }}</small></label><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900">Slug *<input v-model="form.slug" maxlength="255" class="brand-input" name="slug"><small v-if="errors.slug" role="alert" class="text-red-700">{{ errors.slug }}</small></label><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900">Xuất xứ thương hiệu<input v-model="form.origin_country" maxlength="100" class="brand-input" name="origin_country"></label><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900">Website chính thức<input v-model="form.official_website" type="url" class="brand-input" name="official_website" placeholder="https://"><small v-if="errors.official_website" role="alert" class="text-red-700">{{ errors.official_website }}</small></label><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900">Năm thành lập<input v-model="form.established_year" type="number" min="1800" class="brand-input" name="established_year"><small v-if="errors.established_year" role="alert" class="text-red-700">{{ errors.established_year }}</small></label><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900">Ngày tham gia Mizuki<input v-model="form.joined_at" type="date" class="brand-input" name="joined_at"></label><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900 sm:col-span-2">Giới thiệu thương hiệu<textarea v-model="form.description" rows="5" class="brand-input min-h-28" name="description"></textarea></label></div></section>
        <section class="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/[0.05] sm:p-6"><h2 class="text-sm font-semibold text-primary-950">Logo & SEO</h2><div class="brand-logo-picker mt-4"><AdminImagePicker :model-value="logo" label="Logo thương hiệu" @update:model-value="setLogo" @uploading="logoPending = $event" /></div><div class="mt-5 grid gap-4"><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900"><span class="inline-flex items-center">Tiêu đề SEO <BaseTooltip content="Tiêu đề này có thể xuất hiện trong kết quả tìm kiếm và thông tin trình duyệt. Ví dụ: 50 Megumi | Chăm sóc tóc và da đầu | Mizuki"><button type="button" aria-label="Giải thích tiêu đề SEO" class="ml-1 inline-flex align-middle text-primary-600 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary-500"><Info class="size-3.5" /></button></BaseTooltip></span><input v-model="form.seo_title" maxlength="255" class="brand-input" name="seo_title"></label><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900"><span class="inline-flex items-center">Mô tả SEO <BaseTooltip content="Tóm tắt ngắn về trang thương hiệu để người xem hiểu nội dung trong kết quả tìm kiếm. Công cụ tìm kiếm có thể chọn đoạn khác. Ví dụ: Khám phá sản phẩm chăm sóc tóc và da đầu từ 50 Megumi tại Mizuki."><button type="button" aria-label="Giải thích mô tả SEO" class="ml-1 inline-flex align-middle text-primary-600 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary-500"><Info class="size-3.5" /></button></BaseTooltip></span><textarea v-model="form.seo_description" rows="2" class="brand-input" name="seo_description"></textarea></label></div></section>
      </div>
      <div class="space-y-4"><section class="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-black/[0.05]" data-testid="brand-profile-preview"><div class="bg-gradient-to-br from-primary-800 to-primary-600 p-4 text-white"><p class="text-[0.6875rem] font-semibold uppercase tracking-[.14em] text-white/75">Xem trước hồ sơ</p><div class="mt-3 flex items-center gap-3"><span class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-2 text-primary-400"><img v-if="previewLogo" :src="previewLogo" alt="Logo thương hiệu xem trước" class="size-full object-contain"><ImageIcon v-else class="size-7" /></span><div class="min-w-0"><h2 class="truncate text-lg font-semibold">{{ form.name || 'Tên thương hiệu' }}</h2><p class="text-xs text-white/85">{{ form.origin_country || 'Chưa có xuất xứ' }}</p></div></div></div><div class="p-4"><p class="line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-primary-800">{{ form.description || 'Lời giới thiệu thương hiệu sẽ hiển thị tại đây.' }}</p><p class="mt-3 border-t border-border/70 pt-3 text-xs font-medium text-primary-700">{{ form.status === 'published' ? 'Công khai sau khi lưu' : form.status === 'hidden' ? 'Đã ẩn khỏi gian hàng' : 'Bản nháp · chưa công khai' }}</p></div></section><section class="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/[0.05]"><h2 class="font-semibold text-primary-950">Xuất bản</h2><label class="mt-4 grid gap-1.5 text-[0.8125rem] font-medium text-primary-900">Trạng thái<select v-model="form.status" class="brand-input" name="status"><option value="published">Đã xuất bản</option><option value="hidden">Đã ẩn</option><option value="draft">Bản nháp</option></select></label><p class="mt-2 text-[0.75rem] leading-5 text-muted-foreground">Thương hiệu ẩn hoặc bản nháp không hiển thị là sản phẩm có thể mua.</p></section><section class="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/[0.05]"><h2 class="font-semibold text-primary-950">Đối tác tại Việt Nam</h2><p class="mt-1 text-[0.75rem] text-muted-foreground">Thông tin nội bộ, chỉ Super Admin xem và sửa.</p><div class="mt-4 grid gap-4"><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900">Tên đối tác<input v-model="form.partner_name" class="brand-input" name="partner_name"></label><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900">Mối quan hệ<select v-model="form.partner_relationship" class="brand-input" name="partner_relationship"><option value="">Chưa xác định</option><option value="direct">Trực tiếp</option><option value="official_distributor">Nhà phân phối chính thức</option><option value="authorized_retailer">Đại lý được ủy quyền</option><option value="other">Khác</option></select></label><label class="grid gap-1.5 text-[0.8125rem] font-medium text-primary-900">Ngày bắt đầu hợp tác<input v-model="form.partnership_started_at" type="date" class="brand-input" name="partnership_started_at"></label></div></section><div class="sticky bottom-3 rounded-xl bg-white/95 p-3 shadow-lg ring-1 ring-black/[0.06] backdrop-blur"><p v-if="error" role="alert" class="mb-2 text-[0.75rem] text-red-800">{{ error }}</p><button type="submit" :disabled="saving || loading || logoPending || (editing && !dirty)" class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-800 px-4 py-2.5 text-[0.8125rem] font-semibold text-white disabled:opacity-50"><LoaderCircle v-if="saving" class="size-4 animate-spin" />{{ saving ? 'Đang lưu thương hiệu…' : editing ? 'Lưu thay đổi' : 'Tạo thương hiệu' }}</button></div></div>
    </form>
  </section>
</template>

<style scoped>
.brand-input { width: 100%; min-height: 2.5rem; border: 1px solid var(--color-border); border-radius: .65rem; background: white; padding: .5rem .75rem; font-size: .8125rem; font-weight: 400; outline: none; }
.brand-input:focus { border-color: var(--color-primary-500); box-shadow: 0 0 0 3px rgb(45 110 80 / .12); }
.brand-logo-picker :deep(img) { object-fit: contain; padding: .5rem; background: #f8faf9; }
</style>
