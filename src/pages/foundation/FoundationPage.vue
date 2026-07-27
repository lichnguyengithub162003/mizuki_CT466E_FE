<script setup lang="ts">
import { ROUTE_PATHS } from '@/constants/routes'

const primaryScale = [
  { label: '50', className: 'bg-primary-50 text-primary-950' },
  { label: '100', className: 'bg-primary-100 text-primary-950' },
  { label: '200', className: 'bg-primary-200 text-primary-950' },
  { label: '300', className: 'bg-primary-300 text-primary-950' },
  { label: '400', className: 'bg-primary-400 text-primary-950' },
  { label: '500', className: 'bg-primary-500 text-primary-950' },
  { label: '600', className: 'bg-primary-600 text-primary-foreground' },
  { label: '700', className: 'bg-primary-700 text-primary-foreground' },
  { label: '800', className: 'bg-primary-800 text-primary-foreground' },
  { label: '900', className: 'bg-primary-900 text-primary-foreground' },
  { label: '950', className: 'bg-primary-950 text-primary-foreground' },
] as const

const semanticColors = [
  { label: 'Thành công', className: 'bg-success text-success-foreground' },
  { label: 'Cảnh báo', className: 'bg-warning text-warning-foreground' },
  { label: 'Lỗi', className: 'bg-destructive text-destructive-foreground' },
  { label: 'Thông tin', className: 'bg-info text-info-foreground' },
  { label: 'Cao cấp', className: 'bg-luxury text-luxury-foreground' },
] as const

const radiusSamples = [
  { label: 'XS · 6px', className: 'rounded-xs' },
  { label: 'SM · 8px', className: 'rounded-sm' },
  { label: 'MD · 12px', className: 'rounded-md' },
  { label: 'LG · 16px', className: 'rounded-lg' },
  { label: 'XL · 20px', className: 'rounded-xl' },
  { label: '2XL · 24px', className: 'rounded-2xl' },
  { label: 'Pill', className: 'rounded-pill' },
] as const

const shadowSamples = [
  { label: 'XS', className: 'shadow-xs' },
  { label: 'SM', className: 'shadow-sm' },
  { label: 'MD', className: 'shadow-md' },
  { label: 'LG', className: 'shadow-lg' },
] as const

const spacingSamples = [
  { label: '4', className: 'w-1' },
  { label: '8', className: 'w-2' },
  { label: '16', className: 'w-4' },
  { label: '24', className: 'w-6' },
  { label: '32', className: 'w-8' },
  { label: '48', className: 'w-12' },
  { label: '64', className: 'w-16' },
  { label: '80', className: 'w-20' },
  { label: '96', className: 'w-24' },
] as const
</script>

<template>
  <main class="min-h-svh overflow-x-clip bg-background text-foreground">
    <header class="bg-primary text-primary-foreground">
      <div class="app-container section-spacing">
        <p class="text-caption uppercase tracking-[0.2em] text-primary-foreground/80">
          F2a · Design tokens
        </p>
        <h1 class="text-display-xl mt-4 max-w-3xl text-primary-foreground">Mizuki foundation</h1>
        <p class="text-body-lg mt-5 max-w-2xl text-primary-foreground/85">
          Trang kiểm tra trực quan cho màu sắc, typography, khoảng cách và nền responsive của Mizuki.
        </p>
      </div>
    </header>

    <div class="content-container">
      <section class="section-spacing" data-token-section="typography">
        <div class="mb-8 max-w-2xl">
          <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Typography</p>
          <h2 class="text-heading-1 mt-2">Phân cấp rõ ràng, thoáng và dễ đọc</h2>
        </div>
        <div class="grid gap-6 rounded-xl border border-border bg-surface p-6 shadow-xs md:p-8">
          <p class="text-display-xl">Display XL</p>
          <p class="text-display-lg">Display Large</p>
          <p class="text-heading-1">Heading 1</p>
          <p class="text-heading-2">Heading 2</p>
          <p class="text-heading-3">Heading 3</p>
          <p class="text-heading-4">Heading 4</p>
          <div class="grid gap-3 border-t border-border pt-6 md:grid-cols-3">
            <p class="text-body-lg">Body Large · Nội dung nổi bật</p>
            <p class="text-body-md">Body Medium · Nội dung mặc định</p>
            <p class="text-body-sm">Body Small · Thông tin bổ trợ</p>
          </div>
          <p class="text-caption text-muted-foreground">Caption · Nhãn và chú thích ngắn</p>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="colors">
        <div class="mb-8">
          <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Màu sắc</p>
          <h2 class="text-heading-2 mt-2">Primary scale và semantic colors</h2>
        </div>

        <div class="grid grid-cols-2 overflow-hidden rounded-xl border border-border sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11">
          <div
            v-for="color in primaryScale"
            :key="color.label"
            :class="['flex min-h-24 items-end p-3 text-caption font-semibold', color.className]"
          >
            {{ color.label }}
          </div>
        </div>

        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div
            v-for="color in semanticColors"
            :key="color.label"
            :class="['rounded-lg px-5 py-6 text-body-md font-semibold', color.className]"
          >
            {{ color.label }}
          </div>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="surfaces">
        <div class="mb-8">
          <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Neutral surfaces</p>
          <h2 class="text-heading-2 mt-2">Nền và phân cấp nội dung</h2>
        </div>
        <div class="grid overflow-hidden rounded-xl border border-border md:grid-cols-3">
          <div class="min-h-40 bg-background p-6">
            <p class="text-heading-4">Background</p>
            <p class="text-body-sm mt-2 text-muted-foreground">#FAFAF7</p>
          </div>
          <div class="min-h-40 bg-surface p-6">
            <p class="text-heading-4">Surface</p>
            <p class="text-body-sm mt-2 text-muted-foreground">#FFFFFF</p>
          </div>
          <div class="min-h-40 bg-surface-subtle p-6">
            <p class="text-heading-4">Surface subtle</p>
            <p class="text-body-sm mt-2 text-muted-foreground">#F5F6F3</p>
          </div>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="shape">
        <div class="grid gap-12 lg:grid-cols-2">
          <div>
            <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Radius</p>
            <h2 class="text-heading-2 mt-2">Bo góc có hệ thống</h2>
            <div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div
                v-for="radius in radiusSamples"
                :key="radius.label"
                :class="['grid min-h-24 place-items-center border border-primary-200 bg-primary-50 p-3 text-caption', radius.className]"
              >
                {{ radius.label }}
              </div>
            </div>
          </div>

          <div>
            <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Shadow</p>
            <h2 class="text-heading-2 mt-2">Độ nổi nhẹ và tiết chế</h2>
            <div class="mt-8 grid grid-cols-2 gap-5">
              <div
                v-for="shadow in shadowSamples"
                :key="shadow.label"
                :class="['grid min-h-28 place-items-center rounded-lg border border-border bg-surface text-caption', shadow.className]"
              >
                {{ shadow.label }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="spacing">
        <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Spacing</p>
        <h2 class="text-heading-2 mt-2">Nhịp 4px nhất quán</h2>
        <div class="mt-8 grid gap-4">
          <div v-for="space in spacingSamples" :key="space.label" class="flex min-w-0 items-center gap-4">
            <span class="w-10 shrink-0 text-caption text-muted-foreground">{{ space.label }}px</span>
            <span :class="['h-4 max-w-full rounded-pill bg-primary-400', space.className]"></span>
          </div>
        </div>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="layout">
        <p class="text-caption uppercase tracking-[0.16em] text-muted-foreground">Layout</p>
        <h2 class="text-heading-2 mt-2">Container responsive</h2>
        <div class="mt-8 grid gap-4 md:grid-cols-3">
          <article class="rounded-lg border border-border bg-surface p-6 shadow-xs">
            <p class="text-heading-4">App</p>
            <p class="text-body-sm mt-2 text-muted-foreground">Tối đa 1440px</p>
          </article>
          <article class="rounded-lg border border-border bg-surface p-6 shadow-xs">
            <p class="text-heading-4">Content</p>
            <p class="text-body-sm mt-2 text-muted-foreground">Tối đa 1280px</p>
          </article>
          <article class="rounded-lg border border-border bg-surface p-6 shadow-xs">
            <p class="text-heading-4">Readable</p>
            <p class="text-body-sm mt-2 text-muted-foreground">Tối đa 760px</p>
          </article>
        </div>
        <p class="text-body-md mt-6 text-muted-foreground">
          Padding ngang: mobile 16px · tablet 20px · laptop 24px · desktop 32px.
          Section spacing: 40px · 56px · 80px.
        </p>
      </section>

      <section class="section-spacing border-t border-border" data-token-section="responsive">
        <div class="rounded-2xl bg-primary-50 p-6 md:p-10">
          <p class="text-caption uppercase tracking-[0.16em] text-primary-700">Responsive baseline</p>
          <h2 class="text-heading-2 mt-2">Desktop-first, co giãn có chủ đích</h2>
          <p class="text-body-lg mt-4 max-w-3xl text-text-secondary">
            Breakpoints chuẩn: 640, 768, 1024, 1280 và 1536px. Trang này dùng grid co giãn,
            container có padding theo viewport và không tạo overflow ngang ở 390px.
          </p>
        </div>
      </section>

      <nav class="section-spacing flex flex-wrap gap-3 border-t border-border" aria-label="Kiểm tra router">
        <RouterLink
          :to="ROUTE_PATHS.forbidden"
          class="rounded-md bg-primary px-5 py-3 text-body-md font-semibold text-primary-foreground transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-primary-800 focus-visible:outline-ring"
        >
          Mở trang không có quyền
        </RouterLink>
        <RouterLink
          :to="ROUTE_PATHS.notFoundExample"
          class="rounded-md border border-border bg-surface px-5 py-3 text-body-md font-semibold text-foreground transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-surface-subtle focus-visible:outline-ring"
        >
          Kiểm tra trang 404
        </RouterLink>
      </nav>
    </div>
  </main>
</template>
