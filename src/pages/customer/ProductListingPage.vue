<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ProductFeaturedCategories,
  ProductFilterDialog,
  ProductFilterPanel,
  ProductListingGrid,
  ProductListingHero,
  ProductListingToolbar,
  ProductSuggestions,
} from '@/components/products'
import {
  defaultProductFilters,
  featuredProductCategories,
  productBrandPromotions,
  productCategories,
  productCategorySummary,
  productListingBanner,
  productListingProducts,
  productSortOptions,
  suggestedProducts,
} from '@/data/products/productListingDemoData'
import { ROUTE_NAMES } from '@/constants/routes'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import type {
  ProductFilterState,
  ProductListingProduct,
  ProductPriceRange,
  ProductSortKey,
} from '@/types/products'

const INITIAL_VISIBLE_COUNT = 12
const LOAD_MORE_COUNT = 8
const router = useRouter()

const filters = ref<ProductFilterState>({ ...defaultProductFilters })
const sort = ref<ProductSortKey>('popular')
const visibleCount = ref(INITIAL_VISIBLE_COUNT)
const mobileFilterOpen = ref(false)

function matchesPriceRange(price: number, range: ProductPriceRange): boolean {
  if (range === 'under-200') return price < 200_000
  if (range === '200-500') return price >= 200_000 && price <= 500_000
  if (range === '500-1000') return price > 500_000 && price <= 1_000_000
  if (range === 'over-1000') return price > 1_000_000
  return true
}

function matchesFilters(product: ProductListingProduct): boolean {
  const currentFilters = filters.value
  const categoryMatches = currentFilters.categoryIds.length === 0
    || currentFilters.categoryIds.includes(product.categoryId)
  const brandMatches = currentFilters.brandIds.length === 0
    || currentFilters.brandIds.includes(product.brandId)
  const concernMatches = currentFilters.concernIds.length === 0
    || currentFilters.concernIds.some((concern) => product.concernIds.includes(concern))
  const ratingMatches = currentFilters.minimumRating === null
    || (product.rating ?? 0) >= currentFilters.minimumRating
  const highlightMatches = currentFilters.highlights.every((highlight) => {
    if (highlight === 'discounted') return product.discountPercent !== undefined
    if (highlight === 'bestseller') return product.isBestseller
    return product.isNew
  })
  const stockMatches = !currentFilters.inStockOnly || product.stockState !== 'sold_out'

  return categoryMatches
    && brandMatches
    && concernMatches
    && matchesPriceRange(product.price, currentFilters.priceRange)
    && ratingMatches
    && highlightMatches
    && stockMatches
}

function sortProducts(products: readonly ProductListingProduct[]): ProductListingProduct[] {
  return [...products].sort((first, second) => {
    if (sort.value === 'price-ascending') return first.price - second.price
    if (sort.value === 'price-descending') return second.price - first.price
    if (sort.value === 'newest') return second.createdOrder - first.createdOrder
    if (sort.value === 'best-selling') return (second.soldCount ?? 0) - (first.soldCount ?? 0)
    return second.popularity - first.popularity
  })
}

const filteredProducts = computed(() =>
  sortProducts(productListingProducts.filter(matchesFilters)),
)
const visibleProducts = computed(() => filteredProducts.value.slice(0, visibleCount.value))
const hasMoreProducts = computed(() => visibleProducts.value.length < filteredProducts.value.length)
const contentState = computed(() => filteredProducts.value.length === 0 ? 'empty' as const : 'success' as const)
const activeFilterCount = computed(() => {
  const currentFilters = filters.value
  return currentFilters.categoryIds.length
    + currentFilters.brandIds.length
    + currentFilters.concernIds.length
    + currentFilters.highlights.length
    + (currentFilters.priceRange === 'all' ? 0 : 1)
    + (currentFilters.minimumRating === null ? 0 : 1)
    + (currentFilters.inStockOnly ? 1 : 0)
})

watch([filters, sort], () => {
  visibleCount.value = INITIAL_VISIBLE_COUNT
}, { deep: true })

function updateFilters(nextFilters: ProductFilterState): void {
  filters.value = nextFilters
}

function resetFilters(): void {
  filters.value = { ...defaultProductFilters }
}

function toggleCategory(categoryId: string): void {
  const categoryIds = filters.value.categoryIds
  updateFilters({
    ...filters.value,
    categoryIds: categoryIds.includes(categoryId)
      ? categoryIds.filter((id) => id !== categoryId)
      : [...categoryIds, categoryId],
  })
}

function loadMore(): void {
  visibleCount.value += LOAD_MORE_COUNT
}

function openProductDetail(product: ProductListingProduct): void {
  void router.push({
    name: ROUTE_NAMES.productDetail,
    params: { slug: product.slug },
  })
}
</script>

<template>
  <CustomerLayout>
    <div class="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-5 md:py-7 lg:px-7">
      <ProductListingHero
        :banner="productListingBanner"
        :brands="productBrandPromotions"
        :categories="productCategories"
        :summary="productCategorySummary"
        :selected-category-ids="filters.categoryIds"
        @toggle-category="toggleCategory"
      />

      <ProductFeaturedCategories class="mt-9" :categories="featuredProductCategories" />

      <section
        id="product-results"
        class="mt-10 scroll-mt-6"
        aria-labelledby="product-results-heading"
      >
        <div class="mb-5">
          <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">
            Dễ lọc, dễ chọn
          </p>
          <h2 id="product-results-heading" class="mt-1 text-heading-2">Khám phá sản phẩm</h2>
        </div>

        <div class="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside
            class="sticky top-4 hidden max-h-[calc(100svh-2rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-xs lg:block"
            aria-label="Bộ lọc sản phẩm desktop"
            data-testid="desktop-product-filters"
          >
            <ProductFilterPanel
              :filters="filters"
              @update="updateFilters"
              @reset="resetFilters"
            />
          </aside>

          <div class="min-w-0">
            <ProductListingToolbar
              :result-count="filteredProducts.length"
              :active-filter-count="activeFilterCount"
              :sort-options="productSortOptions"
              :sort="sort"
              @open-filters="mobileFilterOpen = true"
              @update-sort="sort = $event"
            />

            <ProductListingGrid
              class="mt-5"
              :products="visibleProducts"
              :state="contentState"
              @retry="resetFilters"
              @select="openProductDetail"
            />

            <div v-if="hasMoreProducts" class="mt-7 flex justify-center">
              <button
                type="button"
                class="motion-interactive min-h-11 rounded-xl border border-primary-200 bg-surface px-6 text-body-sm font-semibold text-primary-800 hover:border-primary-400 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                data-testid="load-more-products"
                @click="loadMore"
              >
                Xem thêm sản phẩm
              </button>
            </div>
          </div>
        </div>
      </section>

      <ProductSuggestions class="my-12" :products="suggestedProducts" />
    </div>

    <ProductFilterDialog
      v-model="mobileFilterOpen"
      :filters="filters"
      :result-count="filteredProducts.length"
      @apply="updateFilters"
      @reset="resetFilters"
    />
  </CustomerLayout>
</template>
