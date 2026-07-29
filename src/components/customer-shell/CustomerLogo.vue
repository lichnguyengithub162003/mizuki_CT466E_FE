<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    class?: string
  }>(),
  {
    compact: false,
    class: undefined,
  },
)
</script>

<template>
  <RouterLink
    to="/customer-shell"
    :class="cn(
      'inline-flex min-h-11 shrink-0 items-center rounded-xl text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      props.class,
    )"
    aria-label="MIZUKI"
  >
    <span
      :class="cn(
        'customer-wordmark leading-none',
        props.compact ? 'text-[1.25rem]' : 'text-[1.65rem]',
      )"
    >
      MIZUKI
    </span>
  </RouterLink>
</template>
