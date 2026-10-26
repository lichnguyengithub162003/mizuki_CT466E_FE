<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, FolderTree, Image as ImageIcon, Pencil, RefreshCw } from '@lucide/vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import { getAdminCategory } from '@/api/adminApi'
import type { AdminCategoryRecord } from '@/types/adminCategory'

const route = useRoute()
const category = ref<AdminCategoryRecord | null>(null)
const loading = ref(true)
const error = ref('')
const failedImages = ref<string[]>([])
let request = 0
const id = computed(() => String(route.params.id ?? ''))
const imageUrl = computed(() => {
  return [category.value?.image_rendition_url, category.value?.image_url]
    .find(url => url && !failedImages.value.includes(url)) || ''
})
const hierarchy = computed(() => category.value
  ? [...category.value.ancestors.map(item => item.name), category.value.name].join(' / ')
  : '')
function dateLabel(value: string | null): string {
  return value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Chưa có dữ liệu'
}
async function load(): Promise<void> {
  const current = ++request
  loading.value = true
  error.value = ''
  category.value = null
  failedImages.value = []
  try {
    const result = await getAdminCategory(id.value)
    if (current === request) category.value = result
  } catch {
    if (current === request) error.value = 'Không thể tải thông tin danh mục. Vui lòng thử lại.'
  } finally {
    if (current === request) loading.value = false
  }
}
watch(id, () => { void load() }, { immediate: true })
onBeforeUnmount(() => { request += 1 })
</script>

<template>
  <section class="min-w-0 space-y-4" aria-label="Chi tiết danh mục" data-testid="category-detail-page">
    <RouterLink to="/admin/categories" class="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary-700 hover:text-primary-900"><ArrowLeft class="size-4" />Danh sách danh mục</RouterLink>
    <div v-if="loading" class="rounded-2xl bg-surface p-6" role="status" aria-label="Đang tải danh mục"><BaseSkeleton class="h-32 rounded-xl" /><BaseSkeleton class="mt-4 h-40 rounded-xl" /></div>
    <div v-else-if="error" class="rounded-2xl bg-surface p-8 text-center" role="alert"><p>{{ error }}</p><button type="button" class="mt-3 inline-flex items-center gap-2 text-primary-700" @click="load"><RefreshCw class="size-4" />Thử lại</button></div>
    <template v-else-if="category">
      <header class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-7">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div class="grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary-50 text-primary-700" data-testid="category-detail-image"><img v-if="imageUrl" :src="imageUrl" :alt="`Ảnh danh mục ${category.name}`" class="size-full object-cover" @error="failedImages.push(imageUrl)"><ImageIcon v-else class="size-7" aria-label="Danh mục chưa có ảnh hoặc ảnh không tải được" /></div>
          <div class="min-w-0 flex-1"><p class="text-[0.75rem] font-medium text-primary-700">Danh mục sản phẩm</p><h1 class="mt-1 break-words text-2xl font-semibold tracking-tight text-primary-950">{{ category.name }}</h1><p class="mt-1 break-all text-[0.8125rem] text-muted-foreground">{{ category.slug }}</p><p class="mt-3 text-[0.8125rem] text-muted-foreground" :title="hierarchy">{{ hierarchy }}</p><span class="mt-3 inline-flex items-center gap-2 rounded-full bg-surface-subtle px-3 py-1 text-[0.75rem]"><span :class="['size-2 rounded-full', category.is_active ? 'bg-emerald-600' : 'bg-slate-400']" />{{ category.is_active ? 'Đang hoạt động' : 'Tạm ẩn' }}</span></div>
          <RouterLink :to="`/admin/categories/${category.id}/edit`" class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-800 px-4 text-[0.8125rem] font-semibold text-white hover:bg-primary-900"><Pencil class="size-4" />Chỉnh sửa</RouterLink>
        </div>
      </header>
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,1fr)]">
        <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><h2 class="font-semibold text-primary-950">Thông tin danh mục</h2><dl class="mt-4 grid gap-4 text-[0.8125rem] sm:grid-cols-2"><div><dt class="text-muted-foreground">Danh mục cha</dt><dd class="mt-1 font-medium">{{ category.parent?.name || (category.parent_id === null ? 'Danh mục gốc' : 'Chưa xác định danh mục cha') }}</dd></div><div><dt class="text-muted-foreground">Thứ tự hiển thị</dt><dd class="mt-1 font-medium tabular-nums">{{ category.sort_order }}</dd></div><div class="sm:col-span-2"><dt class="text-muted-foreground">Mô tả</dt><dd class="mt-1 whitespace-pre-wrap leading-6">{{ category.description || 'Chưa có mô tả' }}</dd></div></dl></section>
        <section class="rounded-2xl bg-surface p-5 shadow-xs ring-1 ring-black/[0.04] sm:p-6"><h2 class="flex items-center gap-2 font-semibold text-primary-950"><FolderTree class="size-4" />Quy mô & thời gian</h2><dl class="mt-4 grid gap-4 text-[0.8125rem]"><div><dt class="text-muted-foreground">Danh mục con trực tiếp</dt><dd class="mt-1 text-lg font-semibold tabular-nums">{{ category.children_count }}</dd></div><div><dt class="text-muted-foreground">Sản phẩm trực tiếp</dt><dd class="mt-1 text-lg font-semibold tabular-nums">{{ category.product_count }}</dd></div><div><dt class="text-muted-foreground">Ngày tạo</dt><dd class="mt-1">{{ dateLabel(category.created_at) }}</dd></div><div><dt class="text-muted-foreground">Cập nhật gần nhất</dt><dd class="mt-1">{{ dateLabel(category.updated_at) }}</dd></div></dl></section>
      </div>
    </template>
  </section>
</template>
