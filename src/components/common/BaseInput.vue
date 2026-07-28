<script setup lang="ts">
import { computed, useId, useSlots } from 'vue'
import { cn } from '@/utils/cn'

type InputValue = string | number | null

const props = withDefaults(
  defineProps<{
    modelValue?: InputValue
    id?: string
    label: string
    description?: string
    error?: string
    type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number'
    placeholder?: string
    name?: string
    autocomplete?: string
    inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
    disabled?: boolean
    required?: boolean
    class?: string
  }>(),
  {
    modelValue: '',
    id: undefined,
    description: undefined,
    error: undefined,
    type: 'text',
    placeholder: undefined,
    name: undefined,
    autocomplete: undefined,
    inputmode: undefined,
    disabled: false,
    required: false,
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: InputValue]
}>()

const slots = useSlots()
const generatedId = useId()
const inputId = computed(() => props.id ?? generatedId)
const descriptionId = computed(() => `${inputId.value}-description`)
const errorId = computed(() => `${inputId.value}-error`)
const describedBy = computed(() =>
  [props.description ? descriptionId.value : '', props.error ? errorId.value : '']
    .filter(Boolean)
    .join(' ') || undefined,
)

function handleInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return

  if (props.type === 'number') {
    emit('update:modelValue', target.value === '' ? null : target.valueAsNumber)
    return
  }

  emit('update:modelValue', target.value)
}
</script>

<template>
  <div :class="cn('grid gap-2', props.class)">
    <label :for="inputId" class="text-body-sm font-semibold text-foreground">
      {{ props.label }}
      <span v-if="props.required" class="text-destructive" aria-hidden="true">*</span>
    </label>
    <div class="relative flex items-center">
      <span
        v-if="slots.prefix"
        class="pointer-events-none absolute left-3 text-muted-foreground"
        aria-hidden="true"
      >
        <slot name="prefix" />
      </span>
      <input
        :id="inputId"
        :value="props.modelValue ?? ''"
        :type="props.type"
        :name="props.name"
        :placeholder="props.placeholder"
        :autocomplete="props.autocomplete"
        :inputmode="props.inputmode"
        :disabled="props.disabled"
        :required="props.required"
        :aria-invalid="Boolean(props.error)"
        :aria-describedby="describedBy"
        :class="
          cn(
            'h-11 w-full rounded-md border bg-surface px-3 text-body-md text-foreground shadow-xs outline-none transition-colors placeholder:text-text-muted focus:border-primary-600 focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
            slots.prefix && 'pl-10',
            slots.suffix && 'pr-10',
            props.error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-input',
          )
        "
        @input="handleInput"
      />
      <span
        v-if="slots.suffix"
        class="pointer-events-none absolute right-3 text-muted-foreground"
        aria-hidden="true"
      >
        <slot name="suffix" />
      </span>
    </div>
    <p v-if="props.description" :id="descriptionId" class="text-caption text-muted-foreground">
      {{ props.description }}
    </p>
    <p v-if="props.error" :id="errorId" class="text-caption text-destructive">
      {{ props.error }}
    </p>
  </div>
</template>
