<script setup lang="ts">
import { ROUTE_PATHS } from '@/constants/routes'
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-background text-foreground">
    <div class="readable-container section-spacing">
      <section class="rounded-xl border border-border bg-surface p-6 text-center shadow-sm md:p-10">
      <p class="text-caption uppercase tracking-[0.2em] text-muted-foreground">403</p>
      <h1 class="text-heading-1 mt-3">Bạn không có quyền truy cập</h1>
      <p class="text-body-lg mt-4 text-muted-foreground">
        Tài khoản hiện tại không được phép mở nội dung này.
      </p>
      <RouterLink
        :to="ROUTE_PATHS.foundation"
        class="mt-7 inline-flex rounded-md bg-primary px-5 py-3 text-body-md font-semibold text-primary-foreground transition-colors duration-(--duration-fast) hover:bg-primary-800 focus-visible:outline-ring"
      >
        Quay về trang nền tảng
      </RouterLink>
      </section>
    </div>
  </main>
</template>
