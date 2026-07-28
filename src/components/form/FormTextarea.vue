<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useField } from 'vee-validate'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import { createFormFieldId } from '@/utils/forms'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    description?: string
    placeholder?: string
    required?: boolean
    disabled?: boolean
    maxlength?: number
    showCharacterCount?: boolean
    class?: string
  }>(),
  {
    description: undefined,
    placeholder: undefined,
    required: false,
    disabled: false,
    maxlength: undefined,
    showCharacterCount: false,
    class: undefined,
  },
)

const { value, errorMessage, handleBlur, handleChange } = useField<string>(toRef(props, 'name'))
const inputId = computed(() => createFormFieldId(props.name))
</script>

<template>
  <BaseTextarea
    :id="inputId"
    :model-value="value ?? ''"
    :label="props.label"
    :description="props.description"
    :error="errorMessage"
    :placeholder="props.placeholder"
    :required="props.required"
    :disabled="props.disabled"
    :max-length="props.maxlength"
    :show-character-count="props.showCharacterCount"
    :class="props.class"
    @focusout="handleBlur"
    @update:model-value="handleChange"
  />
</template>
