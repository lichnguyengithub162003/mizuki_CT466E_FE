<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId } from 'vue'
import { ImagePlus, RefreshCw, Trash2 } from '@lucide/vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import { uploadAdminImage } from '@/api/adminApi'
import { isApplicationError } from '@/types/admin'

type AdminImageValue = {
  image_url?: string | null
  upload_token?: string | null
  preview_url?: string | null
}

const props = withDefaults(defineProps<{
  modelValue?: AdminImageValue | string | null
  label?: string
  error?: string
  required?: boolean
}>(), { modelValue: null, label: 'Hình ảnh', error: '', required: false })
const emit = defineEmits<{ 'update:modelValue': [value: AdminImageValue] }>()
const input = ref<HTMLInputElement>()
const preview = ref('')
const uploading = ref(false)
const localError = ref('')
const errorId = useId()
const src = computed(() => {
  if (preview.value) return preview.value
  if (typeof props.modelValue === 'string') return props.modelValue
  return props.modelValue?.preview_url || props.modelValue?.image_url || ''
})

function open(): void { if (!uploading.value) input.value?.click() }
function clearPreview(): void { if (preview.value) URL.revokeObjectURL(preview.value); preview.value = '' }
async function select(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  localError.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { localError.value = 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.'; return }
  if (file.size > 8 * 1024 * 1024) { localError.value = 'Ảnh không được vượt quá 8 MB.'; return }
  clearPreview()
  preview.value = URL.createObjectURL(file)
  uploading.value = true
  try {
    const uploaded = await uploadAdminImage(file)
    emit('update:modelValue', {
      image_url: null,
      upload_token: uploaded.upload_token,
      preview_url: uploaded.preview_url,
    })
    clearPreview()
  } catch (error) {
    clearPreview()
    localError.value = isApplicationError(error) ? error.validationErrors?.image?.[0] || error.message : 'Không thể tải ảnh lên.'
  } finally {
    uploading.value = false
    if (input.value) input.value.value = ''
  }
}
function remove(): void {
  clearPreview()
  localError.value = ''
  emit('update:modelValue', { image_url: null, upload_token: null, preview_url: null })
}
onBeforeUnmount(clearPreview)
</script>

<template>
  <fieldset class="grid gap-2" :aria-describedby="(error || localError) ? errorId : undefined">
    <legend class="text-body-sm font-medium">{{ label }}<span v-if="required" class="text-red-600"> *</span></legend>
    <input ref="input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" :disabled="uploading" @change="select">
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class="group relative grid size-28 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-subtle text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary" :disabled="uploading" @click="open">
        <img v-if="src" :src="src" :alt="`Xem trước ${label.toLowerCase()}`" class="size-full object-cover">
        <ImagePlus v-else class="size-7" aria-hidden="true"/>
        <span v-if="uploading" class="absolute inset-0 grid place-items-center bg-white/75"><BaseSpinner/><span class="sr-only">Đang tải ảnh lên</span></span>
      </button>
      <div class="grid gap-2">
        <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-body-sm font-semibold hover:bg-surface-subtle" :disabled="uploading" @click="open"><RefreshCw class="size-4"/>{{ src ? 'Thay ảnh' : 'Chọn ảnh từ máy' }}</button>
        <button v-if="src" type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-body-sm font-semibold text-red-700 hover:bg-red-50" :disabled="uploading" @click="remove"><Trash2 class="size-4"/>Bỏ ảnh</button>
        <p class="text-caption text-muted-foreground">JPG, PNG hoặc WebP · tối đa 8 MB</p>
      </div>
    </div>
    <p v-if="error || localError" :id="errorId" role="alert" class="text-caption text-red-600">{{ error || localError }}</p>
  </fieldset>
</template>
