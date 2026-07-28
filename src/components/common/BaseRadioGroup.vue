<script setup lang="ts">
import { computed, useId } from 'vue'
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { cn } from '@/utils/cn'

interface RadioOption {
  label: string
  value: string
  description?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    label: string
    options: readonly RadioOption[]
    description?: string
    error?: string
    disabled?: boolean
    required?: boolean
    orientation?: 'horizontal' | 'vertical'
    class?: string
  }>(),
  {
    description: undefined,
    error: undefined,
    disabled: false,
    required: false,
    orientation: 'vertical',
    class: undefined,
  },
)

const model = defineModel<string>()
const generatedId = useId()
const descriptionId = computed(() => `${generatedId}-description`)
const errorId = computed(() => `${generatedId}-error`)
const describedBy = computed(() =>
  [props.description ? descriptionId.value : '', props.error ? errorId.value : '']
    .filter(Boolean)
    .join(' ') || undefined,
)
</script>

<template>
  <fieldset :class="cn('grid gap-3', props.class)" :disabled="props.disabled">
    <legend class="text-body-sm font-semibold text-foreground">
      {{ props.label }}
      <span v-if="props.required" class="text-destructive" aria-hidden="true">*</span>
    </legend>
    <p v-if="props.description" :id="descriptionId" class="text-caption text-muted-foreground">
      {{ props.description }}
    </p>
    <RadioGroupRoot
      v-model="model"
      :disabled="props.disabled"
      :required="props.required"
      :orientation="props.orientation"
      :aria-invalid="Boolean(props.error)"
      :aria-describedby="describedBy"
      :class="cn('flex gap-4', props.orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')"
    >
      <label
        v-for="option in props.options"
        :key="option.value"
        class="flex items-start gap-3 text-body-sm"
        :class="option.disabled && 'opacity-55'"
      >
        <RadioGroupItem
          :value="option.value"
          :disabled="option.disabled"
          class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-pill border border-input bg-surface outline-none data-[state=checked]:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
        >
          <RadioGroupIndicator class="size-2.5 rounded-pill bg-primary" />
        </RadioGroupItem>
        <span class="grid gap-1">
          <span class="font-medium text-foreground">{{ option.label }}</span>
          <span v-if="option.description" class="text-caption text-muted-foreground">
            {{ option.description }}
          </span>
        </span>
      </label>
    </RadioGroupRoot>
    <p v-if="props.error" :id="errorId" class="text-caption text-destructive">
      {{ props.error }}
    </p>
  </fieldset>
</template>
