<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ProductCategoryBrand } from '@/types/products'
import { cn } from '@/utils/cn'

const AUTOPLAY_INTERVAL_MS = 6_000

const props = defineProps<{
  brands: readonly ProductCategoryBrand[]
}>()

const activeSlide = ref(0)
const groupSize = ref(6)
const paused = ref(false)
const reducedMotion = ref(false)
let autoplayTimer: number | undefined
let motionQuery: MediaQueryList | undefined

const brandGroups = computed(() => {
  const groups: ProductCategoryBrand[][] = []
  for (let index = 0; index < props.brands.length; index += groupSize.value) {
    groups.push(props.brands.slice(index, index + groupSize.value))
  }
  return groups
})
const slideCount = computed(() => brandGroups.value.length)
const activeBrands = computed(() => brandGroups.value[activeSlide.value] ?? [])

const toneClasses: Record<ProductCategoryBrand['tone'], string> = {
  mint: 'from-[#dcece4] to-[#f4f8f6]',
  rose: 'from-[#f0dddf] to-[#fbf5f5]',
  sand: 'from-[#eadfc9] to-[#faf6ee]',
  sky: 'from-[#dce8ee] to-[#f4f8fa]',
  lilac: 'from-[#e5dff0] to-[#f8f6fb]',
}

function updateGroupSize(): void {
  const nextSize = window.innerWidth >= 1024 ? 6 : window.innerWidth >= 640 ? 4 : 2
  if (groupSize.value !== nextSize) {
    groupSize.value = nextSize
    activeSlide.value = 0
  }
}

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

function startAutoplay(): void {
  stopAutoplay()
  if (paused.value || reducedMotion.value || slideCount.value < 2) return
  autoplayTimer = window.setInterval(() => goToSlide(activeSlide.value + 1), AUTOPLAY_INTERVAL_MS)
}

function updateMotionPreference(event: MediaQueryListEvent): void {
  reducedMotion.value = event.matches
}

watch([paused, reducedMotion, slideCount], startAutoplay)

onMounted(() => {
  updateGroupSize()
  window.addEventListener('resize', updateGroupSize)
  if (typeof window.matchMedia === 'function') {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = motionQuery.matches
    motionQuery.addEventListener('change', updateMotionPreference)
    startAutoplay()
  }
})

onBeforeUnmount(() => {
  stopAutoplay()
  window.removeEventListener('resize', updateGroupSize)
  motionQuery?.removeEventListener('change', updateMotionPreference)
})
</script>

<template>
  <section
    class="group/brand-slider relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-primary-100 bg-[#eaf2ee] p-4 shadow-xs sm:p-5"
    aria-label="Thương hiệu trong danh mục chăm sóc da"
    data-brand-slider
    :data-active-slide="activeSlide"
    :data-group-size="groupSize"
    :data-autoplay-ms="AUTOPLAY_INTERVAL_MS"
    :data-autoplay-enabled="!reducedMotion"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <div class="flex items-center justify-between gap-3 px-1">
      <div>
        <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">
          Thương hiệu trong danh mục
        </p>
        <h2 class="mt-1 text-heading-4 text-primary-950">Chọn thương hiệu bạn quan tâm</h2>
      </div>
      <span class="hidden rounded-pill bg-white/70 px-3 py-1 text-caption text-primary-800 sm:inline">
        12 thương hiệu demo
      </span>
    </div>

    <div
      class="mt-3 grid flex-1 auto-rows-fr grid-cols-2 gap-2.5 transition-opacity duration-300 motion-reduce:transition-none sm:grid-cols-2 lg:grid-cols-3"
      :data-brand-slide="activeSlide"
    >
      <a
        v-for="brand in activeBrands"
        :key="brand.id"
        href="#product-results"
        :class="cn(
          'motion-interactive grid min-w-0 grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-white/80 bg-gradient-to-br p-2.5 shadow-xs hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          toneClasses[brand.tone],
        )"
        :aria-label="`Xem sản phẩm thương hiệu ${brand.name}`"
        :data-brand-tile="brand.id"
      >
        <span
          class="relative grid h-full min-h-16 w-[4.25rem] place-items-center overflow-hidden rounded-xl border border-white/90 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.96),rgba(255,255,255,0.5))] p-2 shadow-xs"
          data-brand-image-area
        >
          <img
            v-if="brand.imageUrl"
            :src="brand.imageUrl"
            :alt="brand.imageAlt ?? `Sản phẩm đại diện ${brand.name}`"
            class="size-full object-contain"
            data-brand-product-image
          />
          <span
            v-else
            class="grid size-full place-items-center text-primary-800"
            role="img"
            :aria-label="`Minh họa sản phẩm thương hiệu ${brand.name}`"
            data-brand-image-placeholder
          >
            <span class="text-caption font-semibold" aria-hidden="true">
              {{ brand.initials }}
            </span>
            <span class="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white/75 px-1 text-[0.4375rem] font-medium" aria-hidden="true">
              Ảnh SP
            </span>
          </span>
        </span>
        <span class="min-w-0">
          <strong class="block truncate text-body-sm font-semibold text-primary-950" data-brand-wordmark>
            {{ brand.name }}
          </strong>
          <span class="mt-0.5 block truncate text-[0.6875rem] text-text-secondary">
            {{ brand.description ?? `${brand.productCount ?? 0} sản phẩm demo` }}
          </span>
          <span v-if="brand.productCount" class="mt-1 block text-[0.625rem] font-medium text-primary-700">
            {{ brand.productCount }} sản phẩm
          </span>
        </span>
      </a>
    </div>

    <button
      type="button"
      class="motion-interactive absolute left-1 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white bg-white/95 text-primary-900 opacity-90 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:opacity-0 md:group-hover/brand-slider:opacity-100 md:group-focus-within/brand-slider:opacity-100"
      aria-label="Xem nhóm thương hiệu trước"
      @click="goToSlide(activeSlide - 1)"
    >
      <ChevronLeft class="size-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="motion-interactive absolute right-1 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white bg-white/95 text-primary-900 opacity-90 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:opacity-0 md:group-hover/brand-slider:opacity-100 md:group-focus-within/brand-slider:opacity-100"
      aria-label="Xem nhóm thương hiệu tiếp theo"
      @click="goToSlide(activeSlide + 1)"
    >
      <ChevronRight class="size-4" aria-hidden="true" />
    </button>

    <div class="mt-3 flex justify-center gap-2" aria-label="Vị trí nhóm thương hiệu">
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
