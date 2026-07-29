<script setup lang="ts">
import { ArrowRight, Gift, Sparkles } from '@lucide/vue'
import { RouterLink } from 'vue-router'

const banners = [
  {
    eyebrow: 'Ưu đãi theo mùa',
    title: 'Chăm da dịu nhẹ, rạng rỡ mỗi ngày',
    description: 'Khám phá lựa chọn chăm sóc da đang được quan tâm tại Mizuki.',
    action: 'Xem chăm sóc da',
    to: '/customer-shell?section=skincare',
    icon: Sparkles,
    tone: 'customer-hero-banner-primary',
  },
  {
    eyebrow: 'Quà tặng Mizuki',
    title: 'Thêm niềm vui vào giỏ hàng',
    description: 'Ưu đãi demo có thể thay đổi theo chi nhánh được chọn.',
    action: 'Xem khuyến mãi',
    to: '/customer-shell?section=promotions',
    icon: Gift,
    tone: 'customer-hero-banner-secondary',
  },
] as const
</script>

<template>
  <section
    class="customer-hero-grid grid gap-3 lg:grid-cols-[1.35fr_1fr]"
    aria-label="Banner mua sắm nổi bật"
  >
    <article
      v-for="(banner, index) in banners"
      :key="banner.title"
      :class="[
        'customer-hero-banner relative isolate flex min-h-64 overflow-hidden rounded-3xl border border-white/70 p-6 shadow-sm sm:min-h-72 sm:p-8',
        banner.tone,
      ]"
    >
      <div class="relative z-1 flex max-w-[23rem] flex-col items-start">
        <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-800">
          {{ banner.eyebrow }}
        </p>
        <h1
          v-if="index === 0"
          class="mt-3 text-heading-1 text-primary-950 sm:text-display-lg"
        >
          {{ banner.title }}
        </h1>
        <h2 v-else class="mt-3 text-heading-1 text-primary-950 sm:text-display-lg">
          {{ banner.title }}
        </h2>
        <p class="mt-3 text-body-md leading-6 text-primary-900/80">
          {{ banner.description }}
        </p>
        <RouterLink
          :to="banner.to"
          class="mt-auto inline-flex min-h-11 items-center gap-2 rounded-pill bg-primary-900 px-5 py-2.5 text-body-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {{ banner.action }}
          <ArrowRight class="size-4" aria-hidden="true" />
        </RouterLink>
      </div>

      <div
        class="customer-hero-product-shape absolute bottom-5 right-5 hidden size-40 place-items-center rounded-[2.25rem] border border-white/70 bg-white/45 text-primary-800 shadow-sm backdrop-blur-sm sm:grid"
        aria-hidden="true"
      >
        <component :is="banner.icon" class="size-12 sm:size-14" />
      </div>
    </article>
  </section>
</template>
