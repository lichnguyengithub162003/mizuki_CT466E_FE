<script setup lang="ts">
import { ArrowLeft, ArrowRight, Gift, Sparkles, Waves } from '@lucide/vue'
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import type { HomeHeroSlide } from '@/types/home'
import { cn } from '@/utils/cn'

const props = defineProps<{
  slides: readonly HomeHeroSlide[]
}>()

const currentIndex = ref(0)
const currentSlide = computed(() => props.slides[currentIndex.value] ?? props.slides[0])
const secondarySlide = computed(
  () => props.slides[(currentIndex.value + 1) % props.slides.length] ?? props.slides[0],
)

const toneClasses: Record<HomeHeroSlide['tone'], string> = {
  sage: 'home-hero-tone-sage',
  apricot: 'home-hero-tone-apricot',
  periwinkle: 'home-hero-tone-periwinkle',
}

const decorativeIcons: Record<NonNullable<HomeHeroSlide['decorativeVariant']>, Component> = {
  bottle: Sparkles,
  gift: Gift,
  service: Waves,
}

function showPrevious(): void {
  currentIndex.value = (currentIndex.value - 1 + props.slides.length) % props.slides.length
}

function showNext(): void {
  currentIndex.value = (currentIndex.value + 1) % props.slides.length
}

function showSlide(index: number): void {
  currentIndex.value = index
}
</script>

<template>
  <section class="group/home-hero min-w-0 flex-1" aria-label="Banner trang chủ">
    <div class="relative">
      <div class="grid min-h-[20rem] gap-3 md:grid-cols-[1.45fr_0.85fr]">
        <article
        v-if="currentSlide"
        :class="cn(
          'home-hero-slide relative isolate flex min-h-72 overflow-hidden rounded-3xl border border-white/70 p-6 shadow-sm sm:p-8',
          toneClasses[currentSlide.tone],
        )"
        aria-live="polite"
      >
        <div class="relative z-1 flex max-w-[26rem] flex-col items-start">
          <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-800">
            {{ currentSlide.eyebrow }}
          </p>
          <h1 class="mt-3 text-heading-1 text-primary-950 sm:text-display-lg">
            {{ currentSlide.title }}
          </h1>
          <p class="mt-3 text-body-md leading-6 text-primary-900/80">
            {{ currentSlide.description }}
          </p>
          <a
            href="#featured"
            class="mt-auto inline-flex min-h-11 items-center gap-2 rounded-pill bg-primary-900 px-5 py-2.5 text-body-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {{ currentSlide.ctaLabel }}
            <ArrowRight class="size-4" aria-hidden="true" />
          </a>
        </div>
        <div
          class="home-hero-object absolute bottom-5 right-5 hidden size-40 place-items-center rounded-[2.4rem] border border-white/70 bg-white/48 text-primary-800 shadow-sm backdrop-blur-sm sm:grid"
          aria-hidden="true"
        >
          <component
            :is="decorativeIcons[currentSlide.decorativeVariant ?? 'bottle']"
            class="size-14"
          />
        </div>
        </article>

        <article
        v-if="secondarySlide"
        :class="cn(
          'home-hero-slide relative isolate flex min-h-56 overflow-hidden rounded-3xl border border-white/70 p-6 shadow-sm sm:p-7',
          toneClasses[secondarySlide.tone],
        )"
        aria-label="Ưu đãi tiếp theo"
      >
        <div class="relative z-1 flex max-w-xs flex-col items-start">
          <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-800">
            Tiếp theo
          </p>
          <h2 class="mt-3 text-heading-2 text-primary-950">{{ secondarySlide.title }}</h2>
          <p class="mt-3 text-body-sm leading-6 text-primary-900/80">
            {{ secondarySlide.description }}
          </p>
          <button
            type="button"
            class="mt-auto inline-flex min-h-10 items-center gap-2 rounded-pill bg-white/70 px-4 py-2 text-body-sm font-medium text-primary-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            @click="showNext"
          >
            Xem banner này
            <ArrowRight class="size-4" aria-hidden="true" />
          </button>
        </div>
        </article>
      </div>

      <div
        class="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-white/58 px-3 py-2 shadow-xs backdrop-blur-sm"
        aria-label="Chọn banner"
        data-hero-pagination
      >
        <button
          v-for="(slide, index) in props.slides"
          :key="slide.id"
          type="button"
          :class="cn(
            'h-2 rounded-pill transition-[width,background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            currentIndex === index ? 'w-9 bg-primary-700' : 'w-4 bg-primary-200',
          )"
          :aria-label="`Chuyển đến banner ${slide.title}`"
          :aria-current="currentIndex === index ? 'true' : undefined"
          @click="showSlide(index)"
        ></button>
      </div>

      <button
        type="button"
        class="motion-interactive absolute left-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/88 text-primary-900 opacity-70 shadow-sm backdrop-blur-sm hover:bg-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:opacity-0 md:group-hover/home-hero:opacity-100 md:group-focus-within/home-hero:opacity-100"
        aria-label="Banner trước"
        data-hero-control="previous"
        @click="showPrevious"
      >
        <ArrowLeft class="size-4.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="motion-interactive absolute right-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/88 text-primary-900 opacity-70 shadow-sm backdrop-blur-sm hover:bg-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:opacity-0 md:group-hover/home-hero:opacity-100 md:group-focus-within/home-hero:opacity-100"
        aria-label="Banner tiếp theo"
        data-hero-control="next"
        @click="showNext"
      >
        <ArrowRight class="size-4.5" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>
