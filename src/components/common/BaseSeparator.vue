<script setup lang="ts">
import { Separator } from 'reka-ui'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    orientation?: 'horizontal' | 'vertical'
    decorative?: boolean
    class?: string
  }>(),
  {
    orientation: 'horizontal',
    decorative: true,
    class: undefined,
  },
)
</script>

<template>
  <Separator
    :orientation="props.orientation"
    :decorative="props.decorative"
    :class="
      cn(
        'shrink-0 bg-border',
        props.orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        props.class,
      )
    "
  />
</template>
