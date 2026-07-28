<script setup lang="ts">
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    class?: string
  }>(),
  {
    class: undefined,
  },
)
</script>

<template>
  <div :class="cn('w-full min-w-0 px-4 sm:px-5 lg:px-6 xl:px-8', props.class)">
    <slot />
  </div>
</template>
