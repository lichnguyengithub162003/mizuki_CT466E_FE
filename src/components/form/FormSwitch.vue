<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useField } from 'vee-validate'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import { createFormFieldId } from '@/utils/forms'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    description?: string
    disabled?: boolean
    class?: string
  }>(),
  {
    description: undefined,
    disabled: false,
    class: undefined,
  },
)

const { value, errorMessage, handleChange } = useField<boolean>(toRef(props, 'name'))
const inputId = computed(() => createFormFieldId(props.name))
</script>

<template>
  <BaseSwitch
    :id="inputId"
    :model-value="Boolean(value)"
    :label="props.label"
    :description="props.description"
    :error="errorMessage"
    :disabled="props.disabled"
    :class="props.class"
    @update:model-value="handleChange"
  />
</template>
