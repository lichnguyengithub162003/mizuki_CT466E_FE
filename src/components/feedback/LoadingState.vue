<script setup lang="ts">
import { cn } from '@/utils/cn'
import BaseSpinner from '@/components/common/BaseSpinner.vue'

const props = withDefaults(
  defineProps<{
    label?: string
    description?: string
    centered?: boolean
    class?: string
  }>(),
  {
    label: 'Đang tải dữ liệu',
    description: undefined,
    centered: true,
    class: undefined,
  },
)
</script>

<template>
  <div
    :class="cn('flex gap-3 text-foreground', props.centered ? 'min-h-28 items-center justify-center text-center' : 'items-start', props.class)"
    role="status"
    aria-live="polite"
  >
    <BaseSpinner class="mt-0.5 text-primary" decorative />
    <div>
      <p class="text-body-md font-semibold">{{ props.label }}</p>
      <p v-if="props.description" class="mt-1 text-body-sm text-muted-foreground">
        {{ props.description }}
      </p>
    </div>
  </div>
</template>
