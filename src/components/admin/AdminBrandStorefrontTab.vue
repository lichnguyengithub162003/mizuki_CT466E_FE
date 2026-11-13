<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ChevronDown, ChevronUp, Monitor, Smartphone } from '@lucide/vue'
import AdminImagePicker from '@/components/admin/AdminImagePicker.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import BrandStorefrontCanvas from '@/components/brand/BrandStorefrontCanvas.vue'
import { discardAdminBrandStorefrontDraft, getAdminBrandStorefront, publishAdminBrandStorefront, saveAdminBrandStorefrontDraft } from '@/api/adminApi'
import type { AdminBrandRecord, AdminBrandStorefrontConfig, AdminBrandStorefrontSection } from '@/types/adminBrand'
import { isApplicationError } from '@/types/admin'

type Asset = 'desktop_banner' | 'mobile_banner' | 'supporting_image'
type ImageValue = { image_url?: string | null; upload_token?: string | null; preview_url?: string | null }
const props = defineProps<{ brand: AdminBrandRecord }>()
const emit = defineEmits<{ dirty: [value: boolean] }>()
const sectionOptions: Array<{ key: AdminBrandStorefrontSection; label: string }> = [
  { key: 'vouchers', label: 'Ưu đãi' }, { key: 'featured', label: 'Sản phẩm nổi bật' }, { key: 'story', label: 'Câu chuyện' },
]
const assetOptions: Array<{ key: Asset; label: string; hint: string }> = [
  { key: 'desktop_banner', label: 'Banner desktop', hint: 'Ảnh ngang cho phần mở đầu trên màn hình lớn.' },
  { key: 'mobile_banner', label: 'Banner di động', hint: 'Ảnh riêng cho màn hình nhỏ.' },
  { key: 'supporting_image', label: 'Ảnh phụ', hint: 'Ảnh kể chuyện hoặc điểm nhấn bên dưới.' },
]
const defaultConfig = (): AdminBrandStorefrontConfig => ({ preset: 'editorial', intro: null, sections: ['vouchers', 'featured', 'story'] })
const config = ref<AdminBrandStorefrontConfig>(defaultConfig())
const published = ref<AdminBrandStorefrontConfig | null>(null)
const savedDraft = ref<AdminBrandStorefrontConfig | null>(null)
const viewport = ref<'desktop' | 'mobile'>('desktop')
const assets = reactive<Record<Asset, ImageValue>>({ desktop_banner: {}, mobile_banner: {}, supporting_image: {} })
const actions = reactive<Record<Asset, 'keep' | 'replace' | 'remove'>>({ desktop_banner: 'keep', mobile_banner: 'keep', supporting_image: 'keep' })
const uploading = reactive<Record<Asset, boolean>>({ desktop_banner: false, mobile_banner: false, supporting_image: false })
const loading = ref(true)
const pending = ref(false)
const error = ref('')
const notice = ref('')
const confirmation = ref<'publish' | 'discard' | null>(null)
let sequence = 0
const dirty = computed(() => JSON.stringify(config.value) !== JSON.stringify(savedDraft.value ?? published.value ?? defaultConfig())
  || Object.values(actions).some(action => action !== 'keep'))
watch(dirty, value => emit('dirty', value), { immediate: true })
const enabledSections = computed(() => config.value.sections.map(key => sectionOptions.find(section => section.key === key)!).filter(Boolean))
const previewConfig = computed<AdminBrandStorefrontConfig>(() => ({
  ...config.value,
  assets: Object.fromEntries(assetOptions.map(({ key }) => [key, actions[key] === 'remove' ? null
    : actions[key] === 'replace' ? assets[key].preview_url || assets[key].image_url || null
      : config.value.assets && key in config.value.assets ? config.value.assets[key]
        : key === 'desktop_banner' ? props.brand.banner_rendition_url || props.brand.banner_image
          : key === 'mobile_banner' ? props.brand.mobile_banner_image : props.brand.supporting_image])) as AdminBrandStorefrontConfig['assets'],
}))

function resetAssets(): void {
  for (const { key } of assetOptions) {
    const source = config.value.assets && key in config.value.assets ? config.value.assets[key]
      : key === 'desktop_banner' ? props.brand.banner_rendition_url || props.brand.banner_image
        : key === 'mobile_banner' ? props.brand.mobile_banner_image : props.brand.supporting_image
    assets[key] = { image_url: source }
    actions[key] = 'keep'
    uploading[key] = false
  }
}
function setAsset(key: Asset, value: ImageValue): void {
  assets[key] = value
  actions[key] = value.upload_token ? 'replace' : 'remove'
}
async function load(): Promise<void> {
  const current = ++sequence
  loading.value = true; error.value = ''
  try {
    const result = await getAdminBrandStorefront(props.brand.id, true)
    if (current !== sequence) return
    published.value = result.published
    savedDraft.value = result.draft
    config.value = structuredClone(result.draft ?? result.published ?? defaultConfig())
    resetAssets()
  } catch { if (current === sequence) error.value = 'Không thể tải thiết kế gian hàng.' }
  finally { if (current === sequence) loading.value = false }
}
function toggleSection(key: AdminBrandStorefrontSection): void {
  const next = config.value.sections.includes(key) ? config.value.sections.filter(item => item !== key) : [...config.value.sections, key]
  if (next.length) config.value = { ...config.value, sections: next }
}
function moveSection(index: number, direction: -1 | 1): void {
  const next = [...config.value.sections]
  const destination = index + direction
  if (destination < 0 || destination >= next.length) return
  ;[next[index], next[destination]] = [next[destination]!, next[index]!]
  config.value = { ...config.value, sections: next }
}
async function saveDraft(): Promise<void> {
  if (pending.value || Object.values(uploading).some(Boolean)) return
  pending.value = true; error.value = ''; notice.value = ''
  try {
    const changes: Record<string, string | boolean> = {}
    for (const { key } of assetOptions) {
      if (actions[key] === 'replace' && assets[key].upload_token) changes[`${key}_upload_token`] = assets[key].upload_token!
      else if (actions[key] === 'remove') changes[`remove_${key}`] = true
    }
    const result = await saveAdminBrandStorefrontDraft(props.brand.id, {
      preset: config.value.preset, intro: config.value.intro, sections: config.value.sections, ...changes,
    })
    savedDraft.value = structuredClone(result.draft)
    config.value = structuredClone(result.draft)
    resetAssets()
    notice.value = 'Đã lưu bản nháp. Gian hàng công khai chưa thay đổi.'
  } catch (cause) {
    if (isApplicationError(cause) && cause.kind === 'validation') {
      const fields = Object.keys(cause.validationErrors ?? {})
      error.value = fields.some(field => field.includes('upload_token'))
        ? 'Ảnh tải lên không hợp lệ hoặc đã hết hạn. Vui lòng chọn ảnh lại.'
        : 'Bố cục hoặc nội dung bản nháp chưa hợp lệ. Vui lòng kiểm tra và thử lại.'
    } else if (isApplicationError(cause) && cause.kind === 'unauthorized') error.value = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    else if (isApplicationError(cause) && cause.kind === 'forbidden') error.value = 'Tài khoản không có quyền lưu thiết kế gian hàng.'
    else if (isApplicationError(cause) && cause.kind === 'not-found') error.value = 'Thương hiệu không còn tồn tại. Vui lòng tải lại trang.'
    else error.value = 'Không thể lưu bản nháp do lỗi hệ thống hoặc kết nối. Vui lòng thử lại sau.'
  }
  finally { pending.value = false }
}
async function publish(): Promise<void> {
  if (pending.value || !savedDraft.value || dirty.value) return
  pending.value = true; error.value = ''; notice.value = ''
  try {
    const result = await publishAdminBrandStorefront(props.brand.id)
    published.value = structuredClone(result.published)
    savedDraft.value = null
    config.value = structuredClone(result.published)
    resetAssets()
    notice.value = 'Đã xuất bản thiết kế gian hàng.'
    confirmation.value = null
  } catch { error.value = 'Không thể xuất bản gian hàng. Vui lòng thử lại.' }
  finally { pending.value = false }
}
async function discard(): Promise<void> {
  if (pending.value) return
  pending.value = true; error.value = ''; notice.value = ''
  try {
    if (savedDraft.value) await discardAdminBrandStorefrontDraft(props.brand.id)
    savedDraft.value = null
    config.value = structuredClone(published.value ?? defaultConfig())
    resetAssets()
    notice.value = 'Đã bỏ bản nháp. Bản xuất bản vẫn được giữ nguyên.'
    confirmation.value = null
  } catch { error.value = 'Không thể bỏ bản nháp. Vui lòng thử lại.' }
  finally { pending.value = false }
}
watch(() => props.brand.id, () => { void load() }, { immediate: true })
onBeforeUnmount(() => { sequence++ })
</script>

<template>
  <section class="grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(18rem,.75fr)_minmax(0,1.25fr)] sm:p-5" data-testid="brand-storefront-designer">
    <div class="min-w-0 space-y-4"><div><h2 class="text-base font-semibold text-primary-950">Thiết kế gian hàng</h2><p class="mt-1 text-xs leading-5 text-muted-foreground">Bố cục dùng thẻ minh họa trung tính. Khách hàng chỉ thấy nội dung thật đã xuất bản.</p></div><p v-if="loading" role="status" class="text-sm">Đang tải thiết kế…</p><template v-else><div class="rounded-xl border border-border/70 bg-white p-4"><h3 class="text-sm font-semibold text-primary-950">Bố cục</h3><div class="mt-3 grid grid-cols-2 gap-2"><label v-for="preset in ['editorial', 'gallery'] as const" :key="preset" class="cursor-pointer rounded-xl border p-3 text-xs" :class="config.preset === preset ? 'border-primary-600 bg-primary-50 text-primary-900' : 'border-border text-muted-foreground'"><input v-model="config.preset" type="radio" :value="preset" class="sr-only"><span class="mb-2 block h-8 rounded-md" :class="preset === 'editorial' ? 'bg-gradient-to-r from-primary-800 to-primary-500' : 'bg-gradient-to-r from-primary-50 via-primary-200 to-primary-700'" /><span class="font-semibold">{{ preset === 'editorial' ? 'Biên tập' : 'Trưng bày' }}</span></label></div><label class="mt-4 grid gap-1.5 text-xs font-medium text-primary-900">Lời giới thiệu<textarea v-model="config.intro" rows="3" maxlength="1200" class="w-full rounded-lg border border-border p-3 font-normal outline-none focus:border-primary-500" placeholder="Giới thiệu ngắn về thương hiệu" /></label></div>
      <div class="rounded-xl border border-border/70 bg-white p-4"><h3 class="text-sm font-semibold text-primary-950">Khu vực gian hàng</h3><p class="mt-1 text-xs text-muted-foreground">Vị trí ưu đãi, sản phẩm nổi bật và câu chuyện theo thứ tự bên dưới.</p><div v-for="(section, index) in enabledSections" :key="section.key" class="mt-2 flex items-center justify-between rounded-lg bg-primary-50/60 px-3 py-2 text-xs"><span>{{ index + 1 }}. {{ section.label }}</span><span class="flex gap-1"><button type="button" :disabled="index === 0" :aria-label="`Đưa ${section.label} lên`" class="rounded p-1 disabled:opacity-40" @click="moveSection(index, -1)"><ChevronUp class="size-4" /></button><button type="button" :disabled="index === enabledSections.length - 1" :aria-label="`Đưa ${section.label} xuống`" class="rounded p-1 disabled:opacity-40" @click="moveSection(index, 1)"><ChevronDown class="size-4" /></button></span></div><label v-for="section in sectionOptions" :key="section.key" class="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" :checked="config.sections.includes(section.key)" :disabled="config.sections.length === 1 && config.sections.includes(section.key)" @change="toggleSection(section.key)">{{ section.label }}</label></div>
      <div class="rounded-xl border border-border/70 bg-white p-4"><h3 class="text-sm font-semibold text-primary-950">Hình ảnh gian hàng</h3><p class="mt-1 text-xs text-muted-foreground">Ảnh mới chỉ xuất hiện công khai sau khi lưu nháp và xuất bản.</p><div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><div v-for="asset in assetOptions" :key="asset.key"><AdminImagePicker :model-value="assets[asset.key]" :label="asset.label" @update:model-value="setAsset(asset.key, $event)" @uploading="uploading[asset.key] = $event" /><p class="mt-1 text-xs text-muted-foreground">{{ asset.hint }}</p></div></div></div>
      <p v-if="notice" role="status" class="text-xs text-emerald-800">{{ notice }}</p><p v-if="error" role="alert" class="text-xs text-red-800">{{ error }}</p><div class="flex flex-wrap gap-2 text-xs font-semibold"><button type="button" :disabled="pending || !dirty || Object.values(uploading).some(Boolean)" class="rounded-lg border border-primary-300 px-3 py-2 text-primary-800 disabled:opacity-45" @click="saveDraft">{{ pending ? 'Đang xử lý…' : 'Lưu bản nháp' }}</button><button type="button" :disabled="pending || !savedDraft || dirty" class="rounded-lg bg-primary-800 px-3 py-2 text-white disabled:opacity-45" @click="confirmation = 'publish'">Xuất bản</button><button type="button" :disabled="pending || (!dirty && !savedDraft)" class="rounded-lg px-3 py-2 text-muted-foreground disabled:opacity-45" @click="confirmation = 'discard'">Bỏ thay đổi</button></div></template></div>
    <BaseDialog :model-value="confirmation !== null" :title="confirmation === 'publish' ? 'Xuất bản thiết kế gian hàng' : 'Bỏ bản nháp gian hàng'" :description="confirmation === 'publish' ? 'Chỉ bản nháp đã lưu sẽ được công khai cho khách hàng.' : 'Bản đã xuất bản vẫn được giữ nguyên.'" @update:model-value="confirmation = $event ? confirmation : null">
      <p v-if="error" role="alert" class="text-sm text-red-800">{{ error }}</p>
      <template #footer><button type="button" :disabled="pending" class="rounded-lg border border-border px-4 py-2 text-sm" @click="confirmation = null">Hủy</button><button type="button" :disabled="pending" class="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" data-testid="brand-storefront-confirm" @click="confirmation === 'publish' ? publish() : discard()">{{ pending ? 'Đang xử lý…' : confirmation === 'publish' ? 'Xác nhận xuất bản' : 'Xác nhận bỏ bản nháp' }}</button></template>
    </BaseDialog>
    <div class="min-w-0"><div class="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 class="text-sm font-semibold text-primary-950">Xem trước trực tiếp</h3><p class="text-xs text-muted-foreground">Hiển thị thay đổi chưa lưu trong phiên này.</p></div><div class="flex gap-1 rounded-lg bg-primary-50 p-1 text-xs"><button type="button" :aria-pressed="viewport === 'desktop'" class="inline-flex items-center gap-1 rounded-md px-2 py-1" :class="viewport === 'desktop' ? 'bg-white text-primary-900 shadow-sm' : 'text-muted-foreground'" @click="viewport = 'desktop'"><Monitor class="size-3.5" />PC</button><button type="button" :aria-pressed="viewport === 'mobile'" class="inline-flex items-center gap-1 rounded-md px-2 py-1" :class="viewport === 'mobile' ? 'bg-white text-primary-900 shadow-sm' : 'text-muted-foreground'" @click="viewport = 'mobile'"><Smartphone class="size-3.5" />Mobile</button></div></div><div class="mx-auto overflow-hidden rounded-2xl border border-primary-100 shadow-sm transition-[max-width]" :class="viewport === 'mobile' ? 'max-w-[390px]' : 'max-w-full'"><BrandStorefrontCanvas :brand="brand" :config="previewConfig" :featured-products="[]" :promotions="[]" :products="[]" preview :viewport="viewport" /></div></div>
  </section>
</template>
