<script setup lang="ts">
import { ChevronRight, Droplets, PackageSearch } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ProductBrandSlider from '@/components/products/ProductBrandSlider.vue'
import ProductCategoryProductSlider from '@/components/products/ProductCategoryProductSlider.vue'
import type {
  ProductCategory,
  ProductCategoryBrand,
  ProductCategorySummary,
  ProductListingBanner,
} from '@/types/products'
import { cn } from '@/utils/cn'

const props = defineProps<{
  banner: ProductListingBanner
  brands: readonly ProductCategoryBrand[]
  categories: readonly ProductCategory[]
  summary: ProductCategorySummary
  selectedCategoryIds: readonly string[]
}>()

const enhancementsReady = ref(false)
let enhancementFrame: number | undefined

defineEmits<{
  toggleCategory: [categoryId: string]
}>()

const quickCategories = computed(() =>
  props.summary.quickFilterIds
    .map((categoryId) => props.categories.find((category) => category.id === categoryId))
    .filter((category): category is ProductCategory => category !== undefined),
)

onMounted(() => {
  if (typeof window.requestAnimationFrame === 'function') {
    enhancementFrame = window.requestAnimationFrame(() => {
      enhancementFrame = window.requestAnimationFrame(() => {
        enhancementsReady.value = true
      })
    })
    return
  }

  enhancementsReady.value = true
})

onBeforeUnmount(() => {
  if (enhancementFrame !== undefined && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(enhancementFrame)
  }
})
</script>

<template>
  <section aria-labelledby="product-listing-heading">
    <nav aria-label="Đường dẫn trang" class="flex flex-wrap items-center gap-1.5 text-caption text-text-secondary">
      <RouterLink to="/home" class="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        Trang chủ
      </RouterLink>
      <ChevronRight class="size-3.5" aria-hidden="true" />
      <span>Sản phẩm</span>
      <ChevronRight class="size-3.5" aria-hidden="true" />
      <span aria-current="page" class="font-medium text-primary-800">Chăm sóc da</span>
    </nav>

    <div class="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
      <div
        class="flex min-w-0 flex-col rounded-2xl border border-border bg-surface px-5 py-5 shadow-xs sm:px-6 sm:py-6"
        data-category-summary
      >
        <div class="flex items-center gap-2 text-primary-700">
          <Droplets class="size-4" aria-hidden="true" />
          <p class="text-caption font-semibold uppercase tracking-[0.14em]">
            Danh mục sản phẩm
          </p>
        </div>
        <h1 id="product-listing-heading" class="mt-3 text-heading-2" data-visible-label="Chăm sóc da">
          <span class="sr-only">Sản phẩm </span><span class="capitalize">{{ props.summary.name }}</span>
        </h1>
        <p class="mt-2 line-clamp-3 text-body-sm text-text-secondary">
          {{ props.summary.description }}
        </p>
        <p
          class="mt-4 inline-flex items-center gap-2 text-body-sm font-medium text-primary-800"
          data-category-result-count
        >
          <PackageSearch class="size-4" aria-hidden="true" />
          {{ props.summary.resultCount }} sản phẩm minh họa
        </p>

        <ProductCategoryProductSlider
          v-if="enhancementsReady"
          :products="props.summary.previewProducts"
        />

        <div class="mt-auto flex max-w-full gap-2 overflow-x-auto pb-1 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            v-for="category in quickCategories"
            :key="category.id"
            type="button"
            data-quick-category-filter
            :aria-pressed="props.selectedCategoryIds.includes(category.id)"
            :class="cn(
              'motion-interactive min-h-9 shrink-0 rounded-pill border px-3.5 text-body-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              props.selectedCategoryIds.includes(category.id)
                ? 'border-primary-700 bg-primary-800 text-primary-foreground'
                : 'border-border bg-background text-text-secondary hover:border-primary-200 hover:text-primary-900',
            )"
            @click="$emit('toggleCategory', category.id)"
          >
            {{ category.label }}
          </button>
        </div>
      </div>

      <ProductBrandSlider v-if="enhancementsReady" :brands="props.brands" />
    </div>
  </section>
</template>
