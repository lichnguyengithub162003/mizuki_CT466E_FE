<script setup lang="ts">
import { ChevronLeft, ChevronRight, PackageOpen, Sparkles } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  ProductBrandPromotion,
  ProductListingBanner,
} from '@/types/products'
import { cn } from '@/utils/cn'

const AUTOPLAY_INTERVAL_MS = 6_000
const BRANDS_PER_SLIDE = 3

const props = defineProps<{
  banner: ProductListingBanner
  brands: readonly ProductBrandPromotion[]
}>()

const activeSlide = ref(0)
const paused = ref(false)
const reducedMotion = ref(false)
let autoplayTimer: number | undefined
let motionQuery: MediaQueryList | undefined

const brandGroups = computed(() => {
  const groups: ProductBrandPromotion[][] = [props.brands.slice(0, 2)]
  for (let index = 2; index < props.brands.length; index += BRANDS_PER_SLIDE) {
    groups.push(props.brands.slice(index, index + BRANDS_PER_SLIDE))
  }
  return groups.filter((group) => group.length > 0)
})
const slideCount = computed(() => brandGroups.value.length)
const activeBrands = computed(() => brandGroups.value[activeSlide.value] ?? [])

function stopAutoplay(): void {
  if (autoplayTimer !== undefined) {
    window.clearInterval(autoplayTimer)
    autoplayTimer = undefined
  }
}

function goToSlide(index: number): void {
  if (slideCount.value === 0) return
  activeSlide.value = (index + slideCount.value) % slideCount.value
}

function showPrevious(): void {
  goToSlide(activeSlide.value - 1)
}

function showNext(): void {
  goToSlide(activeSlide.value + 1)
}

function startAutoplay(): void {
  stopAutoplay()
  if (reducedMotion.value || paused.value || slideCount.value < 2) return

  autoplayTimer = window.setInterval(showNext, AUTOPLAY_INTERVAL_MS)
}

function updateMotionPreference(event: MediaQueryListEvent): void {
  reducedMotion.value = event.matches
}

function setPaused(value: boolean): void {
  paused.value = value
}

function brandBackground(brand: ProductBrandPromotion): string {
  return `radial-gradient(circle at 82% 18%, ${brand.accent} 0, transparent 45%), linear-gradient(145deg, rgba(255,255,255,.94), rgba(255,255,255,.62))`
}

function brandMonogram(brand: ProductBrandPromotion): string {
  return brand.name
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

watch([paused, reducedMotion, slideCount], startAutoplay)

onMounted(() => {
  if (typeof window.matchMedia === 'function') {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = motionQuery.matches
    motionQuery.addEventListener('change', updateMotionPreference)
    startAutoplay()
  }
})

onBeforeUnmount(() => {
  stopAutoplay()
  motionQuery?.removeEventListener('change', updateMotionPreference)
})
</script>

<template>
  <section
    class="group/brand-slider relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-primary-100 bg-[#eaf2ee] p-4 shadow-xs sm:p-5"
    aria-label="Quảng bá thương hiệu chăm sóc da"
    data-brand-slider
    :data-active-slide="activeSlide"
    :data-autoplay-ms="AUTOPLAY_INTERVAL_MS"
    :data-autoplay-enabled="!reducedMotion"
    @mouseenter="setPaused(true)"
    @mouseleave="setPaused(false)"
    @focusin="setPaused(true)"
    @focusout="setPaused(false)"
  >
    <div class="flex items-center justify-between gap-4 px-1">
      <div>
        <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">
          Thương hiệu trong danh mục
        </p>
        <h2 class="mt-1 text-heading-4 text-primary-950">Chọn thương hiệu bạn quan tâm</h2>
      </div>
      <span class="hidden rounded-pill bg-white/70 px-3 py-1 text-caption text-primary-800 sm:inline">
        Visual demo
      </span>
    </div>

    <div class="relative mt-4 min-h-[17.5rem] flex-1">
      <div
        :class="cn(
          'grid h-full min-h-[17.5rem] gap-3 transition-opacity duration-500 motion-reduce:transition-none',
          activeSlide === 0
            ? 'grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] grid-rows-2 md:grid-cols-3 md:grid-rows-1'
            : 'grid-cols-2 md:grid-cols-3',
        )"
        :data-brand-slide="activeSlide"
      >
        <article
          v-if="activeSlide === 0"
          class="relative row-span-2 flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl bg-primary-900 p-4 text-primary-foreground md:row-span-1 md:p-5"
          data-featured-promotion
        >
          <div class="relative z-10">
            <p class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-100">
              {{ props.banner.eyebrow }}
            </p>
            <h3 class="mt-2 text-heading-3 text-primary-foreground">{{ props.banner.title }}</h3>
            <p class="mt-2 line-clamp-3 text-body-sm text-primary-100">
              {{ props.banner.description }}
            </p>
          </div>
          <a
            href="#product-results"
            class="relative z-10 mt-4 inline-flex min-h-9 w-fit items-center gap-1.5 rounded-lg bg-white px-3 text-caption font-semibold text-primary-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {{ props.banner.actionLabel }}
            <ChevronRight class="size-3.5" aria-hidden="true" />
          </a>
          <div class="absolute -bottom-8 -right-6 grid size-32 place-items-center rounded-full bg-white/10" aria-hidden="true">
            <PackageOpen class="size-14 text-primary-100/80" />
          </div>
        </article>

        <a
          v-for="brand in activeBrands"
          :key="brand.id"
          href="#product-results"
          class="motion-interactive relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/80 p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :style="{ background: brandBackground(brand) }"
          :aria-label="`Xem sản phẩm thương hiệu ${brand.name}`"
          :data-brand-tile="brand.id"
        >
          <span
            class="grid size-12 place-items-center rounded-2xl border border-white/80 bg-white/72 text-heading-4 font-semibold text-primary-800 shadow-xs"
            data-brand-visual
            aria-hidden="true"
          >
            {{ brandMonogram(brand) }}
          </span>
          <span class="mt-6">
            <strong class="block break-words text-body-md font-semibold text-primary-950" data-brand-wordmark>
              {{ brand.name }}
            </strong>
            <span v-if="brand.description" class="mt-1 line-clamp-2 block text-caption text-text-secondary">
              {{ brand.description }}
            </span>
            <span v-if="brand.productCount" class="mt-2 inline-flex items-center gap-1 text-caption font-medium text-primary-700">
              <Sparkles class="size-3.5" aria-hidden="true" />
              {{ brand.productCount }} sản phẩm demo
            </span>
          </span>
        </a>
      </div>

      <button
        type="button"
        class="motion-interactive absolute left-1 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/90 text-primary-900 opacity-80 shadow-sm focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:opacity-0 md:group-hover/brand-slider:opacity-100 md:group-focus-within/brand-slider:opacity-100"
        aria-label="Xem nhóm thương hiệu trước"
        @click="showPrevious"
      >
        <ChevronLeft class="size-4.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="motion-interactive absolute right-1 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/90 text-primary-900 opacity-80 shadow-sm focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:opacity-0 md:group-hover/brand-slider:opacity-100 md:group-focus-within/brand-slider:opacity-100"
        aria-label="Xem nhóm thương hiệu tiếp theo"
        @click="showNext"
      >
        <ChevronRight class="size-4.5" aria-hidden="true" />
      </button>
    </div>

    <div class="mt-4 flex justify-center gap-2" aria-label="Vị trí nhóm thương hiệu">
      <button
        v-for="(_, index) in brandGroups"
        :key="`brand-indicator-${index}`"
        type="button"
        :aria-label="`Chuyển đến nhóm thương hiệu ${index + 1}`"
        :aria-current="activeSlide === index ? 'true' : undefined"
        :class="cn(
          'h-1.5 rounded-pill transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          activeSlide === index ? 'w-8 bg-primary-800' : 'w-3 bg-primary-200',
        )"
        @click="goToSlide(index)"
      ></button>
    </div>
  </section>
</template>
