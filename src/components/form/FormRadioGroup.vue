<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useField } from 'vee-validate'
import BaseRadioGroup from '@/components/common/BaseRadioGroup.vue'
import type { FormOption } from '@/types/forms'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    description?: string
    options: readonly FormOption[]
    disabled?: boolean
    required?: boolean
    orientation?: 'horizontal' | 'vertical'
    class?: string
  }>(),
  {
    description: undefined,
    disabled: false,
    required: false,
    orientation: 'vertical',
    class: undefined,
  },
)

const { value, errorMessage, handleChange } = useField<string>(toRef(props, 'name'))
const model = computed({
  get: () => value.value,
  set: (nextValue: string | undefined) => handleChange(nextValue ?? ''),
})
</script>

<template>
  <BaseRadioGroup
    v-model="model"
    :label="props.label"
    :description="props.description"
    :error="errorMessage"
    :options="props.options"
    :disabled="props.disabled"
    :required="props.required"
    :orientation="props.orientation"
    :class="props.class"
  />
</template>
