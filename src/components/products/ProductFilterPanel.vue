<script setup lang="ts">
import { ChevronDown, RotateCcw } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import type { ProductContentState, ProductFilterState, ProductPriceRange } from '@/types/products'

interface CategoryOption { id: string; label: string; children: readonly CategoryOption[] }
interface BrandOption { id: string; label: string; slug?: string }

const featuredBrandSlugs = [
  'bioderma', 'paulas-choice', 'beplain', 'la-roche-posay', 'cerave', 'cocoon', 'dhc',
  'eucerin', 'garnier', 'anessa', 'avene', 'klairs', 'vichy', 'loreal-paris',
  'maybelline', 'svr', 'cetaphil', 'cosrx', '3ce', 'the-ordinary',
] as const

const props = withDefaults(defineProps<{
  filters: ProductFilterState
  categories: readonly CategoryOption[]
  brands: readonly BrandOption[]
  optionsState: ProductContentState
  showReset?: boolean
  resetDisabled?: boolean
}>(), { showReset: true })

const emit = defineEmits<{ update: [filters: ProductFilterState]; reset: []; retryOptions: [] }>()
const expandedCategoryIds = ref<ReadonlySet<string>>(new Set())
const visibleCategories = computed(() => {
  const result: Array<CategoryOption & { depth: number }> = []
  const visit = (items: readonly CategoryOption[], depth: number): void => {
    items.forEach((item) => {
      result.push({ ...item, depth })
      if (expandedCategoryIds.value.has(item.id)) visit(item.children, depth + 1)
    })
  }
  visit(props.categories, 0)
  return result
})
function normalizedBrandSlug(brand: BrandOption): string {
  if (brand.slug) return brand.slug.trim().toLocaleLowerCase()
  return brand.label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const visibleBrands = computed(() => {
  const featured = featuredBrandSlugs.flatMap((slug) => {
    const compactSlug = slug.replaceAll('-', '')
    const brand = props.brands.find((candidate) => {
      const candidateSlug = normalizedBrandSlug(candidate)
      return candidateSlug === slug || candidateSlug.replaceAll('-', '') === compactSlug
    })
    return brand ? [brand] : []
  })
  const selected = props.brands.filter((brand) => props.filters.brandIds.includes(brand.id))
  return [...new Map([...selected, ...featured].map((brand) => [brand.id, brand])).values()]
})
const priceOptions: readonly { value: ProductPriceRange; label: string }[] = [
  { value: 'all', label: 'Tất cả mức giá' }, { value: 'under-200', label: 'Dưới 200.000 ₫' },
  { value: '200-500', label: '200.000 ₫ – 500.000 ₫' }, { value: '500-1000', label: '500.000 ₫ – 1.000.000 ₫' },
  { value: 'over-1000', label: 'Trên 1.000.000 ₫' },
]

function selectSingleFilter(field: 'categoryIds' | 'brandIds', id: string): void {
  const values = props.filters[field]
  emit('update', { ...props.filters, [field]: values.includes(id) ? [] : [id] })
}
function toggleCategoryExpansion(id: string): void {
  const next = new Set(expandedCategoryIds.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  expandedCategoryIds.value = next
}
function selectedAncestors(items: readonly CategoryOption[], ancestors: readonly string[] = []): string[] {
  for (const item of items) {
    if (props.filters.categoryIds.includes(item.id)) return [...ancestors, ...(item.children.length ? [item.id] : [])]
    const nested = selectedAncestors(item.children, [...ancestors, item.id])
    if (nested.length) return nested
  }
  return []
}
watch([() => props.categories, () => props.filters.categoryIds], () => {
  const required = selectedAncestors(props.categories)
  if (required.length) expandedCategoryIds.value = new Set([...expandedCategoryIds.value, ...required])
}, { immediate: true, deep: true })
function updatePriceRange(value: ProductPriceRange): void { emit('update', { ...props.filters, priceRange: value }) }
</script>

<template>
  <div class="grid min-w-0 gap-2 overflow-visible" data-testid="product-filter-panel">
    <div v-if="props.showReset" class="mb-2 flex items-center justify-between gap-3">
      <h2 class="text-heading-4">Bộ lọc</h2>
      <button type="button" class="motion-interactive inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-body-sm font-medium text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-45" :disabled="props.resetDisabled" @click="$emit('reset')">
        <RotateCcw class="size-3.5" aria-hidden="true" /> Đặt lại
      </button>
    </div>

    <details class="group border-b border-border pb-3">
      <summary class="flex min-h-10 cursor-pointer list-none items-center justify-between text-body-sm font-semibold">Danh mục <ChevronDown class="size-4 transition-transform group-open:rotate-180" /></summary>
      <div class="grid min-w-0 gap-1 overflow-visible pt-2" data-category-filter-tree>
        <p v-if="props.optionsState === 'loading'" class="text-body-sm text-text-secondary">Đang tải danh mục…</p>
        <div v-else-if="props.optionsState === 'error'" class="grid gap-2"><p class="text-body-sm text-text-secondary">Chưa thể tải danh mục.</p><button type="button" class="justify-self-start text-body-sm font-semibold text-primary-800" @click="$emit('retryOptions')">Thử lại</button></div>
        <template v-else>
          <p v-if="visibleCategories.length === 0" class="text-body-sm text-text-secondary">Chưa có danh mục.</p>
          <div v-for="category in visibleCategories" :key="category.id" class="flex min-h-9 items-center gap-1" :style="{ paddingLeft: `${Math.min(category.depth, 3) * 0.75}rem` }" :data-category-depth="category.depth">
            <label class="flex min-w-0 flex-1 items-center gap-2 text-body-sm text-text-secondary"><input type="checkbox" class="size-4 shrink-0 rounded border-input accent-primary-800" :checked="props.filters.categoryIds.includes(category.id)" :aria-label="`Lọc theo danh mục ${category.label}`" @change="selectSingleFilter('categoryIds', category.id)"><span class="truncate">{{ category.label }}</span></label>
            <button v-if="category.children.length" type="button" class="motion-interactive grid size-8 shrink-0 place-items-center rounded-lg text-primary-700 hover:bg-primary-50" :aria-label="`${expandedCategoryIds.has(category.id) ? 'Thu gọn' : 'Mở rộng'} danh mục ${category.label}`" :aria-expanded="expandedCategoryIds.has(category.id)" @click="toggleCategoryExpansion(category.id)"><ChevronDown class="size-4 transition-transform" :class="expandedCategoryIds.has(category.id) && 'rotate-180'" /></button>
          </div>
        </template>
      </div>
    </details>

    <details class="group border-b border-border py-3">
      <summary class="flex min-h-10 cursor-pointer list-none items-center justify-between text-body-sm font-semibold">Thương hiệu phổ biến <ChevronDown class="size-4 transition-transform group-open:rotate-180" /></summary>
      <div class="grid min-w-0 gap-1 overflow-visible pt-2" data-brand-filter-list>
        <p v-if="props.optionsState === 'loading'" class="text-body-sm text-text-secondary">Đang tải thương hiệu…</p>
        <div v-else-if="props.optionsState === 'error'" class="grid gap-2"><p class="text-body-sm text-text-secondary">Chưa thể tải thương hiệu.</p><button type="button" class="justify-self-start text-body-sm font-semibold text-primary-800" @click="$emit('retryOptions')">Thử lại</button></div>
        <template v-else><p v-if="visibleBrands.length === 0" class="text-body-sm text-text-secondary">Chưa có thương hiệu.</p><label v-for="brand in visibleBrands" :key="brand.id" class="flex min-h-8 items-center gap-2 text-body-sm text-text-secondary" :data-brand-filter-id="brand.id"><input type="checkbox" class="size-4 rounded border-input accent-primary-800" :checked="props.filters.brandIds.includes(brand.id)" :aria-label="`Lọc theo thương hiệu ${brand.label}`" @change="selectSingleFilter('brandIds', brand.id)">{{ brand.label }}</label></template>
      </div>
    </details>

    <details class="group py-3">
      <summary class="flex min-h-10 cursor-pointer list-none items-center justify-between text-body-sm font-semibold">Khoảng giá <ChevronDown class="size-4 transition-transform group-open:rotate-180" /></summary>
      <div class="grid gap-2 pt-2"><label v-for="option in priceOptions" :key="option.value" class="flex min-h-8 items-center gap-2 text-body-sm text-text-secondary"><input type="radio" name="product-price-range" class="size-4 accent-primary-800" :checked="props.filters.priceRange === option.value" @change="updatePriceRange(option.value)">{{ option.label }}</label></div>
    </details>
  </div>
</template>

<style scoped>
:global([data-testid='desktop-product-filters']) {
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}

:global([data-testid='desktop-product-filters']::-webkit-scrollbar) {
  display: none;
  width: 0;
  height: 0;
}
</style>
