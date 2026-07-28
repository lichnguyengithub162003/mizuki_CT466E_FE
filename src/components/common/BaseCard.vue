<script setup lang="ts">
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    class?: string
  }>(),
  {
    class: undefined,
  },
)
</script>

<template>
  <article :class="cn('overflow-hidden rounded-xl border border-border bg-surface shadow-xs', props.class)">
    <header v-if="$slots.header || $slots.title || $slots.description" class="grid gap-2 p-6">
      <slot name="header">
        <h3 v-if="$slots.title" class="text-heading-4"><slot name="title" /></h3>
        <p v-if="$slots.description" class="text-body-sm text-muted-foreground">
          <slot name="description" />
        </p>
      </slot>
    </header>
    <div v-if="$slots.default" class="px-6 pb-6"><slot /></div>
    <footer v-if="$slots.footer" class="border-t border-border bg-surface-subtle px-6 py-4">
      <slot name="footer" />
    </footer>
  </article>
</template>
