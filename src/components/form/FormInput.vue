<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useField } from 'vee-validate'
import BaseInput from '@/components/common/BaseInput.vue'
import { createFormFieldId } from '@/utils/forms'

type InputType = 'text' | 'email' | 'password' | 'tel'
type InputMode = 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    description?: string
    type?: InputType
    placeholder?: string
    required?: boolean
    disabled?: boolean
    autocomplete?: string
    inputmode?: InputMode
    class?: string
  }>(),
  {
    description: undefined,
    type: 'text',
    placeholder: undefined,
    required: false,
    disabled: false,
    autocomplete: undefined,
    inputmode: undefined,
    class: undefined,
  },
)

const { value, errorMessage, handleBlur, handleChange } = useField<string>(toRef(props, 'name'))
const inputId = computed(() => createFormFieldId(props.name))
</script>

<template>
  <BaseInput
    :id="inputId"
    :model-value="value ?? ''"
    :name="props.name"
    :label="props.label"
    :description="props.description"
    :error="errorMessage"
    :type="props.type"
    :placeholder="props.placeholder"
    :required="props.required"
    :disabled="props.disabled"
    :autocomplete="props.autocomplete"
    :inputmode="props.inputmode"
    :class="props.class"
    @focusout="handleBlur"
    @update:model-value="handleChange"
  />
</template>
