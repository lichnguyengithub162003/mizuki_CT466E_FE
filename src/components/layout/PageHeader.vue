<script setup lang="ts">
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    class?: string
  }>(),
  {
    description: undefined,
    class: undefined,
  },
)
</script>

<template>
  <div :class="cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', props.class)">
    <div class="min-w-0 max-w-3xl">
      <div v-if="$slots.eyebrow" class="mb-1.5 text-caption uppercase tracking-[0.14em] text-primary-700">
        <slot name="eyebrow" />
      </div>
      <h1 class="text-[clamp(2rem,3.1vw,2.85rem)] font-semibold leading-[1.08] tracking-[-0.04em]">
        {{ props.title }}
      </h1>
      <p v-if="props.description" class="mt-2 text-body-md text-muted-foreground">
        {{ props.description }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
