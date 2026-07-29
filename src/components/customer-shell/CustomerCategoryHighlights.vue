<script setup lang="ts">
import { Droplets, Leaf, Palette, Scissors } from '@lucide/vue'
import type { Component, CSSProperties } from 'vue'

interface CategoryHighlight {
  readonly label: string
  readonly caption: string
  readonly icon: Component
  readonly background: CSSProperties
}

const categories: readonly CategoryHighlight[] = [
  {
    label: 'Chăm sóc da',
    caption: 'Làm sạch và dưỡng da',
    icon: Droplets,
    background: {
      background:
        'radial-gradient(circle at 82% 18%, rgba(255,255,255,.88) 0 13%, transparent 14%), linear-gradient(135deg, #dfeee8 0%, #bcd8cb 100%)',
    },
  },
  {
    label: 'Trang điểm',
    caption: 'Sắc màu mỗi ngày',
    icon: Palette,
    background: {
      background:
        'radial-gradient(circle at 78% 24%, rgba(255,255,255,.72) 0 16%, transparent 17%), linear-gradient(135deg, #f3e7e1 0%, #dfc4bd 100%)',
    },
  },
  {
    label: 'Chăm sóc tóc',
    caption: 'Mái tóc mềm khỏe',
    icon: Scissors,
    background: {
      background:
        'radial-gradient(circle at 82% 22%, rgba(255,255,255,.72) 0 14%, transparent 15%), linear-gradient(135deg, #e7eadf 0%, #cad4b7 100%)',
    },
  },
  {
    label: 'Dịch vụ',
    caption: 'Chăm sóc tại chi nhánh',
    icon: Leaf,
    background: {
      background:
        'radial-gradient(circle at 78% 22%, rgba(255,255,255,.76) 0 15%, transparent 16%), linear-gradient(135deg, #e5ece9 0%, #c5d4ca 100%)',
    },
  },
]
</script>

<template>
  <section class="py-8" aria-labelledby="category-preview-title">
    <div class="flex items-end justify-between gap-4">
      <div>
        <p class="text-caption uppercase tracking-[0.12em] text-primary-700">Khám phá nhanh</p>
        <h2 id="category-preview-title" class="mt-1 text-heading-3">Danh mục nổi bật</h2>
      </div>
      <span class="hidden text-body-sm text-muted-foreground sm:block">
        Nội dung minh họa
      </span>
    </div>

    <div class="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      <article
        v-for="category in categories"
        :key="category.label"
        class="admin-premium-card relative isolate flex min-h-36 overflow-hidden rounded-3xl border border-white/75 p-4 shadow-xs"
        :style="category.background"
      >
        <div class="absolute inset-0 bg-gradient-to-t from-white/64 via-white/10 to-transparent" aria-hidden="true"></div>
        <div class="relative z-1 mt-auto">
          <span class="grid size-10 place-items-center rounded-2xl bg-white/78 text-primary-800 shadow-xs backdrop-blur-sm">
            <component :is="category.icon" class="size-5" aria-hidden="true" />
          </span>
          <h3 class="mt-3 text-body-md font-semibold text-primary-950">{{ category.label }}</h3>
          <p class="mt-0.5 text-caption text-primary-900/75">{{ category.caption }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
