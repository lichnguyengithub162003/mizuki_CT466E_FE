<script setup lang="ts">
import { ArrowRight, Sparkles } from '@lucide/vue'
import type { HomeBrand } from '@/types/home'

defineProps<{
  brands: readonly HomeBrand[]
}>()

defineEmits<{
  viewAll: []
}>()
</script>

<template>
  <section
    id="brands"
    class="home-brand-showcase overflow-hidden rounded-[2rem] border border-white/70 p-5 shadow-sm sm:p-7"
    aria-labelledby="home-brands-title"
  >
    <div class="flex items-end justify-between gap-4">
      <div>
        <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700">
          Chọn lọc tại Mizuki
        </p>
        <h2 id="home-brands-title" class="mt-1 text-heading-2 text-primary-950">
          Thương hiệu nổi bật
        </h2>
      </div>
      <button
        type="button"
        class="motion-interactive hidden min-h-10 items-center gap-2 rounded-pill bg-white/65 px-4 text-body-sm font-medium text-primary-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:inline-flex"
        @click="$emit('viewAll')"
      >
        Xem tất cả thương hiệu
        <ArrowRight class="size-4" aria-hidden="true" />
      </button>
    </div>

    <div class="mt-5 grid gap-3 md:grid-cols-[1.25fr_2fr]">
      <article
        v-if="brands[0]"
        class="relative flex min-h-56 flex-col justify-end overflow-hidden rounded-3xl border border-white/70 bg-primary-900 p-6 text-primary-foreground"
      >
        <Sparkles class="absolute right-6 top-6 size-12 opacity-50" aria-hidden="true" />
        <p class="text-caption uppercase tracking-[0.12em] text-primary-100">Thương hiệu đề xuất</p>
        <h3 class="mt-2 text-heading-1 text-white">{{ brands[0].name }}</h3>
        <p v-if="brands[0].description" class="mt-2 text-body-sm text-primary-100">
          {{ brands[0].description }}
        </p>
      </article>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <article
          v-for="brand in brands.slice(1)"
          :key="brand.id"
          class="flex min-h-24 flex-col justify-end rounded-2xl border border-white/70 p-4 shadow-xs"
          :style="{ backgroundColor: brand.accent }"
        >
          <h3 class="text-body-md font-semibold tracking-[0.06em] text-primary-950">
            {{ brand.name }}
          </h3>
          <p v-if="brand.description" class="mt-1 text-caption text-primary-900/75">
            {{ brand.description }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
