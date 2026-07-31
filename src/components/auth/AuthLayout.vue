<script setup lang="ts">
import AuthVisual from './AuthVisual.vue'

defineProps<{
  visualTitle: string
  visualDescription: string
  mobileVisualSrc: string
  desktopVisualSrc: string
}>()
</script>

<template>
  <main class="min-h-svh bg-surface-subtle md:grid md:place-items-center md:p-4">
    <div
      class="mx-auto min-h-svh w-full max-w-[72rem] overflow-hidden bg-surface md:grid md:h-[calc(100svh-2rem)] md:min-h-[40rem] md:max-h-[44rem] md:grid-cols-[minmax(22rem,0.9fr)_minmax(27rem,1.1fr)] md:rounded-[1.75rem] md:border md:border-border md:p-2 md:shadow-lg"
      data-testid="auth-shell"
    >
      <div class="h-[16.5rem] md:order-2 md:h-full">
        <AuthVisual
          :title="visualTitle"
          :description="visualDescription"
          :mobile-src="mobileVisualSrc"
          :desktop-src="desktopVisualSrc"
        />
      </div>
      <section
        class="relative z-10 -mt-9 rounded-t-[2rem] bg-surface px-5 pb-7 pt-6 md:order-1 md:mt-0 md:flex md:items-center md:overflow-y-auto md:rounded-none md:px-9 md:py-7 lg:px-11"
        data-testid="auth-form-panel"
      >
        <div class="mx-auto w-full max-w-md">
          <RouterLink
            to="/home"
            class="customer-wordmark inline-flex rounded-sm text-[1.35rem] text-primary-900 no-underline focus-visible:outline-ring"
            aria-label="Mizuki - về trang chủ"
          >
            MIZUKI
          </RouterLink>
          <slot />
        </div>
      </section>
    </div>
  </main>
</template>
