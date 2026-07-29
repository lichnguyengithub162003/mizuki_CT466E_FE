<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { HomeQuickLink } from '@/types/home'
import HomeIcon from './HomeIcon.vue'

defineProps<{
  links: readonly HomeQuickLink[]
}>()
</script>

<template>
  <nav aria-label="Truy cập nhanh trang chủ">
    <ul class="grid grid-cols-4 gap-2 sm:grid-cols-8">
      <li v-for="link in links" :key="link.id" class="min-w-0">
        <RouterLink
          :to="link.href"
          class="motion-interactive flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-2 py-3 text-center shadow-xs hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span class="grid size-10 place-items-center rounded-2xl bg-admin-sage-soft text-primary-800">
            <HomeIcon :name="link.icon" class="size-5" />
          </span>
          <span class="line-clamp-2 text-caption font-medium text-primary-950">{{ link.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
