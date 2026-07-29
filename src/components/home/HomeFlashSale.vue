<script setup lang="ts">
import { Zap } from '@lucide/vue'
import type { HomeProduct } from '@/types/home'
import HomeCountdown from './HomeCountdown.vue'
import HomeProductCard from './HomeProductCard.vue'

defineProps<{
  products: readonly HomeProduct[]
}>()

defineEmits<{
  viewAll: []
  favorite: [product: HomeProduct]
  productAction: [product: HomeProduct]
}>()
</script>

<template>
  <section
    id="flash-sale"
    class="rounded-3xl border border-[#f0bbb4] bg-[#fff2ef] p-4 shadow-xs sm:p-6"
    aria-labelledby="home-flash-sale-title"
    data-flash-sale
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="grid size-11 place-items-center rounded-2xl bg-[#d94c40] text-white shadow-xs">
          <Zap class="size-5 fill-current" aria-hidden="true" />
        </span>
        <div>
          <p class="text-caption font-semibold uppercase tracking-[0.12em] text-[#b23c33]">
            Giá minh họa
          </p>
          <h2 id="home-flash-sale-title" class="text-heading-3 text-[#992e28] sm:text-heading-2">
            Flash Sale
          </h2>
        </div>
      </div>
      <HomeCountdown />
      <button
        type="button"
        class="motion-interactive min-h-10 rounded-pill px-4 text-body-sm font-medium text-[#a7352e] hover:bg-[#ffe1dc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @click="$emit('viewAll')"
      >
        Xem tất cả
      </button>
    </div>

    <div class="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <HomeProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        @favorite="$emit('favorite', $event)"
        @action="$emit('productAction', $event)"
      />
    </div>
  </section>
</template>
