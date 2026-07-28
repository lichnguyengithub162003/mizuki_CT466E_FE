<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { cn } from '@/utils/cn'
import BaseButton from './BaseButton.vue'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    retryLabel?: string
    class?: string
  }>(),
  {
    description: undefined,
    retryLabel: 'Thử lại',
    class: undefined,
  },
)

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div
    :class="cn('grid place-items-center gap-4 rounded-xl border border-destructive/25 bg-destructive/5 p-8 text-center', props.class)"
    role="alert"
  >
    <div class="grid size-12 place-items-center rounded-pill bg-destructive/10 text-destructive">
      <TriangleAlert class="size-6" aria-hidden="true" />
    </div>
    <div class="grid max-w-md gap-2">
      <h3 class="text-heading-4">{{ props.title }}</h3>
      <p v-if="props.description" class="text-body-sm text-muted-foreground">{{ props.description }}</p>
    </div>
    <BaseButton variant="outline" @click="$emit('retry')">{{ props.retryLabel }}</BaseButton>
  </div>
</template>
