<script setup lang="ts">
import { ChevronLeft, ChevronRight, MapPin } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import type { ProductDetailBranch } from '@/types/products'
import { cn } from '@/utils/cn'

const props = defineProps<{
  branches: readonly ProductDetailBranch[]
}>()

const carousel = ref<HTMLElement>()
const activeIndex = ref(0)
const lastIndex = computed(() => Math.max(props.branches.length - 1, 0))

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollToBranch(index: number): void {
  if (props.branches.length === 0) return

  activeIndex.value = Math.min(Math.max(index, 0), lastIndex.value)
  const target = carousel.value?.querySelector<HTMLElement>(
    `[data-branch-index="${activeIndex.value}"]`,
  )

  if (typeof target?.scrollIntoView === 'function') {
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'start',
    })
  }
}

function showPrevious(): void {
  scrollToBranch(activeIndex.value - 1)
}

function showNext(): void {
  scrollToBranch(activeIndex.value + 1)
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

watch(
  () => props.branches.length,
  () => {
    if (activeIndex.value > lastIndex.value) {
      activeIndex.value = lastIndex.value
    }
  },
)
</script>

<template>
  <div
    class="min-w-0"
    role="region"
    aria-label="Tình trạng sản phẩm tại các chi nhánh"
    data-branch-carousel
    :data-active-index="activeIndex"
  >
    <div
      class="flex flex-nowrap items-center justify-between gap-3"
      data-branch-carousel-header
    >
      <div class="min-w-0 flex-1">
        <slot name="heading" />
      </div>
      <div class="flex flex-none items-center gap-2" data-branch-carousel-controls>
        <button
          type="button"
          class="motion-interactive grid size-10 place-items-center rounded-full border border-primary-200 bg-white text-primary-900 shadow-xs hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Xem chi nhánh trước"
          :disabled="activeIndex === 0"
          @click="showPrevious"
        >
          <ChevronLeft class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="motion-interactive grid size-10 place-items-center rounded-full border border-primary-200 bg-white text-primary-900 shadow-xs hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Xem chi nhánh tiếp theo"
          :disabled="activeIndex === lastIndex"
          @click="showNext"
        >
          <ChevronRight class="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      ref="carousel"
      class="mt-4 flex snap-x snap-mandatory flex-nowrap items-stretch gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-branch-carousel-row
      tabindex="0"
      @keydown="handleKeyboard"
    >
      <article
        v-for="(branch, index) in props.branches"
        :key="branch.id"
        class="flex h-auto min-w-0 shrink-0 basis-[82%] snap-start flex-col rounded-2xl border border-primary-100 bg-white p-5 sm:basis-[70%] md:basis-[calc((100%_-_0.75rem)/2)] lg:basis-[calc((100%_-_1.5rem)/3)]"
        data-branch-card
        :data-branch-index="index"
        :data-branch-stock="branch.stockState"
      >
        <div class="flex items-start justify-between gap-3">
          <strong class="text-primary-950">{{ branch.name }}</strong>
          <span
            :class="cn(
              'shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold',
              branch.stockState === 'available'
                ? 'bg-primary-50 text-primary-800'
                : branch.stockState === 'low-stock'
                  ? 'bg-[#fff2d6] text-[#805914]'
                  : 'bg-[#fce8e6] text-[#9c302a]',
            )"
          >
            {{ branch.stockLabel }}
          </span>
        </div>
        <p class="mt-3 flex gap-2 text-body-sm leading-relaxed text-text-secondary">
          <MapPin class="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true" />
          {{ branch.address }}
        </p>
      </article>
    </div>
  </div>
</template>
