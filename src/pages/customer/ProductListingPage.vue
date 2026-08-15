<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ProductFilterDialog,
  ProductFilterPanel,
  ProductListingGrid,
  ProductListingHero,
  ProductListingToolbar,
  ProductSuggestions,
} from '@/components/products'
import type { ProductListingRequest } from '@/api/productListingApi'
import { resolveCatalogAsset } from '@/api/productListingAdapter'
import { ROUTE_NAMES } from '@/constants/routes'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import { useToast } from '@/components/common/toast'
import {
  useProductDiscoveryQuery,
  useProductListingQuery,
} from '@/queries/productListing'
import { pinia } from '@/stores/pinia'
import { useBranchPreferenceStore } from '@/stores/branchPreference'
import { useAuthStore } from '@/stores/auth'
import { useAddCartItemMutation } from '@/queries/cart'
import {
  useAddFavoriteMutation,
  useCustomerFavoritesQuery,
  useRemoveFavoriteMutation,
} from '@/queries/favorites'
import type {
  ProductBackendSort,
  ProductContentState,
  ProductFilterState,
  ProductListingProduct,
  ProductSortKey,
  ProductSortOption,
} from '@/types/products'

const PER_PAGE = 24
const SUPPORTED_SORTS: readonly ProductBackendSort[] = [
  'newest',
  'price_asc',
  'price_desc',
  'rating',
  'name',
]
const listingSortOptions: readonly ProductSortOption[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'rating', label: 'Đánh giá' },
  { value: 'name', label: 'Tên sản phẩm' },
]
interface FilterCategoryOption {
  id: string
  label: string
  children: FilterCategoryOption[]
}

interface FilterBrandOption {
  id: string
  label: string
}

interface BrandConveyorItem {
  id: string
  name: string
  logoUrl?: string
}

type ActiveFilterKey = 'keyword' | 'category' | 'brand' | 'in_stock' | 'sort'

interface ActiveFilterChip {
  key: ActiveFilterKey
  label: string
}

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis'

const route = useRoute()
const router = useRouter()
const branchStore = useBranchPreferenceStore(pinia)
const authStore = useAuthStore(pinia)
const { toast } = useToast()
const favoriteUserId = computed(() => authStore.role === 'customer' ? authStore.user?.id ?? null : null)
const addCartMutation = useAddCartItemMutation(computed(() => authStore.user?.id ?? null))
const favoritesQuery = useCustomerFavoritesQuery(favoriteUserId)
const addFavoriteMutation = useAddFavoriteMutation(favoriteUserId)
const removeFavoriteMutation = useRemoveFavoriteMutation(favoriteUserId)
const cartFeedback = ref('')
const favoriteFeedback = ref('')
const mobileFilterOpen = ref(false)

branchStore.restore()

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstQueryValue(value[0])
  return typeof value === 'string' ? value : undefined
}

function positiveInteger(value: unknown): number | undefined {
  const rawValue = firstQueryValue(value)
  if (!rawValue || !/^\d+$/.test(rawValue)) return undefined
  const parsedValue = Number(rawValue)
  return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined
}

function parseSort(value: unknown): ProductBackendSort {
  const candidate = firstQueryValue(value)
  return SUPPORTED_SORTS.includes(candidate as ProductBackendSort)
    ? candidate as ProductBackendSort
    : 'newest'
}

const keyword = computed(() => firstQueryValue(route.query.keyword)?.trim() || undefined)
const categoryId = computed(() => positiveInteger(route.query.category_id))
const brandId = computed(() => positiveInteger(route.query.brand_id))
const currentPage = computed(() => positiveInteger(route.query.page) ?? 1)
const inStockOnly = computed(() => {
  const value = firstQueryValue(route.query.in_stock)
  return value === '1' || value === 'true'
})
const sort = computed<ProductBackendSort>(() => parseSort(route.query.sort))

const request = computed<ProductListingRequest>(() => ({
  ...(keyword.value ? { keyword: keyword.value } : {}),
  ...(categoryId.value ? { category_id: categoryId.value } : {}),
  ...(brandId.value ? { brand_id: brandId.value } : {}),
  ...(branchStore.selectedBranchId ? { branch_id: branchStore.selectedBranchId } : {}),
  ...(inStockOnly.value ? { in_stock: true } : {}),
  sort: sort.value,
  page: currentPage.value,
  per_page: PER_PAGE,
}))
const listingReady = computed(
  () => branchStore.status === 'success' || branchStore.status === 'error',
)
const listingQuery = useProductListingQuery(request, listingReady)
const discoveryQuery = useProductDiscoveryQuery()

const rootCategories = computed(() => discoveryQuery.data.value?.categories ?? [])
const discoveryBrands = computed(() => {
  const brands = discoveryQuery.data.value?.brands ?? []
  const selected = brands.find((brand) => brand.id === brandId.value)
  const withLogos = brands.filter((brand) => brand.logo && brand.name !== '9Wishes')
  return [...new Map(
    [selected, ...withLogos]
      .filter((brand): brand is NonNullable<typeof brand> => brand !== undefined && brand.name !== '9Wishes' && Boolean(brand.logo))
      .map((brand) => [brand.id, brand]),
  ).values()].slice(0, 15)
})
const suggestionRequest = computed<ProductListingRequest>(() => ({
  ...(branchStore.selectedBranchId ? { branch_id: branchStore.selectedBranchId } : {}),
  sort: 'rating',
  page: 1,
  per_page: 8,
}))
const suggestionsQuery = useProductListingQuery(suggestionRequest, listingReady)

const products = computed(() => listingQuery.data.value?.products ?? [])
const favoriteIds = computed<ReadonlySet<string>>(
  () => new Set((favoritesQuery.data.value ?? []).map((favorite) => String(favorite.productId))),
)
const favoritePending = computed(
  () => addFavoriteMutation.isPending.value || removeFavoriteMutation.isPending.value,
)
const pagination = computed(() => listingQuery.data.value?.pagination ?? {
  currentPage: currentPage.value,
  perPage: PER_PAGE,
  total: 0,
  lastPage: 1,
})
const contentState = computed<ProductContentState>(() => {
  if (listingQuery.isPending.value || !listingReady.value) return 'loading'
  if (listingQuery.isError.value) return 'error'
  return products.value.length === 0 ? 'empty' : 'success'
})
const filters = computed<ProductFilterState>(() => ({
  categoryIds: categoryId.value ? [String(categoryId.value)] : [],
  brandIds: brandId.value ? [String(brandId.value)] : [],
  concernIds: [],
  priceRange: 'all',
  minimumRating: null,
  highlights: [],
  inStockOnly: inStockOnly.value,
}))
const filterCategories = computed<FilterCategoryOption[]>(() => {
  const mapCategory = (category: (typeof rootCategories.value)[number]): FilterCategoryOption => ({
    id: String(category.id),
    label: category.name,
    children: category.children.map(mapCategory),
  })
  return rootCategories.value.map(mapCategory)
})
const filterBrands = computed<FilterBrandOption[]>(() => (
  discoveryQuery.data.value?.brands ?? []
).map((brand) => ({ id: String(brand.id), label: brand.name })))
const productBrandPromotions = computed<BrandConveyorItem[]>(() => (
  discoveryBrands.value.map((brand) => ({
    id: String(brand.id),
    name: brand.name,
    logoUrl: resolveCatalogAsset(brand.logo),
  }))
))
const selectedCategoryLabel = computed(() => {
  const findLabel = (categories: readonly FilterCategoryOption[]): string | undefined => {
    for (const category of categories) {
      if (category.id === String(categoryId.value)) return category.label
      const nested = findLabel(category.children)
      if (nested) return nested
    }
    return undefined
  }
  return findLabel(filterCategories.value)
})
const selectedBrandLabel = computed(
  () => filterBrands.value.find((brand) => brand.id === String(brandId.value))?.label,
)
const activeFilterChips = computed<ActiveFilterChip[]>(() => {
  const chips: ActiveFilterChip[] = []
  if (keyword.value) chips.push({ key: 'keyword', label: keyword.value })
  if (categoryId.value) {
    chips.push({ key: 'category', label: selectedCategoryLabel.value ?? 'Danh mục đã chọn' })
  }
  if (brandId.value) {
    chips.push({ key: 'brand', label: selectedBrandLabel.value ?? 'Thương hiệu đã chọn' })
  }
  if (inStockOnly.value) chips.push({ key: 'in_stock', label: 'Còn hàng' })
  if (sort.value !== 'newest') {
    const sortLabel = listingSortOptions.find((option) => option.value === sort.value)?.label
    if (sortLabel) chips.push({ key: 'sort', label: sortLabel })
  }
  return chips
})
const activeFilterCount = computed(() => activeFilterChips.value.length)
const resetDisabled = computed(
  () => activeFilterChips.value.length === 0 && currentPage.value === 1,
)
const suggestions = computed(() => suggestionsQuery.data.value?.products ?? [])
const suggestionsState = computed<ProductContentState>(() => {
  if (suggestionsQuery.isPending.value || !listingReady.value) return 'loading'
  if (suggestionsQuery.isError.value) return 'error'
  return suggestions.value.length === 0 ? 'empty' : 'success'
})
const discoveryState = computed<ProductContentState>(() => {
  if (discoveryQuery.isPending.value) return 'loading'
  if (discoveryQuery.isError.value) return 'error'
  return rootCategories.value.length === 0 || filterBrands.value.length === 0 ? 'empty' : 'success'
})
const paginationItems = computed<PaginationItem[]>(() => {
  const lastPage = Math.max(1, pagination.value.lastPage)
  const activePage = Math.min(Math.max(1, pagination.value.currentPage), lastPage)
  if (lastPage <= 7) return Array.from({ length: lastPage }, (_, index) => index + 1)

  const pages = [...new Set([1, lastPage, activePage - 1, activePage, activePage + 1])]
    .filter((page) => page >= 1 && page <= lastPage)
    .sort((left, right) => left - right)
  const items: PaginationItem[] = []
  pages.forEach((page, index) => {
    const previous = pages[index - 1]
    if (previous !== undefined && page - previous > 1) {
      items.push(previous === 1 ? 'start-ellipsis' : 'end-ellipsis')
    }
    items.push(page)
  })
  return items
})

function numericFilterId(values: readonly string[]): string | undefined {
  const value = values.find((candidate) => /^\d+$/.test(candidate) && Number(candidate) > 0)
  return value
}

async function updateRouteQuery(
  changes: Record<string, string | undefined>,
  scrollTarget: 'preserve' | 'results' = 'preserve',
): Promise<void> {
  const nextQuery = { ...route.query }
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) delete nextQuery[key]
    else nextQuery[key] = value
  }
  const location = { name: ROUTE_NAMES.products, query: nextQuery }
  if (router.resolve(location).fullPath === route.fullPath) return

  const preservedScrollY = typeof window === 'undefined' ? 0 : window.scrollY
  const defaultScrollBehavior = router.options.scrollBehavior
  router.options.scrollBehavior = () => false
  try {
    await router.push(location)
  } finally {
    router.options.scrollBehavior = defaultScrollBehavior
  }
  await nextTick()

  if (scrollTarget === 'results') {
    document.getElementById('product-results-heading')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  } else if (preservedScrollY > 0 && Math.abs(window.scrollY - preservedScrollY) > 1) {
    window.scrollTo({ top: preservedScrollY, behavior: 'auto' })
  }
}

function updateFilters(nextFilters: ProductFilterState): void {
  void updateRouteQuery({
    category_id: numericFilterId(nextFilters.categoryIds),
    brand_id: numericFilterId(nextFilters.brandIds),
    in_stock: nextFilters.inStockOnly ? '1' : undefined,
    page: '1',
  })
}

function resetFilters(): void {
  void updateRouteQuery({
    keyword: undefined,
    category_id: undefined,
    brand_id: undefined,
    in_stock: undefined,
    sort: undefined,
    page: '1',
  })
}

function removeFilterChip(key: ActiveFilterKey): void {
  const queryKey = key === 'category'
    ? 'category_id'
    : key === 'brand'
      ? 'brand_id'
      : key
  void updateRouteQuery({ [queryKey]: undefined, page: '1' })
}

function toggleBrand(brand: string): void {
  if (!/^\d+$/.test(brand)) return
  void updateRouteQuery({
    brand_id: brandId.value === Number(brand) ? undefined : brand,
    page: '1',
  })
}

function updateSort(nextSort: ProductSortKey): void {
  const normalizedSort = SUPPORTED_SORTS.includes(nextSort as ProductBackendSort)
    ? nextSort as ProductBackendSort
    : 'newest'
  void updateRouteQuery({ sort: normalizedSort, page: '1' })
}

function goToPage(page: number): void {
  const normalizedPage = Math.min(Math.max(1, page), pagination.value.lastPage)
  if (normalizedPage === pagination.value.currentPage) return
  void updateRouteQuery({ page: String(normalizedPage) }, 'results')
}

function openProductDetail(product: ProductListingProduct): void {
  void router.push({
    name: ROUTE_NAMES.productDetail,
    params: { slug: product.slug },
  })
}

async function addListingProductToCart(product: ProductListingProduct): Promise<void> {
  if (!product.defaultVariantId) return
  if (!authStore.isAuthenticated || authStore.role !== 'customer') {
    await router.push({ name: ROUTE_NAMES.login, query: { redirect: route.fullPath } })
    return
  }
  cartFeedback.value = ''
  try {
    await addCartMutation.mutateAsync({ productVariantId: product.defaultVariantId, quantity: 1 })
    toast({ title: 'Đã thêm sản phẩm vào giỏ hàng.', variant: 'success' })
  } catch (error: unknown) {
    cartFeedback.value = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Không thể thêm sản phẩm vào giỏ hàng.'
  }
}

async function toggleListingFavorite(product: ProductListingProduct): Promise<void> {
  if (!authStore.isAuthenticated || authStore.role !== 'customer') {
    await router.push({ name: ROUTE_NAMES.login, query: { redirect: route.fullPath } })
    return
  }

  const productId = Number(product.id)
  if (!Number.isSafeInteger(productId) || productId <= 0 || favoritePending.value) return

  favoriteFeedback.value = ''
  const removing = favoriteIds.value.has(product.id)
  try {
    if (removing) await removeFavoriteMutation.mutateAsync(productId)
    else await addFavoriteMutation.mutateAsync(productId)
    toast({
      title: removing ? 'Đã bỏ sản phẩm khỏi yêu thích.' : 'Đã thêm sản phẩm vào yêu thích.',
      variant: 'success',
    })
  } catch (error: unknown) {
    favoriteFeedback.value = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Không thể cập nhật danh sách yêu thích.'
  }
}

watch(
  () => listingQuery.data.value?.pagination.lastPage,
  (lastPage) => {
    if (lastPage && currentPage.value > lastPage) {
      void router.replace({
        name: ROUTE_NAMES.products,
        query: { ...route.query, page: String(lastPage) },
      })
    }
  },
)

watch(
  () => branchStore.selectedBranchId,
  (nextBranchId, previousBranchId) => {
    if (previousBranchId !== null && nextBranchId !== previousBranchId && currentPage.value !== 1) {
      void updateRouteQuery({ page: '1' })
    }
  },
)
</script>

<template>
  <CustomerLayout>
    <div class="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-5 md:py-7 lg:px-7">
      <ProductListingHero
        :brands="productBrandPromotions"
        :selected-brand-id="brandId ? String(brandId) : undefined"
        @select-brand="toggleBrand"
      />

      <section
        id="product-results"
        class="mt-10 scroll-mt-6"
        aria-labelledby="product-results-heading"
      >
        <div class="mb-5">
          <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">
            Chọn đúng sản phẩm, mua sắm thuận tiện
          </p>
          <h2 id="product-results-heading" class="mt-1 text-heading-2">Khám phá sản phẩm</h2>
        </div>

        <div class="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside
            class="sticky top-36 hidden max-h-[calc(100svh-10rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-4 shadow-xs lg:block"
            aria-label="Bộ lọc sản phẩm desktop"
            data-testid="desktop-product-filters"
          >
            <ProductFilterPanel
              :filters="filters"
              :categories="filterCategories"
              :brands="filterBrands"
              :options-state="discoveryState"
              :reset-disabled="resetDisabled"
              @update="updateFilters"
              @reset="resetFilters"
              @retry-options="discoveryQuery.refetch()"
            />
          </aside>

          <div class="min-w-0">
            <div
              v-if="activeFilterChips.length > 0"
              class="mb-3 flex flex-wrap items-center gap-2"
              aria-label="Bộ lọc đang áp dụng"
              data-testid="active-filter-chips"
            >
              <button
                v-for="chip in activeFilterChips"
                :key="chip.key"
                type="button"
                class="motion-interactive inline-flex min-h-9 items-center gap-1 rounded-pill border border-primary-200 bg-primary-50 px-3 text-body-sm font-medium text-primary-900 hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                :aria-label="'Xóa bộ lọc ' + chip.label"
                :data-filter-chip="chip.key"
                @click="removeFilterChip(chip.key)"
              >
                {{ chip.label }}
                <span aria-hidden="true">×</span>
              </button>
              <button
                type="button"
                class="motion-interactive min-h-9 rounded-pill px-3 text-body-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                data-testid="clear-all-product-filters"
                @click="resetFilters"
              >
                Xóa tất cả
              </button>
            </div>

            <ProductListingToolbar
              :result-count="pagination.total"
              :active-filter-count="activeFilterCount"
              :sort-options="listingSortOptions"
              :sort="sort"
              @open-filters="mobileFilterOpen = true"
              @update-sort="updateSort"
            />

            <div class="relative mt-5" aria-live="polite">
              <ProductListingGrid
                :products="products"
                :state="contentState"
                :favorite-ids="favoriteIds"
                :favorite-pending="favoritePending"
                @retry="listingQuery.refetch()"
                @select="openProductDetail"
                @add-to-cart="addListingProductToCart"
                @toggle-favorite="toggleListingFavorite"
              />
              <p v-if="cartFeedback" class="mt-3 text-body-sm text-primary-800" role="status">{{ cartFeedback }}</p>
              <p v-if="favoriteFeedback" class="mt-3 text-body-sm text-[#923b37]" role="alert">{{ favoriteFeedback }}</p>
              <div
                v-if="listingQuery.isFetching.value && products.length > 0"
                class="pointer-events-none absolute inset-0 rounded-2xl bg-background/35 backdrop-blur-[1px]"
                data-testid="product-results-refreshing"
                aria-label="Đang cập nhật kết quả sản phẩm"
              />
            </div>

            <nav
              v-if="pagination.lastPage > 1"
              class="mt-7 flex flex-wrap items-center justify-center gap-2"
              aria-label="Phân trang sản phẩm"
              data-testid="product-pagination"
            >
              <button
                type="button"
                class="motion-interactive min-h-10 rounded-xl border border-border bg-surface px-3 text-body-sm font-semibold text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="pagination.currentPage <= 1 || listingQuery.isFetching.value"
                aria-label="Trang trước"
                @click="goToPage(pagination.currentPage - 1)"
              >
                Trước
              </button>
              <template v-for="item in paginationItems" :key="item">
                <span v-if="typeof item !== 'number'" class="px-1 text-text-muted" aria-hidden="true">…</span>
                <button
                  v-else
                  type="button"
                  :aria-label="`Trang ${item}`"
                  :aria-current="pagination.currentPage === item ? 'page' : undefined"
                  :disabled="pagination.currentPage === item || listingQuery.isFetching.value"
                  class="motion-interactive grid size-10 place-items-center rounded-xl border border-border bg-surface text-body-sm font-semibold text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-current:border-primary-800 aria-current:bg-primary-800 aria-current:text-primary-foreground disabled:cursor-default"
                  @click="goToPage(item)"
                >
                  {{ item }}
                </button>
              </template>
              <button
                type="button"
                class="motion-interactive min-h-10 rounded-xl border border-border bg-surface px-3 text-body-sm font-semibold text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="pagination.currentPage >= pagination.lastPage || listingQuery.isFetching.value"
                aria-label="Trang sau"
                @click="goToPage(pagination.currentPage + 1)"
              >
                Sau
              </button>
            </nav>
          </div>
        </div>
      </section>

      <ProductSuggestions
        class="my-12"
        :products="suggestions"
        :state="suggestionsState"
        :favorite-ids="favoriteIds"
        :favorite-pending="favoritePending"
        @retry="suggestionsQuery.refetch()"
        @toggle-favorite="toggleListingFavorite"
      />
    </div>

    <ProductFilterDialog
      v-model="mobileFilterOpen"
      :filters="filters"
      :categories="filterCategories"
      :brands="filterBrands"
      :options-state="discoveryState"
      :result-count="pagination.total"
      :reset-disabled="resetDisabled"
      @apply="updateFilters"
      @reset="resetFilters"
      @retry-options="discoveryQuery.refetch()"
    />
  </CustomerLayout>
</template>
