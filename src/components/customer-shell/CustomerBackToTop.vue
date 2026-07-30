<script setup lang="ts">
import { ArrowUp } from '@lucide/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const VISIBILITY_THRESHOLD = 560
const isVisible = ref(false)

function updateVisibility(): void {
  isVisible.value = typeof window !== 'undefined' && window.scrollY >= VISIBILITY_THRESHOLD
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollToTop(): void {
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') {
    return
  }

  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

onMounted(() => {
  updateVisibility()
  window.addEventListener('scroll', updateVisibility, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateVisibility)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-fast ease-apple-out motion-reduce:transition-none"
    enter-from-class="translate-y-2 opacity-0 motion-reduce:translate-y-0"
    leave-active-class="transition duration-fast ease-apple-in motion-reduce:transition-none"
    leave-to-class="translate-y-2 opacity-0 motion-reduce:translate-y-0"
  >
    <button
      v-if="isVisible"
      type="button"
      class="motion-interactive fixed bottom-[10rem] right-3 z-30 grid size-11 place-items-center rounded-full border border-primary-200 bg-surface/95 text-primary-900 shadow-md backdrop-blur-md hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:bottom-[5.5rem] md:right-6"
      aria-label="Quay lên đầu trang"
      data-customer-back-to-top
      @click="scrollToTop"
    >
      <ArrowUp class="size-5" aria-hidden="true" />
    </button>
  </Transition>
</template>
