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
  <main class="min-h-svh bg-surface-subtle md:flex md:items-start md:justify-center md:p-4">
    <div
      class="mx-auto min-h-svh w-full overflow-hidden bg-surface md:my-auto md:min-h-0 md:max-w-176 md:rounded-[1.75rem] md:border md:border-border md:shadow-lg lg:grid lg:min-h-[min(48rem,calc(100svh-3rem))] lg:max-w-6xl lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:p-2"
      data-testid="auth-shell"
    >
      <div class="h-58 md:h-60 lg:order-2 lg:h-full">
        <AuthVisual
          :title="visualTitle"
          :description="visualDescription"
          :mobile-src="mobileVisualSrc"
          :desktop-src="desktopVisualSrc"
        />
      </div>
      <section
        class="relative z-10 -mt-10 rounded-t-4xl bg-surface px-5 pb-8 pt-7 sm:px-7 md:-mt-8 md:px-10 md:pb-10 md:pt-8 lg:order-1 lg:mt-0 lg:flex lg:rounded-none lg:px-9 lg:py-6 xl:px-11"
        data-testid="auth-form-panel"
      >
        <div class="mx-auto w-full max-w-md lg:my-auto">
          <RouterLink
            to="/home"
            class="customer-wordmark inline-flex rounded-sm text-[1.3rem] text-primary-900 no-underline focus-visible:outline-ring sm:text-[1.35rem]"
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
