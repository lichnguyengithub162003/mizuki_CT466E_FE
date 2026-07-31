<script setup lang="ts">
import { ShieldCheck, Sparkles } from '@lucide/vue'

withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    description: string
    mobileSrc: string
    desktopSrc: string
  }>(),
  {
    eyebrow: 'CHĂM SÓC THEO CÁCH CỦA BẠN',
  },
)
</script>

<template>
  <section
    class="relative isolate flex h-full overflow-hidden bg-primary-900 text-white md:rounded-[1.4rem]"
    :data-asset-slot="desktopSrc"
    aria-label="Không gian chăm sóc Mizuki"
  >
    <picture class="absolute inset-0">
      <source :srcset="desktopSrc" media="(min-width: 768px)" />
      <img
        :src="mobileSrc"
        alt=""
        class="h-full w-full object-cover object-center"
        data-testid="auth-hero-image"
      />
    </picture>
    <div class="auth-photo-scrim absolute inset-0" aria-hidden="true" />
    <div class="relative z-10 mt-auto hidden max-w-lg p-8 md:block lg:p-10">
      <div class="mb-4 flex items-center gap-2 text-caption font-bold tracking-[0.16em]">
        <Sparkles class="size-4" aria-hidden="true" />
        {{ eyebrow }}
      </div>
      <h2 class="text-heading-1 text-white lg:text-display-lg">{{ title }}</h2>
      <p class="mt-3 max-w-md text-body-md text-white/90 lg:text-body-lg">{{ description }}</p>
      <div class="mt-5 flex items-center gap-2 text-caption text-white/90">
        <ShieldCheck class="size-4" aria-hidden="true" />
        Trải nghiệm riêng tư và đáng tin cậy
      </div>
    </div>
  </section>
</template>
