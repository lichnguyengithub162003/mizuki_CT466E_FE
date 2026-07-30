<script setup lang="ts">
import type { CategoryPreviewProduct } from '@/types/products'
import { cn } from '@/utils/cn'

const props = defineProps<{
  products: readonly CategoryPreviewProduct[]
}>()

const toneClasses: Record<CategoryPreviewProduct['tone'], string> = {
  mint: 'from-[#dcece4] to-[#f4f8f6]',
  rose: 'from-[#f0dddf] to-[#fbf5f5]',
  sand: 'from-[#eadfc9] to-[#faf6ee]',
  sky: 'from-[#dce8ee] to-[#f4f8fa]',
  lilac: 'from-[#e5dff0] to-[#f8f6fb]',
}
</script>

<template>
  <section
    class="category-conveyor group/category-preview relative mt-4 rounded-xl border border-primary-100 bg-primary-50/55 p-2.5"
    aria-label="Sản phẩm tiêu biểu trong danh mục chăm sóc da"
    data-category-product-slider
    data-motion="continuous-marquee"
    data-pause-on-hover="true"
    data-pause-on-focus="true"
    data-reduced-motion="static-horizontal-scroll"
  >
    <div
      class="category-conveyor-viewport overflow-hidden motion-reduce:overflow-x-auto"
      data-category-conveyor-viewport
    >
      <div
        class="category-conveyor-track flex w-max motion-reduce:animate-none"
        data-category-conveyor-track
      >
        <div
          class="category-conveyor-group flex shrink-0 gap-2 pr-2"
          role="list"
          aria-label="Danh sách sản phẩm tiêu biểu"
          data-category-conveyor-source
        >
          <div
            v-for="product in props.products"
            :key="product.id"
            :class="cn(
              'category-product-card relative flex min-h-[5.5rem] w-[9.75rem] shrink-0 flex-col justify-end overflow-hidden rounded-xl border border-white/80 bg-gradient-to-br px-2.5 py-2.5 shadow-xs sm:w-[10.5rem]',
              toneClasses[product.tone],
            )"
            role="listitem"
            tabindex="0"
            :aria-label="`${product.brand}, ${product.name}`"
            :data-featured="product.featured ? 'true' : undefined"
            :data-category-preview-product="product.id"
          >
            <p class="truncate text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-primary-700">
              {{ product.brand }}
            </p>
            <strong class="mt-0.5 line-clamp-2 block text-caption font-semibold text-primary-950">
              {{ product.name }}
            </strong>
          </div>
        </div>

        <div
          class="category-conveyor-group category-conveyor-clone flex shrink-0 gap-2 pr-2"
          aria-hidden="true"
          data-category-conveyor-clone
        >
          <div
            v-for="product in props.products"
            :key="`clone-${product.id}`"
            :class="cn(
              'category-product-card relative flex min-h-[5.5rem] w-[9.75rem] shrink-0 flex-col justify-end overflow-hidden rounded-xl border border-white/80 bg-gradient-to-br px-2.5 py-2.5 shadow-xs sm:w-[10.5rem]',
              toneClasses[product.tone],
            )"
            :data-featured="product.featured ? 'true' : undefined"
            data-category-preview-clone
          >
            <p class="truncate text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-primary-700">
              {{ product.brand }}
            </p>
            <strong class="mt-0.5 line-clamp-2 block text-caption font-semibold text-primary-950">
              {{ product.name }}
            </strong>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@keyframes category-conveyor-scroll {
  from {
    transform: translate3d(0, 0, 0);
  }

  to {
    transform: translate3d(-50%, 0, 0);
  }
}

.category-conveyor-track {
  animation: category-conveyor-scroll 30s linear infinite;
  will-change: transform;
}

.category-product-card::after {
  position: absolute;
  inset: 0.5rem 0.5rem auto auto;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid rgb(255 255 255 / 75%);
  border-radius: 0.6rem;
  background: rgb(255 255 255 / 55%);
  content: '';
}

.category-product-card[data-featured='true']::before {
  position: absolute;
  inset: 0.5rem auto auto 0.5rem;
  border-radius: 999px;
  background: var(--color-primary-800);
  color: var(--color-primary-foreground);
  content: 'Nổi bật';
  font-size: 0.5625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
}

.category-conveyor:hover .category-conveyor-track,
.category-conveyor:focus-within .category-conveyor-track {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .category-conveyor-viewport {
    scrollbar-width: thin;
  }

  .category-conveyor-track {
    animation: none;
    transform: none;
  }

  .category-conveyor-clone {
    display: none;
  }
}
</style>
