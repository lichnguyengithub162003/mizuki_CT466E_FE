<script setup lang="ts">
import { Heart, PackageOpen, ShoppingBag, Star } from '@lucide/vue'
import { computed } from 'vue'
import type { HomeProduct } from '@/types/home'
import { cn } from '@/utils/cn'

const props = defineProps<{
  product: HomeProduct
}>()

defineEmits<{
  favorite: [product: HomeProduct]
  action: [product: HomeProduct]
}>()

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

const toneClasses: Record<HomeProduct['tone'], string> = {
  mint: 'bg-[#e3f1eb]',
  rose: 'bg-[#f3e5e2]',
  sand: 'bg-[#f2eadc]',
  sky: 'bg-[#e4eef2]',
  lilac: 'bg-[#ebe8f5]',
}

const stockLabel = computed(() => {
  if (props.product.stockState === 'sold_out') return 'Bán hết'
  if (props.product.stockState === 'low') return 'Sắp hết hàng'
  return 'Còn hàng'
})

const soldProgress = computed(() => Math.min(100, Math.max(12, props.product.soldCount ?? 12)))
</script>

<template>
  <article
    class="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xs"
    :aria-labelledby="`home-product-${props.product.id}`"
  >
    <div :class="cn('relative aspect-square overflow-hidden p-4', toneClasses[props.product.tone])">
      <div class="grid size-full place-items-center rounded-[1.35rem] border border-white/70 bg-white/45 text-primary-700">
        <PackageOpen class="size-12 opacity-75" aria-hidden="true" />
      </div>
      <span
        v-if="props.product.discountPercent"
        class="absolute left-3 top-3 rounded-pill bg-[#d9463e] px-2.5 py-1 text-[0.6875rem] font-semibold text-white shadow-xs"
        data-discount-badge
      >
        -{{ props.product.discountPercent }}%
      </span>
      <span
        v-if="props.product.badge"
        class="absolute bottom-3 left-3 rounded-pill bg-[#f1b94b] px-2.5 py-1 text-[0.6875rem] font-semibold text-[#5f3a00] shadow-xs"
        data-product-badge
      >
        {{ props.product.badge }}
      </span>
      <div
        v-if="props.product.stockState === 'sold_out'"
        class="absolute inset-0 grid place-items-center bg-primary-950/48"
      >
        <span class="rounded-pill bg-white px-4 py-2 text-body-sm font-semibold text-primary-950">
          Bán hết
        </span>
      </div>
      <button
        type="button"
        class="motion-interactive absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/88 text-primary-800 shadow-xs hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        :aria-label="`Yêu thích ${props.product.name}`"
        @click="$emit('favorite', props.product)"
      >
        <Heart class="size-4.5" aria-hidden="true" />
      </button>
    </div>

    <div class="flex flex-1 flex-col p-3.5">
      <p class="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-primary-700">
        {{ props.product.brand }}
      </p>
      <h3
        :id="`home-product-${props.product.id}`"
        class="mt-1 line-clamp-2 min-h-11 text-body-md font-medium text-primary-950"
      >
        {{ props.product.name }}
      </h3>

      <div class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong class="text-body-lg font-semibold text-[#cf3f36]" data-current-price>
          {{ currencyFormatter.format(props.product.price) }}
        </strong>
        <span
          v-if="props.product.originalPrice"
          class="text-caption text-text-muted line-through"
        >
          {{ currencyFormatter.format(props.product.originalPrice) }}
        </span>
      </div>

      <div v-if="props.product.rating" class="mt-2 flex items-center gap-1 text-caption text-text-secondary">
        <Star
          class="size-3.5 fill-[#e3aa32] text-[#e3aa32]"
          aria-hidden="true"
          data-rating-star
        />
        <span>{{ props.product.rating.toFixed(1) }}</span>
        <span v-if="props.product.reviewCount">({{ props.product.reviewCount }})</span>
      </div>

      <div class="mt-3">
        <div class="h-1.5 overflow-hidden rounded-pill bg-primary-100">
          <div
            class="h-full rounded-pill bg-primary-600"
            :style="{ width: `${soldProgress}%` }"
          ></div>
        </div>
        <p class="mt-1 text-[0.6875rem] text-text-secondary">
          {{ stockLabel }}
          <span v-if="props.product.soldCount && props.product.stockState !== 'sold_out'">
            · Đã bán {{ props.product.soldCount }}
          </span>
        </p>
      </div>

      <button
        type="button"
        class="motion-interactive mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary-800 px-3 text-body-sm font-medium text-primary-foreground hover:bg-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted"
        :disabled="props.product.stockState === 'sold_out'"
        :aria-label="props.product.stockState === 'sold_out'
          ? `${props.product.name} đã bán hết`
          : `Xem ${props.product.name}`"
        @click="$emit('action', props.product)"
      >
        <ShoppingBag class="size-4" aria-hidden="true" />
        {{ props.product.stockState === 'sold_out' ? 'Bán hết' : 'Xem sản phẩm' }}
      </button>
    </div>
  </article>
</template>
