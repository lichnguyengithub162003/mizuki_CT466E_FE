<script setup lang="ts">
import { ROUTE_PATHS } from '@/constants/routes'

const foundationItems = [
  'Vue',
  'Vue Router',
  'Pinia',
  'TanStack Query',
  'Axios',
  'Tailwind CSS',
] as const
</script>

<template>
  <main class="min-h-svh bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
    <section
      class="mx-auto max-w-5xl overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
    >
      <header class="bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-14">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/75">
          Frontend foundation
        </p>
        <h1 class="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Mizuki</h1>
        <p class="mt-4 max-w-2xl text-base leading-7 text-primary-foreground/85">
          Nền tảng kỹ thuật đã sẵn sàng cho các module giao diện và nghiệp vụ tiếp theo.
        </p>
      </header>

      <div class="p-6 sm:p-10">
        <h2 class="text-xl font-semibold">Các thành phần nền tảng</h2>
        <ul class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="item in foundationItems"
            :key="item"
            class="flex items-center gap-3 rounded-md border border-border bg-surface-subtle px-4 py-3"
          >
            <span class="size-2.5 rounded-full bg-primary" aria-hidden="true"></span>
            <span class="font-medium">{{ item }}</span>
          </li>
        </ul>

        <nav class="mt-8 flex flex-wrap gap-3" aria-label="Kiểm tra router">
          <RouterLink
            :to="ROUTE_PATHS.forbidden"
            class="rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"
          >
            Mở trang không có quyền
          </RouterLink>
          <RouterLink
            :to="ROUTE_PATHS.notFoundExample"
            class="rounded-md border border-border bg-surface px-4 py-2.5 font-semibold text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"
          >
            Kiểm tra trang 404
          </RouterLink>
        </nav>
      </div>
    </section>
  </main>
</template>
