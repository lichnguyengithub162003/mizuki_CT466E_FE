<script setup lang="ts">
import { Inbox } from '@lucide/vue'
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
  <div :class="cn('grid place-items-center gap-4 rounded-xl border border-dashed border-border bg-surface-subtle p-8 text-center', props.class)">
    <div class="grid size-12 place-items-center rounded-pill bg-primary-100 text-primary-700">
      <slot name="icon"><Inbox class="size-6" aria-hidden="true" /></slot>
    </div>
    <div class="grid max-w-md gap-2">
      <h3 class="text-heading-4">{{ props.title }}</h3>
      <p v-if="props.description" class="text-body-sm text-muted-foreground">{{ props.description }}</p>
    </div>
    <div v-if="$slots.action"><slot name="action" /></div>
  </div>
</template>
