<script setup lang="ts">
import { cn } from '@/utils/cn'

type SkeletonShape = 'rectangle' | 'circle' | 'text'

const props = withDefaults(
  defineProps<{
    shape?: SkeletonShape
    class?: string
  }>(),
  {
    shape: 'rectangle',
    class: undefined,
  },
)

const shapeClasses: Record<SkeletonShape, string> = {
  rectangle: 'rounded-md',
  circle: 'rounded-pill',
  text: 'h-4 rounded-xs',
}
</script>

<template>
  <div
    :class="cn('motion-skeleton bg-primary-100', shapeClasses[props.shape], props.class)"
    aria-hidden="true"
  />
</template>
