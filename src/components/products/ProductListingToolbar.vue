<script setup lang="ts">
import { SlidersHorizontal } from '@lucide/vue'
import type { ProductSortKey, ProductSortOption } from '@/types/products'

const props = defineProps<{
  resultCount: number
  activeFilterCount: number
  sortOptions: readonly ProductSortOption[]
  sort: ProductSortKey
}>()

const emit = defineEmits<{
  openFilters: []
  updateSort: [sort: ProductSortKey]
}>()

function updateSort(event: Event): void {
  emit('updateSort', (event.target as HTMLSelectElement).value as ProductSortKey)
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 shadow-xs sm:p-4">
    <div>
      <p class="text-body-sm font-semibold text-foreground">{{ props.resultCount }} sản phẩm</p>
      <p v-if="props.activeFilterCount > 0" class="mt-0.5 text-caption text-primary-700">
        {{ props.activeFilterCount }} bộ lọc đang áp dụng
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="motion-interactive inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-body-sm font-medium lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        data-testid="mobile-filter-trigger"
        @click="$emit('openFilters')"
      >
        <SlidersHorizontal class="size-4" aria-hidden="true" />
        Bộ lọc
        <span v-if="props.activeFilterCount > 0" class="grid size-5 place-items-center rounded-full bg-primary-800 text-[0.6875rem] text-primary-foreground">
          {{ props.activeFilterCount }}
        </span>
      </button>

      <label class="flex items-center gap-2 text-body-sm text-text-secondary">
        <span class="hidden sm:inline">Sắp xếp</span>
        <select
          :value="props.sort"
          data-testid="product-sort"
          class="min-h-10 rounded-xl border border-input bg-background px-3 pr-8 text-body-sm font-medium text-foreground outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          aria-label="Sắp xếp sản phẩm"
          @change="updateSort"
        >
          <option v-for="option in props.sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>
  </div>
</template>
