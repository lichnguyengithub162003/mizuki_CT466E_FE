<script setup lang="ts">
import { cn } from '@/utils/cn'
import BaseSpinner from '@/components/common/BaseSpinner.vue'

const props = withDefaults(
  defineProps<{
    label?: string
    positioned?: boolean
    class?: string
  }>(),
  {
    label: 'Đang cập nhật',
    positioned: false,
    class: undefined,
  },
)
</script>

<template>
  <div
    :class="cn(
      'inline-flex items-center gap-2 rounded-pill bg-primary-50 px-3 py-2 text-body-sm font-medium text-primary-800 shadow-xs',
      props.positioned && 'absolute right-3 top-3 z-10',
      props.class,
    )"
    role="status"
    aria-live="polite"
  >
    <BaseSpinner size="sm" decorative />
    <span>{{ props.label }}</span>
  </div>
</template>
