<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import HomeIcon from '@/components/home/HomeIcon.vue'
import type { ProductFeaturedCategory } from '@/types/products'
import { cn } from '@/utils/cn'

const props = defineProps<{
  categories: readonly ProductFeaturedCategory[]
}>()

const toneClasses: Record<ProductFeaturedCategory['tone'], string> = {
  sage: 'bg-[#dfe8e2]',
  mint: 'bg-[#e5f2ed]',
  apricot: 'bg-[#f4e5d8]',
  powder: 'bg-[#e7edf3]',
  rose: 'bg-[#f3e5e5]',
  sand: 'bg-[#f2ecdf]',
}
</script>

<template>
  <section aria-labelledby="featured-category-heading">
    <div>
      <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">
        Lối tắt mua sắm
      </p>
      <h2 id="featured-category-heading" class="mt-1 text-heading-2">Danh mục nổi bật</h2>
    </div>

    <div class="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
      <RouterLink
        v-for="category in props.categories"
        :key="category.id"
        :to="category.href"
        :data-featured-category="category.id"
        :class="cn(
          'motion-interactive group flex min-w-0 flex-col rounded-2xl border border-white/75 p-3.5 shadow-xs hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          toneClasses[category.tone],
        )"
      >
        <span class="flex items-start justify-between gap-2">
          <span class="grid size-10 place-items-center rounded-xl bg-white/70 text-primary-800">
            <HomeIcon :name="category.icon" class="size-5" />
          </span>
          <ArrowUpRight class="size-4 text-primary-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </span>
        <strong class="mt-4 text-body-sm font-semibold text-primary-950">{{ category.label }}</strong>
        <span class="mt-1 line-clamp-2 text-caption text-text-secondary">{{ category.description }}</span>
      </RouterLink>
    </div>
  </section>
</template>
