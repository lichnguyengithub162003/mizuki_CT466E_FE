<script setup lang="ts">
import { ChevronRight, Heart, SlidersHorizontal, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import FavoriteProductCard from '@/components/favorites/FavoriteProductCard.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { favoriteProductsDemo } from '@/data/customer/favoritesDemoData'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import type { FavoriteProduct, FavoriteStockState } from '@/types/customer'

type FavoriteQuickFilter = 'all' | 'available' | 'discounted'
type FavoriteSort = 'recent' | 'price-ascending' | 'price-descending'

const favorites = ref<FavoriteProduct[]>([...favoriteProductsDemo])
const quickFilter = ref<FavoriteQuickFilter>('all')
const categoryFilter = ref('all')
const statusFilter = ref<'all' | FavoriteStockState>('all')
const sort = ref<FavoriteSort>('recent')
const feedback = ref('')

const categories = computed(() => [
  ...new Map(
    favoriteProductsDemo.map((item) => [
      item.product.categoryId,
      item.product.categoryId === 'cleanser'
        ? 'Làm sạch'
        : item.product.categoryId === 'serum'
          ? 'Serum'
          : item.product.categoryId === 'moisturizer'
            ? 'Kem dưỡng'
            : item.product.categoryId === 'sun-care'
              ? 'Chống nắng'
              : 'Danh mục khác',
    ]),
  ).entries(),
])

const visibleFavorites = computed(() => {
  const filtered = favorites.value.filter((item) => {
    if (
      quickFilter.value === 'available'
      && item.stockState !== 'available'
      && item.stockState !== 'low-stock'
    ) {
      return false
    }

    if (quickFilter.value === 'discounted' && !item.product.discountPercent) {
      return false
    }

    if (categoryFilter.value !== 'all' && item.product.categoryId !== categoryFilter.value) {
      return false
    }

    return statusFilter.value === 'all' || item.stockState === statusFilter.value
  })

  return [...filtered].sort((first, second) => {
    if (sort.value === 'price-ascending') return first.product.price - second.product.price
    if (sort.value === 'price-descending') return second.product.price - first.product.price
    return (second.favoriteDate ?? '').localeCompare(first.favoriteDate ?? '')
  })
})

function setQuickFilter(filter: FavoriteQuickFilter): void {
  quickFilter.value = filter
}

function removeFavorite(id: string): void {
  const target = favorites.value.find((item) => item.id === id)
  favorites.value = favorites.value.filter((item) => item.id !== id)
  feedback.value = target ? `Đã bỏ “${target.product.name}” khỏi danh sách yêu thích.` : ''
}

function addToCart(id: string): void {
  const target = favorites.value.find((item) => item.id === id)
  if (!target || target.stockState === 'sold-out' || target.stockState === 'discontinued') return
  feedback.value = `Đã thêm “${target.product.name}” vào giỏ hàng demo.`
}

function clearFavorites(): void {
  favorites.value = []
  feedback.value = 'Đã xóa danh sách yêu thích demo.'
}
</script>

<template>
  <CustomerLayout>
    <div class="min-h-[70svh] bg-[#f7faf8]" data-favorites-page>
      <div class="mx-auto w-full max-w-[90rem] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <nav class="flex items-center gap-1.5 text-caption text-text-secondary" aria-label="Đường dẫn trang">
          <RouterLink
            :to="{ name: 'customer-home' }"
            class="motion-interactive rounded-md hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Trang chủ
          </RouterLink>
          <ChevronRight class="size-4" aria-hidden="true" />
          <span aria-current="page">Yêu thích</span>
        </nav>

        <h1 class="sr-only">Sản phẩm yêu thích</h1>

        <section
          v-if="favorites.length"
          class="mt-3 flex flex-col gap-3 rounded-2xl border border-primary-100 bg-white p-3 shadow-xs lg:flex-row lg:items-center"
          aria-label="Bộ lọc sản phẩm yêu thích"
          data-favorite-toolbar
        >
          <div
            class="flex flex-none items-center gap-2 text-body-sm font-semibold text-primary-950"
            data-favorite-result-count
          >
            <SlidersHorizontal class="size-4.5 text-primary-700" aria-hidden="true" />
            <span>Lọc và sắp xếp · {{ visibleFavorites.length }} sản phẩm</span>
          </div>
          <div class="flex flex-none flex-wrap gap-1.5">
            <button
              v-for="option in [
                { value: 'all', label: 'Tất cả' },
                { value: 'available', label: 'Còn hàng' },
                { value: 'discounted', label: 'Giảm giá' },
              ] as const"
              :key="option.value"
              type="button"
              :class="[
                'motion-interactive min-h-9 rounded-full border px-3 text-caption font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                quickFilter === option.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-primary-200 bg-white text-primary-900 hover:bg-primary-50',
              ]"
              :aria-pressed="quickFilter === option.value"
              :data-favorite-filter="option.value"
              @click="setQuickFilter(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
          <div class="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:justify-end" data-favorite-compact-controls>
            <label class="min-w-0 lg:w-40">
              <span class="sr-only">Danh mục</span>
              <select
                v-model="categoryFilter"
                class="min-h-10 w-full min-w-0 rounded-xl border border-primary-200 bg-white px-3 text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                data-favorite-category
              >
                <option value="all">Tất cả danh mục</option>
                <option v-for="[value, label] in categories" :key="value" :value="value">
                  {{ label }}
                </option>
              </select>
            </label>
            <label class="min-w-0 lg:w-40">
              <span class="sr-only">Trạng thái</span>
              <select
                v-model="statusFilter"
                class="min-h-10 w-full min-w-0 rounded-xl border border-primary-200 bg-white px-3 text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                data-favorite-status
              >
                <option value="all">Mọi trạng thái</option>
                <option value="available">Còn hàng</option>
                <option value="low-stock">Sắp hết hàng</option>
                <option value="sold-out">Đã bán hết</option>
                <option value="discontinued">Ngừng kinh doanh</option>
              </select>
            </label>
            <label class="col-span-2 min-w-0 sm:col-span-1 lg:w-44">
              <span class="sr-only">Sắp xếp</span>
              <select
                v-model="sort"
                class="min-h-10 w-full min-w-0 rounded-xl border border-primary-200 bg-white px-3 text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                data-favorite-sort
              >
                <option value="recent">Yêu thích gần đây</option>
                <option value="price-ascending">Giá tăng dần</option>
                <option value="price-descending">Giá giảm dần</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            class="motion-interactive inline-flex min-h-10 flex-none items-center justify-center gap-1.5 rounded-xl px-3 text-caption font-semibold text-[#923b37] hover:bg-[#fff0ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            @click="clearFavorites"
          >
            <Trash2 class="size-4" aria-hidden="true" />
            Xóa tất cả
          </button>
        </section>

        <p v-if="feedback" class="mt-4 rounded-2xl bg-primary-50 px-4 py-3 text-body-sm font-medium text-primary-800" role="status">
          {{ feedback }}
        </p>

        <div
          v-if="visibleFavorites.length"
          class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4"
          data-favorites-grid
        >
          <FavoriteProductCard
            v-for="item in visibleFavorites"
            :key="item.id"
            :item="item"
            @remove="removeFavorite"
            @add-to-cart="addToCart"
          />
        </div>

        <section
          v-else
          class="mt-8 grid min-h-80 place-items-center rounded-[2rem] border border-primary-100 bg-white p-8 text-center"
          data-favorites-empty
        >
          <div class="max-w-md">
            <Heart class="mx-auto size-12 text-primary-500" aria-hidden="true" />
            <h2 class="mt-4 text-heading-2 text-primary-950">Chưa có sản phẩm phù hợp</h2>
            <p class="mt-2 text-body-md text-text-secondary">
              Hãy khám phá danh mục và lưu lại những lựa chọn bạn muốn xem sau.
            </p>
            <RouterLink
              :to="{ name: ROUTE_NAMES.products }"
              class="motion-interactive mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Khám phá sản phẩm
            </RouterLink>
          </div>
        </section>
      </div>
    </div>
  </CustomerLayout>
</template>
