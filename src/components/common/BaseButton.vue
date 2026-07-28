<script setup lang="ts">
import { cva } from 'class-variance-authority'
import { cn } from '@/utils/cn'
import BaseSpinner from './BaseSpinner.vue'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'
type ButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    type?: ButtonType
    loading?: boolean
    disabled?: boolean
    class?: string
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    loading: false,
    disabled: false,
    class: undefined,
  },
)

const buttonVariants = cva(
  'motion-interactive inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-800',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-primary-200',
        outline: 'border border-border bg-surface text-foreground hover:bg-surface-subtle',
        ghost: 'bg-transparent text-foreground hover:bg-primary-50 hover:text-primary-900',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-destructive',
      },
      size: {
        sm: 'h-9 px-3 text-body-sm',
        md: 'h-11 px-4 text-body-md',
        lg: 'h-12 px-6 text-body-lg',
        icon: 'size-11 p-0',
      },
    },
  },
)
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :aria-busy="props.loading || undefined"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)"
  >
    <BaseSpinner v-if="props.loading" size="sm" decorative />
    <span v-else-if="$slots.icon" aria-hidden="true"><slot name="icon" /></span>
    <slot />
  </button>
</template>
