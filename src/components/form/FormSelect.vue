<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useField } from 'vee-validate'
import FormField from '@/components/form/FormField.vue'
import type { FormOption } from '@/types/forms'
import { cn } from '@/utils/cn'
import { createFormFieldId } from '@/utils/forms'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    description?: string
    placeholder?: string
    options: readonly FormOption[]
    required?: boolean
    disabled?: boolean
    class?: string
  }>(),
  {
    description: undefined,
    placeholder: 'Chọn một tùy chọn',
    required: false,
    disabled: false,
    class: undefined,
  },
)

const { value, errorMessage, handleBlur, handleChange } = useField<string>(toRef(props, 'name'))
const inputId = computed(() => createFormFieldId(props.name))

function updateValue(event: Event): void {
  const target = event.target
  if (target instanceof HTMLSelectElement) handleChange(target.value)
}
</script>

<template>
  <FormField
    v-slot="{ inputId: fieldId, describedBy }"
    :id="inputId"
    :label="props.label"
    :description="props.description"
    :error="errorMessage"
    :required="props.required"
    :class="props.class"
  >
    <div class="relative">
      <select
        :id="fieldId"
        :name="props.name"
        :value="value ?? ''"
        :required="props.required"
        :disabled="props.disabled"
        :aria-invalid="Boolean(errorMessage)"
        :aria-describedby="describedBy"
        :class="
          cn(
            'motion-interactive h-11 w-full appearance-none rounded-md border bg-surface px-3 pr-10 text-body-md text-foreground shadow-xs outline-none focus:border-primary-600 focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
            errorMessage ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-input',
          )
        "
        @blur="handleBlur"
        @change="updateValue"
      >
        <option value="" disabled>{{ props.placeholder }}</option>
        <option
          v-for="option in props.options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      <span
        class="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-muted-foreground"
        aria-hidden="true"
      >
        ▾
      </span>
    </div>
  </FormField>
</template>
