<script setup lang="ts">
import { ChevronLeft, ChevronRight, Heart, PackageOpen, Star } from '@lucide/vue'
import { ref } from 'vue'
import type { ProductListingProduct } from '@/types/products'
import { cn } from '@/utils/cn'

const props = defineProps<{
  products: readonly ProductListingProduct[]
}>()

const carousel = ref<HTMLElement>()
const activeIndex = ref(0)

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

const toneClasses: Record<ProductListingProduct['tone'], string> = {
  mint: 'bg-[#e3f1eb]',
  rose: 'bg-[#f3e5e2]',
  sand: 'bg-[#f2eadc]',
  sky: 'bg-[#e4eef2]',
  lilac: 'bg-[#ebe8f5]',
}

function stockLabel(product: ProductListingProduct): string {
  if (product.stockState === 'sold_out') return 'Đã bán hết'
  if (product.stockState === 'low') return 'Sắp hết hàng'
  return `Đã bán ${product.soldCount ?? 0}`
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollToProduct(index: number): void {
  if (props.products.length === 0) return

  activeIndex.value = Math.min(Math.max(index, 0), props.products.length - 1)
  const item = carousel.value?.querySelector<HTMLElement>(
    `[data-suggestion-index="${activeIndex.value}"]`,
  )

  if (typeof item?.scrollIntoView === 'function') {
    item.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'start',
    })
  }
}

function showPrevious(): void {
  scrollToProduct(activeIndex.value - 1)
}

function showNext(): void {
  scrollToProduct(activeIndex.value + 1)
}

function handleKeyboard(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    showPrevious()
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    showNext()
  }
}
</script>

<template>
  <section
    class="group/suggestions rounded-3xl border border-primary-100 bg-[#edf4f0] px-4 py-6 sm:px-6"
    aria-labelledby="product-suggestion-heading"
    data-suggestion-carousel
    :data-active-index="activeIndex"
  >
    <div class="flex items-end justify-between gap-4">
      <div class="max-w-2xl">
        <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">
          Gợi ý dành cho bạn
        </p>
        <h2 id="product-suggestion-heading" class="mt-1 text-heading-3">Có thể bạn thích</h2>
      </div>
      <a
        href="#product-results"
        class="motion-interactive shrink-0 rounded-lg px-2 py-1.5 text-body-sm font-semibold text-primary-800 hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Xem tất cả
      </a>
    </div>

    <div class="relative mt-4">
      <div
        ref="carousel"
        class="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-suggestion-row
        role="region"
        aria-label="Danh sách sản phẩm gợi ý"
        tabindex="0"
        @keydown="handleKeyboard"
      >
        <article
          v-for="(product, index) in props.products"
          :key="`suggested-${product.id}`"
          class="group/card flex h-full min-w-0 w-auto shrink-0 basis-[58%] snap-start flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xs sm:basis-[13rem] md:basis-[12.5rem] xl:basis-[13.5rem]"
          :aria-labelledby="`compact-product-${product.id}`"
          data-compact-product-card
          data-suggested-product
          :data-suggestion-index="index"
        >
          <div
            :class="cn('relative aspect-[4/3] overflow-hidden p-3', toneClasses[product.tone])"
            data-compact-product-visual
          >
            <div class="grid size-full place-items-center rounded-xl border border-white/70 bg-white/45 text-primary-700">
              <PackageOpen class="size-8 opacity-75" aria-hidden="true" />
            </div>
            <span
              v-if="product.discountPercent"
              class="absolute left-2.5 top-2.5 rounded-pill bg-[#d9463e] px-2 py-0.5 text-[0.625rem] font-semibold text-white"
            >
              -{{ product.discountPercent }}%
            </span>
            <button
              type="button"
              class="motion-interactive absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full bg-white/90 text-primary-800 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              :aria-label="`Yêu thích ${product.name}`"
            >
              <Heart class="size-4" aria-hidden="true" />
            </button>
          </div>

          <div class="flex flex-1 flex-col p-3">
            <p class="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-primary-700">
              {{ product.brand }}
            </p>
            <h3
              :id="`compact-product-${product.id}`"
              class="mt-1 line-clamp-2 min-h-10 text-body-sm font-medium text-primary-950"
            >
              {{ product.name }}
            </h3>
            <div class="mt-2 flex flex-wrap items-baseline gap-x-1.5">
              <strong class="text-body-md font-semibold text-[#cf3f36]">
                {{ currencyFormatter.format(product.price) }}
              </strong>
              <span v-if="product.originalPrice" class="text-[0.625rem] text-text-muted line-through">
                {{ currencyFormatter.format(product.originalPrice) }}
              </span>
            </div>
            <div class="mt-1.5 flex items-center justify-between gap-2 text-[0.6875rem] text-text-secondary">
              <span class="inline-flex items-center gap-1">
                <Star class="size-3 fill-[#e3aa32] text-[#e3aa32]" aria-hidden="true" />
                {{ product.rating?.toFixed(1) ?? '—' }}
              </span>
              <span>{{ stockLabel(product) }}</span>
            </div>
          </div>
        </article>
      </div>

      <button
        type="button"
        class="motion-interactive absolute left-1 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white bg-white/95 text-primary-900 opacity-90 shadow-sm focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-35 md:opacity-0 md:group-hover/suggestions:opacity-100 md:group-focus-within/suggestions:opacity-100"
        aria-label="Xem sản phẩm gợi ý trước"
        :disabled="activeIndex === 0"
        @click="showPrevious"
      >
        <ChevronLeft class="size-4.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="motion-interactive absolute right-1 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white bg-white/95 text-primary-900 opacity-90 shadow-sm focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-35 md:opacity-0 md:group-hover/suggestions:opacity-100 md:group-focus-within/suggestions:opacity-100"
        aria-label="Xem sản phẩm gợi ý tiếp theo"
        :disabled="activeIndex === props.products.length - 1"
        @click="showNext"
      >
        <ChevronRight class="size-4.5" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>
