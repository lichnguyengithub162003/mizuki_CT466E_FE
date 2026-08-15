<script setup lang="ts">
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  Heart,
  MessageCircle,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import FavoriteProductCard from '@/components/favorites/FavoriteProductCard.vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import {
  useCustomerFavoritesQuery,
  useRemoveFavoriteMutation,
} from '@/queries/favorites'
import { useCustomerCartQuery } from '@/queries/cart'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import type { CustomerFavoriteStockState } from '@/types/favorites'

type FavoriteSort = 'recent' | 'price-ascending' | 'price-descending'
type FavoriteStockFilter = 'all' | CustomerFavoriteStockState

const authStore = useAuthStore(pinia)
const router = useRouter()
const favoriteUserId = computed(() =>
  authStore.role === 'customer' ? authStore.user?.id ?? null : null,
)
const favoritesQuery = useCustomerFavoritesQuery(favoriteUserId)
const removeFavoriteMutation = useRemoveFavoriteMutation(favoriteUserId)
const cartQuery = useCustomerCartQuery(
  computed(() => authStore.user?.id ?? null),
)

const filterText = ref('')
const sort = ref<FavoriteSort>('recent')
const stockFilter = ref<FavoriteStockFilter>('all')
const feedback = ref('')
const errorFeedback = ref('')
const editing = ref(false)
const selectedProductIds = ref<Set<number>>(new Set())
const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)
const visibleLimit = ref(10)
const showScrollTop = ref(false)

const favorites = computed(() => favoritesQuery.data.value ?? [])
const cartCount = computed(() => cartQuery.data.value?.items.length ?? 0)
const initialVisibleLimit = computed(() => {
  if (viewportWidth.value >= 1360) return 10
  if (viewportWidth.value >= 1024) return 8
  return 6
})

const visibleFavorites = computed(() => {
  const keyword = filterText.value.trim().toLocaleLowerCase('vi-VN')
  const nameFiltered = keyword
    ? favorites.value.filter((item) =>
        item.name.toLocaleLowerCase('vi-VN').includes(keyword),
      )
    : favorites.value
  const filtered = stockFilter.value === 'all'
    ? nameFiltered
    : nameFiltered.filter((item) => item.stockState === stockFilter.value)

  if (sort.value === 'price-ascending') {
    return [...filtered].sort(
      (first, second) => first.minimumPrice - second.minimumPrice,
    )
  }

  if (sort.value === 'price-descending') {
    return [...filtered].sort(
      (first, second) => second.minimumPrice - first.minimumPrice,
    )
  }

  return filtered
})
const displayedFavorites = computed(() =>
  visibleFavorites.value.slice(0, visibleLimit.value),
)
const allFilteredSelected = computed(() =>
  visibleFavorites.value.length > 0 &&
  visibleFavorites.value.every((item) => selectedProductIds.value.has(item.productId)),
)

watch([filterText, stockFilter, sort, initialVisibleLimit, favoriteUserId], () => {
  visibleLimit.value = initialVisibleLimit.value
  selectedProductIds.value = new Set()
})

function updateViewport(): void {
  viewportWidth.value = window.innerWidth
}

function updateScrollTopVisibility(): void {
  showScrollTop.value = window.scrollY > 480
}

onMounted(() => {
  visibleLimit.value = initialVisibleLimit.value
  window.addEventListener('resize', updateViewport, { passive: true })
  window.addEventListener('scroll', updateScrollTopVisibility, { passive: true })
  updateScrollTopVisibility()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
  window.removeEventListener('scroll', updateScrollTopVisibility)
})

async function removeFavorite(productId: number): Promise<void> {
  if (removeFavoriteMutation.isPending.value) return

  const target = favorites.value.find((item) => item.productId === productId)
  feedback.value = ''
  errorFeedback.value = ''

  try {
    await removeFavoriteMutation.mutateAsync(productId)
    feedback.value = target
      ? `Đã bỏ “${target.name}” khỏi danh sách yêu thích.`
      : 'Đã bỏ sản phẩm khỏi yêu thích.'
  } catch (error: unknown) {
    errorFeedback.value =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : 'Không thể bỏ sản phẩm khỏi danh sách yêu thích.'
  }
}

function toggleEditing(): void {
  editing.value = !editing.value
  selectedProductIds.value = new Set()
  feedback.value = ''
  errorFeedback.value = ''
}

function toggleSelection(productId: number): void {
  const next = new Set(selectedProductIds.value)
  if (next.has(productId)) next.delete(productId)
  else next.add(productId)
  selectedProductIds.value = next
}

function toggleSelectAll(): void {
  selectedProductIds.value = allFilteredSelected.value
    ? new Set()
    : new Set(visibleFavorites.value.map((item) => item.productId))
}

async function removeSelectedFavorites(): Promise<void> {
  if (removeFavoriteMutation.isPending.value || selectedProductIds.value.size === 0) return

  const targets = [...selectedProductIds.value]
  const failed = new Set<number>()
  let removedCount = 0
  feedback.value = ''
  errorFeedback.value = ''

  for (const productId of targets) {
    try {
      await removeFavoriteMutation.mutateAsync(productId)
      removedCount += 1
    } catch {
      failed.add(productId)
    }
  }

  selectedProductIds.value = failed
  if (removedCount > 0) {
    feedback.value = `Đã bỏ ${removedCount} sản phẩm khỏi danh sách yêu thích.`
  }
  if (failed.size > 0) {
    errorFeedback.value = `Không thể bỏ ${failed.size} sản phẩm. Hãy thử lại.`
  } else {
    editing.value = false
  }
}

function showMore(): void {
  visibleLimit.value += initialVisibleLimit.value
}

function collapseProducts(): void {
  visibleLimit.value = initialVisibleLimit.value
  document.querySelector('[data-favorite-toolbar]')?.scrollIntoView({ block: 'start' })
}

function scrollToTop(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}

function goBack(): void {
  if (router.options.history.state.back) {
    router.back()
    return
  }

  void router.push({ name: ROUTE_NAMES.products })
}
</script>

<template>
  <CustomerLayout compact-favorites-mobile>
    <div class="min-h-[70svh] bg-[#f7faf8]" data-favorites-page>
      <header
        class="sticky top-0 z-40 bg-primary-700 pt-[env(safe-area-inset-top)] text-white shadow-sm min-[85rem]:hidden"
        aria-label="Đầu trang sản phẩm yêu thích"
        data-favorites-mobile-header
      >
        <div class="grid h-12 grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-center px-2">
          <button
            type="button"
            class="grid size-10 place-items-center rounded-xl text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Quay lại"
            @click="goBack"
          >
            <ChevronLeft class="size-5" stroke-width="1.8" aria-hidden="true" />
          </button>

          <h1 class="truncate text-center text-body-md font-semibold text-white">
            Sản phẩm yêu thích
          </h1>

          <div class="flex items-center justify-end gap-0.5">
            <RouterLink
              :to="{ path: '/customer-shell', query: { section: 'support' } }"
              class="motion-interactive grid size-9 place-items-center rounded-lg text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Trò chuyện hỗ trợ"
            >
              <MessageCircle class="size-4.5" aria-hidden="true" />
            </RouterLink>

            <RouterLink
              :to="{ name: ROUTE_NAMES.cart }"
              class="motion-interactive relative grid size-9 place-items-center rounded-lg text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              :aria-label="`Giỏ hàng, ${cartCount} sản phẩm`"
            >
              <ShoppingBag class="size-4.5" aria-hidden="true" />
              <span
                v-if="cartCount > 0"
                class="absolute right-0.5 top-0.5 grid size-3.5 place-items-center rounded-full bg-white text-[0.5625rem] font-bold text-primary-900"
                data-favorites-cart-badge
              >
                {{ cartCount }}
              </span>
            </RouterLink>
          </div>
        </div>
      </header>

      <div class="mx-auto w-full max-w-[96rem] px-3 pb-5 sm:px-5 min-[85rem]:px-7 min-[85rem]:py-5">
        <section
          v-if="favoritesQuery.isPending.value || favorites.length"
          class="sticky top-[calc(3rem+env(safe-area-inset-top))] z-30 -mx-3 border-b border-primary-100 bg-[#f7faf8] px-3 py-2 sm:-mx-5 sm:px-5 min-[85rem]:static min-[85rem]:mx-0 min-[85rem]:rounded-2xl min-[85rem]:border min-[85rem]:bg-white min-[85rem]:p-4 min-[85rem]:shadow-xs"
          aria-label="Tìm kiếm và sắp xếp sản phẩm yêu thích"
          data-favorite-toolbar
        >
          <div
            class="flex flex-col gap-2 min-[85rem]:flex-row min-[85rem]:items-center min-[85rem]:gap-3.5"
            data-favorite-toolbar-content
          >
            <div class="hidden min-w-44 items-center gap-2 text-body-sm font-semibold text-primary-950 min-[85rem]:flex">
              <SlidersHorizontal class="size-4.5 text-primary-700" aria-hidden="true" />
              <h1>Yêu thích · {{ visibleFavorites.length }} sản phẩm</h1>
            </div>

            <label class="relative block min-w-0 min-[85rem]:ml-auto min-[85rem]:w-[min(36vw,32rem)]">
              <span class="sr-only">Tìm trong sản phẩm yêu thích</span>
              <Search
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                v-model="filterText"
                type="search"
                class="h-9 w-full rounded-xl border border-primary-200 bg-white pr-3 pl-9 text-[0.8125rem] text-primary-950 shadow-xs placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-[85rem]:h-10 min-[85rem]:text-sm"
                placeholder="Tìm trong sản phẩm yêu thích"
                data-favorite-search
              />
            </label>

            <div class="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
              <template v-if="editing">
                <span class="shrink-0 text-xs font-semibold text-primary-900 min-[85rem]:hidden">
                  {{ selectedProductIds.size }} đã chọn
                </span>
                <button
                  type="button"
                  class="motion-interactive inline-flex h-8 shrink-0 items-center rounded-lg border border-primary-200 bg-white px-3 text-xs font-semibold text-primary-800 hover:bg-primary-50 min-[85rem]:h-10 min-[85rem]:text-sm"
                  data-favorite-select-all
                  @click="toggleSelectAll"
                >
                  {{ allFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả' }}
                </button>
                <button
                  type="button"
                  class="motion-interactive inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#a33e38] px-3 text-xs font-semibold text-white hover:bg-[#87332e] disabled:cursor-not-allowed disabled:opacity-45 min-[85rem]:h-10 min-[85rem]:text-sm"
                  :disabled="selectedProductIds.size === 0 || removeFavoriteMutation.isPending.value"
                  data-favorite-remove-selected
                  @click="removeSelectedFavorites"
                >
                  <Trash2 class="size-3.5" aria-hidden="true" />
                  Xóa khỏi yêu thích
                </button>
                <button
                  type="button"
                  class="motion-interactive inline-flex h-8 shrink-0 items-center rounded-lg px-2.5 text-xs font-semibold text-primary-800 hover:bg-primary-50 min-[85rem]:h-10 min-[85rem]:text-sm"
                  data-favorite-edit-toggle
                  @click="toggleEditing"
                >
                  Xong
                </button>
              </template>

              <template v-else>
                <label class="relative shrink-0">
                  <span class="sr-only">Trạng thái</span>
                  <select
                    v-model="stockFilter"
                    class="h-8 w-28 appearance-none rounded-lg border border-primary-200 bg-white pr-7 pl-2.5 text-xs font-medium text-primary-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring min-[85rem]:h-10 min-[85rem]:w-36 min-[85rem]:rounded-xl min-[85rem]:text-sm"
                    data-favorite-stock-filter
                  >
                    <option value="all">Tất cả</option>
                    <option value="available">Còn hàng</option>
                    <option value="low-stock">Sắp hết</option>
                    <option value="sold-out">Hết hàng</option>
                    <option value="discontinued">Ngưng bán</option>
                  </select>
                  <ChevronDown
                    class="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-text-muted"
                    aria-hidden="true"
                  />
                </label>

                <label class="relative shrink-0">
                  <span class="sr-only">Sắp xếp</span>
                  <select
                    v-model="sort"
                    class="h-8 appearance-none rounded-lg border border-primary-200 bg-white pr-8 pl-3 text-xs font-medium text-primary-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring min-[85rem]:h-10 min-[85rem]:w-48 min-[85rem]:rounded-xl min-[85rem]:text-sm"
                    data-favorite-sort
                  >
                    <option value="recent">Gần đây</option>
                    <option value="price-ascending">Giá tăng dần</option>
                    <option value="price-descending">Giá giảm dần</option>
                  </select>
                  <ChevronDown
                    class="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted"
                    aria-hidden="true"
                  />
                </label>
                <button
                  type="button"
                  class="motion-interactive inline-flex h-8 shrink-0 items-center rounded-lg border border-primary-200 bg-white px-3 text-xs font-semibold text-primary-800 shadow-xs hover:border-primary-300 hover:bg-primary-50 min-[85rem]:h-10 min-[85rem]:rounded-xl min-[85rem]:text-sm"
                  data-favorite-edit-toggle
                  @click="toggleEditing"
                >
                  Chỉnh sửa
                </button>
              </template>
            </div>
          </div>
        </section>

        <p
          v-if="feedback"
          class="mt-3 rounded-xl bg-primary-50 px-3 py-2 text-caption font-medium text-primary-800"
          role="status"
        >
          {{ feedback }}
        </p>

        <p
          v-if="errorFeedback"
          class="mt-3 rounded-xl border border-[#edcbc7] bg-[#fff5f3] px-3 py-2 text-caption font-medium text-[#923b37]"
          role="alert"
        >
          {{ errorFeedback }}
        </p>

        <div
          v-if="favoritesQuery.isPending.value"
          class="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 min-[85rem]:grid-cols-5"
          data-favorites-loading
        >
          <div
            v-for="index in 10"
            :key="index"
            class="overflow-hidden rounded-2xl border border-primary-100 bg-white p-2.5 sm:p-3"
          >
            <BaseSkeleton class="aspect-[3/2] w-full rounded-xl" />
            <BaseSkeleton shape="text" class="mt-2.5 w-4/5" />
            <BaseSkeleton shape="text" class="mt-2 w-2/5" />
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <BaseSkeleton class="h-9 w-full rounded-lg" />
              <BaseSkeleton class="h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>

        <ErrorState
          v-else-if="favoritesQuery.isError.value"
          title="Chưa thể tải danh sách yêu thích"
          description="Kết nối có thể đang gián đoạn. Hãy thử lại để tiếp tục."
          class="mt-6 min-h-72 rounded-[1.5rem] bg-white"
          data-favorites-error
          @retry="favoritesQuery.refetch()"
        />

        <div
          v-else-if="visibleFavorites.length"
          class="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 min-[85rem]:grid-cols-5"
          data-favorites-grid
        >
          <FavoriteProductCard
            v-for="item in displayedFavorites"
            :key="item.productId"
            :item="item"
            :pending="removeFavoriteMutation.isPending.value"
            :editing="editing"
            :selected="selectedProductIds.has(item.productId)"
            @remove="removeFavorite"
            @toggle-selection="toggleSelection"
          />
        </div>

        <div
          v-if="visibleFavorites.length > initialVisibleLimit"
          class="flex justify-center pt-6"
          data-favorites-reveal-controls
        >
          <button
            v-if="displayedFavorites.length < visibleFavorites.length"
            type="button"
            class="motion-interactive inline-flex min-h-10 items-center justify-center rounded-xl border border-primary-200 bg-white px-5 text-sm font-semibold text-primary-800 shadow-xs hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            data-favorites-show-more
            @click="showMore"
          >
            Xem thêm
          </button>
          <button
            v-else
            type="button"
            class="motion-interactive inline-flex min-h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            data-favorites-collapse
            @click="collapseProducts"
          >
            Thu gọn
          </button>
        </div>

        <section
          v-if="!favoritesQuery.isPending.value && !favoritesQuery.isError.value && !visibleFavorites.length"
          class="mt-6 grid min-h-72 place-items-center rounded-[1.5rem] border border-primary-100 bg-white p-6 text-center"
          data-favorites-empty
        >
          <div class="max-w-md">
            <Heart class="mx-auto size-10 text-primary-500" aria-hidden="true" />
            <h2 class="mt-3 text-heading-3 text-primary-950">
              {{
                favorites.length
                  ? 'Không tìm thấy sản phẩm phù hợp'
                  : 'Chưa có sản phẩm yêu thích'
              }}
            </h2>
            <p class="mt-2 text-body-sm text-text-secondary">
              {{
                favorites.length
                  ? 'Hãy thử một tên sản phẩm khác.'
                  : 'Hãy khám phá danh mục và lưu lại những lựa chọn bạn muốn xem sau.'
              }}
            </p>

            <RouterLink
              v-if="!favorites.length"
              :to="{ name: ROUTE_NAMES.products }"
              class="motion-interactive mt-5 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-body-sm font-semibold text-primary-foreground hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Khám phá sản phẩm
            </RouterLink>
          </div>
        </section>
      </div>

      <button
        v-if="showScrollTop"
        type="button"
        class="motion-interactive fixed right-4 bottom-5 z-30 grid size-10 place-items-center rounded-full border border-primary-200 bg-white text-primary-800 shadow-md hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-[85rem]:hidden"
        aria-label="Lên đầu trang"
        data-favorites-back-to-top
        @click="scrollToTop"
      >
        <ArrowUp class="size-4.5" aria-hidden="true" />
      </button>
    </div>
  </CustomerLayout>
</template>
