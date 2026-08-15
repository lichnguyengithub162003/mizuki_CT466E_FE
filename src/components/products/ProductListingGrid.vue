<script setup lang="ts">
import { Heart, ShoppingBag, Star } from '@lucide/vue'
import { computed, ref } from 'vue'
import { AsyncContent, DataGridSkeleton } from '@/components/feedback'
import { PRODUCT_LISTING_FALLBACK_IMAGE } from '@/api/productListingAdapter'
import type {
  ProductContentState,
  ProductListingProduct,
} from '@/types/products'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    products: readonly ProductListingProduct[]
    state?: ProductContentState
    favoriteIds?: ReadonlySet<string>
    favoritePending?: boolean
  }>(),
  {
    state: 'success',
    favoriteIds: () => new Set<string>(),
    favoritePending: false,
  },
)

defineEmits<{
  retry: []
  select: [product: ProductListingProduct]
  addToCart: [product: ProductListingProduct]
  'toggle-favorite': [product: ProductListingProduct]
}>()

const failedImages = ref<ReadonlySet<string>>(new Set())
const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

const asyncError = computed(() =>
  props.state === 'error'
    ? {
        kind: 'server' as const,
        title: 'Chưa thể hiển thị sản phẩm',
        message: 'Không thể tải dữ liệu từ hệ thống. Bạn có thể thử lại ngay.',
        retryable: true,
      }
    : null,
)

const toneClasses: Record<ProductListingProduct['tone'], string> = {
  mint: 'bg-[#e3f1eb]',
  rose: 'bg-[#f3e5e2]',
  sand: 'bg-[#f2eadc]',
  sky: 'bg-[#e4eef2]',
  lilac: 'bg-[#ebe8f5]',
}

function productImage(product: ProductListingProduct): string {
  return failedImages.value.has(product.id)
    ? PRODUCT_LISTING_FALLBACK_IMAGE
    : product.imageUrl ?? PRODUCT_LISTING_FALLBACK_IMAGE
}

function handleImageError(productId: string): void {
  if (failedImages.value.has(productId)) return
  failedImages.value = new Set([...failedImages.value, productId])
}

function stockLabel(product: ProductListingProduct): string {
  if (product.stockState === 'sold_out') return 'Hết hàng'
  if (product.stockState === 'low') return 'Sắp hết hàng'
  return 'Còn hàng'
}
</script>

<template>
  <AsyncContent
    :status="props.state"
    :error="asyncError"
    :has-data="props.state === 'success' && props.products.length > 0"
    empty-title="Chưa tìm thấy sản phẩm phù hợp"
    empty-description="Hãy đặt lại một vài bộ lọc để xem thêm lựa chọn."
    @retry="$emit('retry')"
  >
    <template #loading>
      <DataGridSkeleton
        :items="8"
        :columns="4"
        label="Đang tải danh sách sản phẩm"
      />
    </template>

    <div
      class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
      data-testid="product-listing-grid"
    >
      <article
        v-for="product in props.products"
        :key="product.id"
        class="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xs"
        :aria-labelledby="`listing-product-${product.id}`"
        data-listing-product
      >
        <div
          :class="cn('relative aspect-square overflow-hidden p-4', toneClasses[product.tone])"
          data-product-image-area
        >
          <img
            :src="productImage(product)"
            :alt="product.name"
            class="size-full rounded-[1.35rem] border border-white/70 bg-white/45 object-contain"
            width="480"
            height="480"
            loading="lazy"
            data-product-image
            @error="handleImageError(product.id)"
          />
          <span
            v-if="product.discountPercent"
            class="absolute left-3 top-3 rounded-pill bg-[#d9463e] px-2.5 py-1 text-[0.6875rem] font-semibold text-white shadow-xs"
            data-discount-badge
          >
            -{{ product.discountPercent }}%
          </span>
          <div
            v-if="product.stockState === 'sold_out'"
            class="absolute inset-0 grid place-items-center bg-primary-950/48"
          >
            <span class="rounded-pill bg-white px-4 py-2 text-body-sm font-semibold text-primary-950">
              Bán hết
            </span>
          </div>
          <button
            type="button"
            :class="cn(
              'motion-interactive absolute right-3 top-3 grid size-10 place-items-center rounded-full border shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              props.favoriteIds.has(product.id)
                ? 'border-red-200 bg-red-50/95 text-red-600 hover:bg-red-100'
                : 'border-white/90 bg-white/92 text-primary-800 hover:border-primary-100 hover:bg-white',
            )"
            :aria-label="props.favoriteIds.has(product.id) ? `Bỏ ${product.name} khỏi yêu thích` : `Yêu thích ${product.name}`"
            :aria-pressed="props.favoriteIds.has(product.id)"
            :disabled="props.favoritePending"
            @click.stop="$emit('toggle-favorite', product)"
          >
            <Heart :class="cn('size-4.5', props.favoriteIds.has(product.id) && 'fill-current')" aria-hidden="true" />
          </button>
        </div>

        <div class="flex flex-1 flex-col p-3.5">
          <p class="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-primary-700">
            {{ product.brand }}
          </p>
          <h3
            :id="`listing-product-${product.id}`"
            class="mt-1 line-clamp-2 min-h-11 text-body-md font-medium text-primary-950"
            data-product-name
          >
            {{ product.name }}
          </h3>

          <div class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <strong class="text-body-lg font-semibold text-[#cf3f36]" data-current-price>
              {{ currencyFormatter.format(product.price) }}
            </strong>
            <span
              v-if="product.originalPrice"
              class="text-caption text-text-muted line-through"
            >
              {{ currencyFormatter.format(product.originalPrice) }}
            </span>
          </div>

          <div
            class="mt-2 flex min-h-6 items-center justify-between gap-2 text-[0.6875rem] text-text-secondary"
            data-rating-stock-row
          >
            <span v-if="(product.rating ?? 0) > 0" class="inline-flex items-center gap-1" data-product-rating>
              <Star
                class="size-3.5 fill-[#e3aa32] text-[#e3aa32]"
                aria-hidden="true"
                data-rating-star
              />
              {{ (product.rating ?? 0).toFixed(1) }} ({{ product.reviewCount ?? 0 }})
            </span>
            <span v-else data-product-rating>Chưa có đánh giá</span>
            <span class="shrink-0 text-right" data-product-stock>{{ stockLabel(product) }}</span>
          </div>

          <button
            type="button"
            class="motion-interactive mt-auto inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary-800 px-3 text-body-sm font-medium text-primary-foreground hover:bg-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted"
            :disabled="product.stockState === 'sold_out'"
            :aria-label="product.stockState === 'sold_out'
              ? `${product.name} đã bán hết`
              : `Xem ${product.name}`"
            @click="$emit('select', product)"
          >
            <ShoppingBag class="size-4" aria-hidden="true" />
            {{ product.stockState === 'sold_out' ? 'Bán hết' : 'Xem sản phẩm' }}
          </button>
          <button
            v-if="product.stockState !== 'sold_out' && product.defaultVariantId"
            type="button"
            class="motion-interactive mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary-200 px-3 text-body-sm font-semibold text-primary-900 hover:bg-primary-50"
            :aria-label="`Thêm ${product.name} vào giỏ hàng`"
            @click="$emit('addToCart', product)"
          >
            Thêm vào giỏ
          </button>
        </div>
      </article>
    </div>
  </AsyncContent>
</template>
