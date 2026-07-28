<script setup lang="ts">
import { Leaf } from '@lucide/vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    to?: RouteLocationRaw
    class?: string
  }>(),
  {
    compact: false,
    to: '/',
    class: undefined,
  },
)
</script>

<template>
  <RouterLink
    :to="props.to"
    :class="cn('inline-flex min-h-11 items-center gap-3 rounded-md text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', props.class)"
    :aria-label="props.compact ? 'Mizuki Admin' : undefined"
  >
    <span class="grid size-10 shrink-0 place-items-center rounded-xl border border-white/80 bg-primary-100/80 shadow-xs">
      <Leaf class="size-5" aria-hidden="true" />
    </span>
    <span v-if="!props.compact" class="min-w-0">
      <span class="block text-heading-4 leading-none tracking-[-0.025em]">Mizuki</span>
      <span class="mt-1 block text-caption uppercase tracking-[0.14em] text-muted-foreground">Admin</span>
    </span>
  </RouterLink>
</template>
