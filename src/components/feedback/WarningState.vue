<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { cn } from '@/utils/cn'

const props = defineProps<{
  title: string
  description?: string
  class?: string
}>()
</script>

<template>
  <div
    :class="cn('grid place-items-center gap-4 rounded-xl border border-warning/30 bg-warning/15 p-8 text-center', props.class)"
    role="status"
    aria-live="polite"
  >
    <div class="grid size-12 place-items-center rounded-pill bg-surface text-warning shadow-xs">
      <slot name="icon"><TriangleAlert class="size-6" aria-hidden="true" /></slot>
    </div>
    <div class="grid max-w-md gap-2">
      <h3 class="text-heading-4">{{ props.title }}</h3>
      <p v-if="props.description" class="text-body-sm text-foreground">{{ props.description }}</p>
    </div>
    <div v-if="$slots.action"><slot name="action" /></div>
  </div>
</template>
