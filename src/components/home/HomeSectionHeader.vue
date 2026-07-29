<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    actionLabel?: string
  }>(),
  {
    description: undefined,
    actionLabel: undefined,
  },
)

defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex items-end justify-between gap-4">
    <div class="min-w-0">
      <h2 class="text-heading-3 text-primary-950 sm:text-heading-2">{{ title }}</h2>
      <p v-if="description" class="mt-1 text-body-sm text-text-secondary">{{ description }}</p>
    </div>
    <button
      v-if="actionLabel"
      type="button"
      class="motion-interactive inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-pill px-3 text-body-sm font-medium text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      @click="$emit('action')"
    >
      {{ actionLabel }}
      <ArrowRight class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
