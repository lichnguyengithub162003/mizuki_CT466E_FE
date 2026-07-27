<script setup lang="ts">
import { ROUTE_PATHS } from '@/constants/routes'
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-background px-4 py-12 text-foreground">
    <section class="w-full max-w-xl rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
      <p class="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">404</p>
      <h1 class="mt-3 text-3xl font-bold">Không tìm thấy trang</h1>
      <p class="mt-4 leading-7 text-muted-foreground">
        Đường dẫn bạn vừa mở không tồn tại hoặc đã được thay đổi.
      </p>
      <RouterLink
        :to="ROUTE_PATHS.foundation"
        class="mt-7 inline-flex rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"
      >
        Quay về trang nền tảng
      </RouterLink>
    </section>
  </main>
</template>
