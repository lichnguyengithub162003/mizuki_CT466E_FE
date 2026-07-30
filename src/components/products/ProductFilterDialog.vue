<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { defaultProductFilters } from '@/data/products/productListingDemoData'
import type { ProductFilterState } from '@/types/products'
import ProductFilterPanel from './ProductFilterPanel.vue'

const props = defineProps<{
  filters: ProductFilterState
  resultCount: number
}>()

const emit = defineEmits<{
  apply: [filters: ProductFilterState]
  reset: []
}>()

const open = defineModel<boolean>({ default: false })
const draftFilters = ref<ProductFilterState>(cloneFilters(props.filters))

function cloneFilters(filters: ProductFilterState): ProductFilterState {
  return {
    ...filters,
    categoryIds: [...filters.categoryIds],
    brandIds: [...filters.brandIds],
    concernIds: [...filters.concernIds],
    highlights: [...filters.highlights],
  }
}

watch(open, (isOpen) => {
  if (isOpen) draftFilters.value = cloneFilters(props.filters)
})

function applyFilters(): void {
  emit('apply', cloneFilters(draftFilters.value))
  open.value = false
}

function resetFilters(): void {
  draftFilters.value = cloneFilters(defaultProductFilters)
  emit('reset')
}
</script>

<template>
  <BaseDialog
    v-model="open"
    title="Lọc sản phẩm"
    description="Chọn những tiêu chí quan trọng rồi xem kết quả phù hợp."
    close-label="Đóng bộ lọc sản phẩm"
    class="max-h-[88svh] max-w-lg overflow-y-auto rounded-3xl border-white/80 bg-background/98 p-5 shadow-lg"
  >
    <ProductFilterPanel
      :filters="draftFilters"
      :show-reset="false"
      @update="draftFilters = $event"
    />

    <div class="sticky -bottom-5 mt-5 grid grid-cols-2 gap-3 border-t border-border bg-background/96 pb-1 pt-4 backdrop-blur">
      <button
        type="button"
        class="motion-interactive min-h-11 rounded-xl border border-border bg-surface px-4 text-body-sm font-medium text-foreground hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        data-testid="mobile-filter-reset"
        @click="resetFilters"
      >
        Đặt lại
      </button>
      <button
        type="button"
        class="motion-interactive min-h-11 rounded-xl bg-primary-800 px-4 text-body-sm font-medium text-primary-foreground hover:bg-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        data-testid="mobile-filter-apply"
        @click="applyFilters"
      >
        Xem {{ props.resultCount }} kết quả
      </button>
    </div>
  </BaseDialog>
</template>
