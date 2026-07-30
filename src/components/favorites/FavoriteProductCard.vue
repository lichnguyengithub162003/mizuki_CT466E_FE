<script setup lang="ts">
import { HeartOff, PackageOpen, ShoppingCart, Star } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'
import type { FavoriteProduct } from '@/types/customer'
import { cn } from '@/utils/cn'

const props = defineProps<{
  item: FavoriteProduct
}>()

const emit = defineEmits<{
  remove: [id: string]
  addToCart: [id: string]
}>()

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

const canAddToCart = computed(
  () => props.item.stockState === 'available' || props.item.stockState === 'low-stock',
)

const stockLabel = computed(() => {
  const labels: Record<FavoriteProduct['stockState'], string> = {
    available: 'Còn hàng',
    'low-stock': 'Sắp hết hàng',
    'sold-out': 'Đã bán hết',
    discontinued: 'Ngừng kinh doanh',
  }
  return labels[props.item.stockState]
})

const toneClasses: Record<FavoriteProduct['product']['tone'], string> = {
  mint: 'bg-[#e3f1eb]',
  rose: 'bg-[#f3e5e2]',
  sand: 'bg-[#f2eadc]',
  sky: 'bg-[#e4eef2]',
  lilac: 'bg-[#ebe8f5]',
}
</script>

<template>
  <article
    class="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-xs"
    :aria-labelledby="`favorite-name-${props.item.id}`"
    data-favorite-item
    :data-stock-state="props.item.stockState"
  >
    <div :class="cn('relative aspect-[4/3] p-4', toneClasses[props.item.product.tone])">
      <div class="grid size-full place-items-center rounded-2xl border border-white/70 bg-white/45 text-primary-700">
        <PackageOpen class="size-10 opacity-75" aria-hidden="true" />
      </div>
      <span
        v-if="props.item.product.discountPercent"
        class="absolute left-3 top-3 rounded-full bg-[#c8423a] px-2.5 py-1 text-caption font-semibold text-white"
      >
        -{{ props.item.product.discountPercent }}%
      </span>
      <button
        type="button"
        class="motion-interactive absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/95 text-[#b83d3a] shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        :aria-label="`Bỏ ${props.item.product.name} khỏi yêu thích`"
        @click="emit('remove', props.item.id)"
      >
        <HeartOff class="size-4.5" aria-hidden="true" />
      </button>
    </div>

    <div class="flex flex-1 flex-col p-4">
      <p class="text-caption font-semibold uppercase tracking-[0.1em] text-primary-700">
        {{ props.item.product.brand }}
      </p>
      <h2
        :id="`favorite-name-${props.item.id}`"
        class="mt-1 line-clamp-2 min-h-12 text-body-md font-semibold leading-6 text-primary-950"
      >
        {{ props.item.product.name }}
      </h2>

      <div class="mt-3 flex flex-wrap items-baseline gap-x-2">
        <strong class="text-body-lg font-bold text-[#c8423a]">
          {{ currencyFormatter.format(props.item.product.price) }}
        </strong>
        <span
          v-if="props.item.product.originalPrice"
          class="text-caption text-text-muted line-through"
        >
          {{ currencyFormatter.format(props.item.product.originalPrice) }}
        </span>
      </div>

      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-secondary">
        <span class="inline-flex items-center gap-1">
          <Star class="size-3.5 fill-[#e3aa32] text-[#e3aa32]" aria-hidden="true" />
          {{ props.item.product.rating?.toFixed(1) ?? '—' }}
        </span>
        <span>Đã bán {{ props.item.product.soldCount ?? 0 }}</span>
      </div>

      <div class="mt-3 border-t border-primary-100 pt-3">
        <p
          :class="cn(
            'text-body-sm font-semibold',
            canAddToCart ? 'text-primary-800' : 'text-[#9b3e3a]',
          )"
          data-favorite-stock
        >
          {{ stockLabel }}
        </p>
        <p class="mt-1 text-caption leading-5 text-text-secondary">
          {{ props.item.branchAvailability.label }}
        </p>
      </div>

      <div class="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
        <RouterLink
          :to="{ name: ROUTE_NAMES.productDetail, params: { slug: props.item.product.slug } }"
          class="motion-interactive inline-flex min-h-11 items-center justify-center rounded-xl border border-primary-200 px-3 text-body-sm font-semibold text-primary-900 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Xem chi tiết
        </RouterLink>
        <button
          type="button"
          class="motion-interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-body-sm font-semibold text-primary-foreground hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-primary-100 disabled:text-text-muted"
          :disabled="!canAddToCart"
          :aria-label="`Thêm ${props.item.product.name} vào giỏ hàng`"
          @click="emit('addToCart', props.item.id)"
        >
          <ShoppingCart class="size-4" aria-hidden="true" />
          Thêm vào giỏ
        </button>
      </div>

      <RouterLink
        v-if="!canAddToCart"
        :to="{ name: ROUTE_NAMES.products, query: { similarTo: props.item.product.id } }"
        class="motion-interactive mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-50 px-3 text-body-sm font-semibold text-primary-800 hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Tìm sản phẩm tương tự
      </RouterLink>
    </div>
  </article>
</template>
