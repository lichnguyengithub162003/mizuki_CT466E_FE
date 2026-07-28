<script setup lang="ts">
import { cn } from '@/utils/cn'

type SpinnerSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    size?: SpinnerSize
    label?: string
    decorative?: boolean
    class?: string
  }>(),
  {
    size: 'md',
    label: 'Đang tải',
    decorative: false,
    class: undefined,
  },
)

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-8',
}
</script>

<template>
  <span
    :class="cn('inline-flex shrink-0 animate-spin text-current', sizeClasses[props.size], props.class)"
    :role="props.decorative ? undefined : 'status'"
    :aria-hidden="props.decorative ? true : undefined"
    :aria-label="props.decorative ? undefined : props.label"
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
      <path
        class="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="3"
      />
    </svg>
  </span>
</template>
