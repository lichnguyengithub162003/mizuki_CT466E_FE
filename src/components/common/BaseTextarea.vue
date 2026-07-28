<script setup lang="ts">
import { computed, useId } from 'vue'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    id?: string
    label: string
    description?: string
    error?: string
    placeholder?: string
    rows?: number
    maxLength?: number
    showCharacterCount?: boolean
    disabled?: boolean
    required?: boolean
    class?: string
  }>(),
  {
    modelValue: '',
    id: undefined,
    description: undefined,
    error: undefined,
    placeholder: undefined,
    rows: 4,
    maxLength: undefined,
    showCharacterCount: false,
    disabled: false,
    required: false,
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const generatedId = useId()
const textareaId = computed(() => props.id ?? generatedId)
const descriptionId = computed(() => `${textareaId.value}-description`)
const errorId = computed(() => `${textareaId.value}-error`)
const describedBy = computed(() =>
  [props.description ? descriptionId.value : '', props.error ? errorId.value : '']
    .filter(Boolean)
    .join(' ') || undefined,
)

function handleInput(event: Event): void {
  const target = event.target
  if (target instanceof HTMLTextAreaElement) emit('update:modelValue', target.value)
}
</script>

<template>
  <div :class="cn('grid gap-2', props.class)">
    <div class="flex items-baseline justify-between gap-4">
      <label :for="textareaId" class="text-body-sm font-semibold text-foreground">
        {{ props.label }}
        <span v-if="props.required" class="text-destructive" aria-hidden="true">*</span>
      </label>
      <span v-if="props.showCharacterCount" class="text-caption text-muted-foreground">
        {{ props.modelValue.length }}<template v-if="props.maxLength">/{{ props.maxLength }}</template>
      </span>
    </div>
    <textarea
      :id="textareaId"
      :value="props.modelValue"
      :rows="props.rows"
      :maxlength="props.maxLength"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :required="props.required"
      :aria-invalid="Boolean(props.error)"
      :aria-describedby="describedBy"
      :class="
        cn(
          'min-h-28 w-full resize-y rounded-md border bg-surface px-3 py-2.5 text-body-md text-foreground shadow-xs outline-none transition-colors placeholder:text-text-muted focus:border-primary-600 focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
          props.error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-input',
        )
      "
      @input="handleInput"
    />
    <p v-if="props.description" :id="descriptionId" class="text-caption text-muted-foreground">
      {{ props.description }}
    </p>
    <p v-if="props.error" :id="errorId" class="text-caption text-destructive">
      {{ props.error }}
    </p>
  </div>
</template>
