<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useField } from 'vee-validate'
import BaseCheckbox from '@/components/common/BaseCheckbox.vue'
import { createFormFieldId } from '@/utils/forms'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    description?: string
    disabled?: boolean
    reserveErrorSpace?: boolean
    class?: string
  }>(),
  {
    description: undefined,
    disabled: false,
    reserveErrorSpace: false,
    class: undefined,
  },
)

const { value, errorMessage, handleChange } = useField<boolean>(toRef(props, 'name'))
const inputId = computed(() => createFormFieldId(props.name))
</script>

<template>
  <BaseCheckbox
    :id="inputId"
    :model-value="Boolean(value)"
    :label="props.label"
    :description="props.description"
    :error="errorMessage"
    :disabled="props.disabled"
    :reserve-error-space="props.reserveErrorSpace"
    :class="props.class"
    @update:model-value="handleChange($event === true)"
  />
</template>
