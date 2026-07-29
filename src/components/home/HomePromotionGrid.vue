<script setup lang="ts">
import { ArrowRight, Gift, MapPin, Sparkles } from '@lucide/vue'
import type { Component } from 'vue'
import type { HomePromotion } from '@/types/home'
import { cn } from '@/utils/cn'

defineProps<{
  promotions: readonly HomePromotion[]
}>()

defineEmits<{
  select: [promotion: HomePromotion]
}>()

const toneClasses: Record<HomePromotion['tone'], string> = {
  sage: 'bg-[#dfece5]',
  apricot: 'bg-[#f3e3d7]',
  powder: 'bg-[#e1edf1]',
}

const icons: readonly Component[] = [MapPin, Gift, Sparkles]
</script>

<template>
  <section id="promotions" aria-labelledby="home-promotions-title">
    <div>
      <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700">
        Dành cho bạn
      </p>
      <h2 id="home-promotions-title" class="mt-1 text-heading-2 text-primary-950">
        Ưu đãi và dịch vụ
      </h2>
    </div>
    <div class="mt-5 grid gap-3 md:grid-cols-3">
      <article
        v-for="(promotion, index) in promotions"
        :key="promotion.id"
        :class="cn(
          'relative isolate flex min-h-52 flex-col items-start overflow-hidden rounded-3xl border border-white/70 p-5 shadow-xs',
          toneClasses[promotion.tone],
        )"
      >
        <span class="grid size-11 place-items-center rounded-2xl bg-white/70 text-primary-800 shadow-xs">
          <component :is="icons[index] ?? Sparkles" class="size-5" aria-hidden="true" />
        </span>
        <h3 class="mt-5 text-heading-3 text-primary-950">{{ promotion.title }}</h3>
        <p class="mt-2 max-w-xs text-body-sm leading-6 text-primary-900/75">
          {{ promotion.description }}
        </p>
        <button
          type="button"
          class="motion-interactive mt-auto inline-flex min-h-10 items-center gap-2 rounded-pill bg-white/70 px-4 text-body-sm font-medium text-primary-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :aria-label="`${promotion.ctaLabel}: ${promotion.title}`"
          @click="$emit('select', promotion)"
        >
          {{ promotion.ctaLabel }}
          <ArrowRight class="size-4" aria-hidden="true" />
        </button>
      </article>
    </div>
  </section>
</template>
