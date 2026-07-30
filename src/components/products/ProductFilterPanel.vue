<script setup lang="ts">
import { ChevronDown, RotateCcw } from '@lucide/vue'
import {
  brandFilterOptions,
  concernFilterOptions,
  defaultProductFilters,
  productCategories,
} from '@/data/products/productListingDemoData'
import type {
  ProductFilterState,
  ProductHighlight,
  ProductPriceRange,
} from '@/types/products'

const props = withDefaults(
  defineProps<{
    filters: ProductFilterState
    showReset?: boolean
  }>(),
  {
    showReset: true,
  },
)

const emit = defineEmits<{
  update: [filters: ProductFilterState]
  reset: []
}>()

const priceOptions: readonly { value: ProductPriceRange; label: string }[] = [
  { value: 'all', label: 'Tất cả mức giá' },
  { value: 'under-200', label: 'Dưới 200.000 ₫' },
  { value: '200-500', label: '200.000 ₫ – 500.000 ₫' },
  { value: '500-1000', label: '500.000 ₫ – 1.000.000 ₫' },
  { value: 'over-1000', label: 'Trên 1.000.000 ₫' },
]

const highlightOptions: readonly { value: ProductHighlight; label: string }[] = [
  { value: 'discounted', label: 'Đang giảm giá' },
  { value: 'bestseller', label: 'Bán chạy' },
  { value: 'new', label: 'Sản phẩm mới' },
]

function toggleStringFilter(
  field: 'categoryIds' | 'brandIds' | 'concernIds',
  id: string,
): void {
  const values = props.filters[field]
  emit('update', {
    ...props.filters,
    [field]: values.includes(id)
      ? values.filter((value) => value !== id)
      : [...values, id],
  })
}

function toggleHighlight(value: ProductHighlight): void {
  emit('update', {
    ...props.filters,
    highlights: props.filters.highlights.includes(value)
      ? props.filters.highlights.filter((item) => item !== value)
      : [...props.filters.highlights, value],
  })
}

function updatePriceRange(value: ProductPriceRange): void {
  emit('update', { ...props.filters, priceRange: value })
}

function updateRating(value: number | null): void {
  emit('update', { ...props.filters, minimumRating: value })
}

function updateStock(checked: boolean): void {
  emit('update', { ...props.filters, inStockOnly: checked })
}

function resetFilters(): void {
  emit('update', { ...defaultProductFilters })
  emit('reset')
}
</script>

<template>
  <div class="grid gap-2" data-testid="product-filter-panel">
    <div v-if="props.showReset" class="mb-2 flex items-center justify-between gap-3">
      <h2 class="text-heading-4">Bộ lọc</h2>
      <button
        type="button"
        class="motion-interactive inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-body-sm font-medium text-primary-700 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @click="resetFilters"
      >
        <RotateCcw class="size-3.5" aria-hidden="true" />
        Đặt lại
      </button>
    </div>

    <details open class="group border-b border-border pb-3">
      <summary class="flex min-h-10 cursor-pointer list-none items-center justify-between text-body-sm font-semibold">
        Danh mục
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="grid gap-2 pt-2">
        <label v-for="category in productCategories" :key="category.id" class="flex min-h-8 items-center gap-2 text-body-sm text-text-secondary">
          <input
            type="checkbox"
            class="size-4 rounded border-input accent-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :checked="props.filters.categoryIds.includes(category.id)"
            @change="toggleStringFilter('categoryIds', category.id)"
          />
          {{ category.label }}
        </label>
      </div>
    </details>

    <details open class="group border-b border-border py-3">
      <summary class="flex min-h-10 cursor-pointer list-none items-center justify-between text-body-sm font-semibold">
        Thương hiệu
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="grid gap-2 pt-2">
        <label v-for="brand in brandFilterOptions" :key="brand.id" class="flex min-h-8 items-center justify-between gap-2 text-body-sm text-text-secondary">
          <span class="flex items-center gap-2">
            <input
              type="checkbox"
              class="size-4 rounded border-input accent-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :checked="props.filters.brandIds.includes(brand.id)"
              @change="toggleStringFilter('brandIds', brand.id)"
            />
            {{ brand.label }}
          </span>
          <span class="text-caption text-text-muted">{{ brand.count }}</span>
        </label>
      </div>
    </details>

    <details open class="group border-b border-border py-3">
      <summary class="flex min-h-10 cursor-pointer list-none items-center justify-between text-body-sm font-semibold">
        Khoảng giá
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="grid gap-2 pt-2">
        <label v-for="option in priceOptions" :key="option.value" class="flex min-h-8 items-center gap-2 text-body-sm text-text-secondary">
          <input
            type="radio"
            name="product-price-range"
            class="size-4 accent-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :checked="props.filters.priceRange === option.value"
            @change="updatePriceRange(option.value)"
          />
          {{ option.label }}
        </label>
      </div>
    </details>

    <details class="group border-b border-border py-3">
      <summary class="flex min-h-10 cursor-pointer list-none items-center justify-between text-body-sm font-semibold">
        Nhu cầu
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="grid gap-2 pt-2">
        <label v-for="concern in concernFilterOptions" :key="concern.id" class="flex min-h-8 items-center justify-between gap-2 text-body-sm text-text-secondary">
          <span class="flex items-center gap-2">
            <input
              type="checkbox"
              class="size-4 rounded border-input accent-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :checked="props.filters.concernIds.includes(concern.id)"
              @change="toggleStringFilter('concernIds', concern.id)"
            />
            {{ concern.label }}
          </span>
          <span class="text-caption text-text-muted">{{ concern.count }}</span>
        </label>
      </div>
    </details>

    <details class="group border-b border-border py-3">
      <summary class="flex min-h-10 cursor-pointer list-none items-center justify-between text-body-sm font-semibold">
        Đánh giá
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="grid gap-2 pt-2">
        <label v-for="rating in [4.5, 4]" :key="rating" class="flex min-h-8 items-center gap-2 text-body-sm text-text-secondary">
          <input
            type="radio"
            name="product-minimum-rating"
            class="size-4 accent-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :checked="props.filters.minimumRating === rating"
            @change="updateRating(rating)"
          />
          Từ {{ rating }} sao
        </label>
        <label class="flex min-h-8 items-center gap-2 text-body-sm text-text-secondary">
          <input
            type="radio"
            name="product-minimum-rating"
            class="size-4 accent-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :checked="props.filters.minimumRating === null"
            @change="updateRating(null)"
          />
          Tất cả đánh giá
        </label>
      </div>
    </details>

    <details class="group py-3">
      <summary class="flex min-h-10 cursor-pointer list-none items-center justify-between text-body-sm font-semibold">
        Ưu đãi và trạng thái
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="grid gap-2 pt-2">
        <label v-for="option in highlightOptions" :key="option.value" class="flex min-h-8 items-center gap-2 text-body-sm text-text-secondary">
          <input
            type="checkbox"
            class="size-4 rounded border-input accent-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :checked="props.filters.highlights.includes(option.value)"
            @change="toggleHighlight(option.value)"
          />
          {{ option.label }}
        </label>
        <label class="flex min-h-8 items-center gap-2 text-body-sm text-text-secondary">
          <input
            type="checkbox"
            class="size-4 rounded border-input accent-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            :checked="props.filters.inStockOnly"
            @change="updateStock(($event.target as HTMLInputElement).checked)"
          />
          Chỉ xem sản phẩm còn hàng
        </label>
      </div>
    </details>
  </div>
</template>
