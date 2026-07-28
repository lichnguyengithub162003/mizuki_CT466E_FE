<script setup lang="ts">
import { cva } from 'class-variance-authority'
import { cn } from '@/utils/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'
type BadgeSize = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    variant?: BadgeVariant
    size?: BadgeSize
    class?: string
  }>(),
  {
    variant: 'default',
    size: 'md',
    class: undefined,
  },
)

const badgeVariants = cva('inline-flex w-fit items-center rounded-pill border font-semibold', {
  variants: {
    variant: {
      default: 'border-primary-200 bg-primary-100 text-primary-900',
      success: 'border-success/20 bg-success/10 text-success',
      warning: 'border-warning/25 bg-warning/15 text-warning',
      error: 'border-destructive/20 bg-destructive/10 text-destructive',
      info: 'border-info/20 bg-info/10 text-info',
      outline: 'border-border bg-transparent text-foreground',
    },
    size: {
      sm: 'px-2 py-0.5 text-caption',
      md: 'px-2.5 py-1 text-body-sm',
    },
  },
})
</script>

<template>
  <span :class="cn(badgeVariants({ variant: props.variant, size: props.size }), props.class)">
    <slot />
  </span>
</template>
