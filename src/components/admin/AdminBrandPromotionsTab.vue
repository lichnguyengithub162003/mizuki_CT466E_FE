<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { Check, ChevronDown } from '@lucide/vue'
import BasePopover from '@/components/common/BasePopover.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { associateAdminBrandPromotion, dissociateAdminBrandPromotion, getAdminBrandPromotionOptions, getAdminBrandPromotions } from '@/api/adminApi'
import type { AdminBrandPromotion } from '@/types/adminBrand'

const props = defineProps<{ brandId: number }>()
const items = ref<AdminBrandPromotion[]>([])
const search = ref('')
const status = ref('')
const statusOpen = ref(false)
const removeTarget = ref<AdminBrandPromotion | null>(null)
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)
const pendingId = ref<number | null>(null)
const error = ref('')
const notice = ref('')
const selectedPromotion = ref<{ id: number; name: string; code: string | null } | null>(null)
const options = ref<Array<{ id: number; name: string; code: string | null; is_active: boolean }>>([])
const optionSearch = ref('')
const optionPage = ref(1)
const optionLastPage = ref(1)
const optionLoading = ref(false)
const optionError = ref(false)
const optionsOpen = ref(false)
const showOnStorefront = ref(false)
let sequence = 0
let optionSequence = 0
const statusLabels: Record<AdminBrandPromotion['status'], string> = {
  scheduled: 'Sắp diễn ra', active: 'Đang chạy', expired: 'Đã hết hạn', paused: 'Tạm dừng',
}

async function load(): Promise<void> {
  const current = ++sequence
  loading.value = true
  error.value = ''
  try {
    const result = await getAdminBrandPromotions(props.brandId, { search: search.value, status: status.value, page: page.value })
    if (current !== sequence) return
    items.value = result.items
    lastPage.value = result.pagination.last_page
    if (page.value > lastPage.value) page.value = Math.max(1, lastPage.value)
  } catch {
    if (current === sequence) error.value = 'Không thể tải ưu đãi thương hiệu. Vui lòng thử lại.'
  } finally {
    if (current === sequence) loading.value = false
  }
}
async function associate(): Promise<void> {
  const id = selectedPromotion.value?.id
  if (!id || pendingId.value !== null) return
  pendingId.value = id
  error.value = ''; notice.value = ''
  try {
    await associateAdminBrandPromotion(props.brandId, id, showOnStorefront.value)
    selectedPromotion.value = null
    optionSearch.value = ''
    notice.value = 'Đã liên kết ưu đãi.'
    page.value = 1
    await load()
  } catch { error.value = 'Không thể liên kết ưu đãi. Kiểm tra ID và phạm vi áp dụng của ưu đãi.' }
  finally { pendingId.value = null }
}
async function loadOptions(): Promise<void> {
  const current = ++optionSequence
  optionLoading.value = true; optionError.value = false
  try {
    const result = await getAdminBrandPromotionOptions(optionSearch.value, optionPage.value)
    if (current !== optionSequence) return
    options.value = result.items
    optionLastPage.value = result.pagination.last_page
  } catch { if (current === optionSequence) optionError.value = true }
  finally { if (current === optionSequence) optionLoading.value = false }
}
async function changeVisibility(item: AdminBrandPromotion): Promise<void> {
  if (pendingId.value !== null) return
  pendingId.value = item.id
  error.value = ''; notice.value = ''
  try {
    await associateAdminBrandPromotion(props.brandId, item.id, !item.show_on_storefront)
    await load()
  } catch { error.value = 'Không thể cập nhật vị trí ưu đãi trên gian hàng.' }
  finally { pendingId.value = null }
}
async function remove(): Promise<void> {
  const item = removeTarget.value
  if (pendingId.value !== null || !item) return
  pendingId.value = item.id
  error.value = ''; notice.value = ''
  try {
    await dissociateAdminBrandPromotion(props.brandId, item.id)
    notice.value = 'Đã bỏ liên kết ưu đãi.'
    removeTarget.value = null
    await load()
  } catch { error.value = 'Không thể bỏ liên kết ưu đãi.' }
  finally { pendingId.value = null }
}
watch([() => props.brandId, search, status], () => {
  if (page.value !== 1) page.value = 1
  else void load()
}, { immediate: true })
watch(page, () => { void load() })
watch(optionSearch, () => { if (optionPage.value !== 1) optionPage.value = 1; else void loadOptions() })
watch(optionPage, () => { void loadOptions() })
onBeforeUnmount(() => { sequence++; optionSequence++ })
</script>

<template>
  <section class="space-y-5 p-4 sm:p-6" data-testid="brand-promotions">
    <div class="flex flex-wrap items-end justify-between gap-3"><div><h2 class="text-base font-semibold text-primary-950">Ưu đãi liên kết</h2><p class="mt-1 text-xs text-muted-foreground">Dùng ưu đãi có sẵn. Chỉ ưu đãi toàn hệ thống đủ điều kiện mới có thể hiển thị công khai.</p></div><div class="flex flex-wrap gap-2"><input v-model="search" aria-label="Tìm ưu đãi" placeholder="Tên hoặc mã ưu đãi" class="h-9 rounded-lg border border-border bg-white px-3 text-sm"><BasePopover v-model="statusOpen" align="end" class="w-48 p-1.5"><template #trigger><button type="button" aria-label="Lọc trạng thái ưu đãi" :aria-expanded="statusOpen" class="inline-flex h-9 min-w-36 items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 text-xs font-medium text-primary-900 outline-none hover:border-primary-300 focus-visible:ring-2 focus-visible:ring-primary-500">{{ status ? statusLabels[status as AdminBrandPromotion['status']] : 'Mọi trạng thái' }}<ChevronDown class="size-3.5" /></button></template><button v-for="option in [{ value: '', label: 'Mọi trạng thái' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]" :key="option.value" type="button" :aria-pressed="status === option.value" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-primary-900 hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:outline-none" @click="status = option.value; statusOpen = false">{{ option.label }}<Check v-if="status === option.value" class="size-3.5 text-primary-700" /></button></BasePopover></div></div>
    <form class="flex flex-wrap items-end gap-3 rounded-xl border border-primary-100 bg-primary-50/50 p-4" @submit.prevent="associate">
      <div class="relative min-w-52 flex-1"><label class="grid gap-1 text-xs font-medium text-primary-900">Chọn ưu đãi có sẵn<input v-model="optionSearch" type="text" autocomplete="off" placeholder="Tìm theo tên hoặc mã" class="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-primary-500" @focus="optionsOpen = true; loadOptions()" @input="selectedPromotion = null; optionsOpen = true"></label>
        <div v-if="optionsOpen" class="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-white p-2 shadow-lg"><p v-if="optionLoading" class="p-2 text-xs text-muted-foreground">Đang tìm ưu đãi…</p><p v-else-if="optionError" role="alert" class="p-2 text-xs text-red-800">Không thể tìm ưu đãi. <button type="button" class="underline" @click="loadOptions">Thử lại</button></p><p v-else-if="!options.length" class="p-2 text-xs text-muted-foreground">Không có ưu đãi phù hợp.</p><button v-for="option in options" :key="option.id" type="button" class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-primary-50" @click="selectedPromotion = option; optionSearch = option.name; optionsOpen = false"><span class="font-semibold text-primary-950">{{ option.name }}</span><span class="ml-2 text-muted-foreground">{{ option.code || 'Không có mã' }} · #{{ option.id }}</span></button><div v-if="optionLastPage > 1" class="mt-1 flex justify-between border-t border-border/70 p-2 text-xs"><button type="button" :disabled="optionPage <= 1" @click="optionPage--">Trước</button><span>{{ optionPage }}/{{ optionLastPage }}</span><button type="button" :disabled="optionPage >= optionLastPage" @click="optionPage++">Tiếp</button></div></div>
      </div>
      <label class="flex h-10 items-center gap-2 text-xs text-primary-900"><input v-model="showOnStorefront" type="checkbox">Hiển thị trên gian hàng</label>
      <button type="submit" :disabled="pendingId !== null || !selectedPromotion" class="h-10 rounded-lg bg-primary-800 px-4 text-xs font-semibold text-white disabled:opacity-50">Liên kết</button>
    </form>
    <p v-if="notice" role="status" class="text-xs text-emerald-800">{{ notice }}</p><p v-if="error" role="alert" class="text-xs text-red-800">{{ error }} <button type="button" class="font-semibold underline" @click="load">Thử lại</button></p><p v-if="loading" role="status" class="text-sm text-muted-foreground">Đang tải ưu đãi…</p><p v-else-if="!error && !items.length" class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Chưa có ưu đãi phù hợp.</p>
    <div v-else-if="!loading" class="divide-y divide-border/60 rounded-xl border border-border/70"><article v-for="item in items" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><div class="min-w-0"><p class="font-semibold text-primary-950">{{ item.name }} <span class="font-normal text-muted-foreground">· #{{ item.id }}</span></p><p class="mt-1 text-xs text-muted-foreground">{{ item.code || 'Không có mã' }} · {{ statusLabels[item.status] }} · {{ item.usage_count }} lượt dùng</p><details class="mt-2 text-xs text-primary-800"><summary class="cursor-pointer font-medium">Chi tiết ưu đãi</summary><p class="mt-2">{{ item.discount_type }}: {{ item.discount_value }} · {{ new Date(item.starts_at).toLocaleString('vi-VN') }} – {{ item.ends_at ? new Date(item.ends_at).toLocaleString('vi-VN') : 'Không giới hạn' }}</p></details></div><div class="flex items-center gap-3 text-xs"><label class="flex items-center gap-1.5"><input type="checkbox" :checked="item.show_on_storefront" :disabled="pendingId !== null" @change="changeVisibility(item)">Gian hàng</label><button type="button" :disabled="pendingId !== null" class="font-semibold text-red-700 disabled:opacity-50" @click="removeTarget = item">Bỏ liên kết</button></div></article></div>
    <div v-if="lastPage > 1" class="flex items-center justify-between text-xs"><span>Trang {{ page }} / {{ lastPage }}</span><div class="flex gap-3"><button type="button" :disabled="page <= 1" @click="page--">Trước</button><button type="button" :disabled="page >= lastPage" @click="page++">Tiếp</button></div></div>
    <BaseDialog :model-value="removeTarget !== null" title="Bỏ liên kết ưu đãi" :description="removeTarget ? `Ưu đãi “${removeTarget.name}” sẽ không còn liên kết với thương hiệu.` : ''" @update:model-value="removeTarget = $event ? removeTarget : null"><p v-if="error" role="alert" class="text-sm text-red-800">{{ error }}</p><template #footer><button type="button" :disabled="pendingId !== null" class="rounded-lg border border-border px-4 py-2 text-sm" @click="removeTarget = null">Hủy</button><button type="button" :disabled="pendingId !== null" class="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="remove">{{ pendingId !== null ? 'Đang xử lý…' : 'Bỏ liên kết' }}</button></template></BaseDialog>
  </section>
</template>
