<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    description?: string
    error?: string
    required?: boolean
    class?: string
  }>(),
  {
    description: undefined,
    error: undefined,
    required: false,
    class: undefined,
  },
)

const descriptionId = computed(() => `${props.id}-description`)
const errorId = computed(() => `${props.id}-error`)
const describedBy = computed(() =>
  [props.description ? descriptionId.value : '', props.error ? errorId.value : '']
    .filter(Boolean)
    .join(' ') || undefined,
)
</script>

<template>
  <div :class="cn('grid gap-2', props.class)">
    <label :for="props.id" class="text-body-sm font-semibold text-foreground">
      {{ props.label }}
      <span v-if="props.required" class="text-destructive" aria-hidden="true">*</span>
      <span v-if="props.required" class="sr-only"> (bắt buộc)</span>
    </label>
    <slot
      :input-id="props.id"
      :description-id="descriptionId"
      :error-id="errorId"
      :described-by="describedBy"
    />
    <p v-if="props.description" :id="descriptionId" class="text-caption text-muted-foreground">
      {{ props.description }}
    </p>
    <p
      v-if="props.error"
      :id="errorId"
      class="text-caption text-destructive"
      role="alert"
    >
      <span class="sr-only">Lỗi: </span>{{ props.error }}
    </p>
  </div>
</template>

