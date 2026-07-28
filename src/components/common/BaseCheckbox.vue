<script setup lang="ts">
import { computed, useId } from 'vue'
import { Check, Minus } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { cn } from '@/utils/cn'

type CheckboxValue = boolean | 'indeterminate'

const props = withDefaults(
  defineProps<{
    id?: string
    label: string
    description?: string
    disabled?: boolean
    required?: boolean
    class?: string
  }>(),
  {
    id: undefined,
    description: undefined,
    disabled: false,
    required: false,
    class: undefined,
  },
)

const model = defineModel<CheckboxValue>({ default: false })
const generatedId = useId()
const checkboxId = computed(() => props.id ?? generatedId)
const descriptionId = computed(() => `${checkboxId.value}-description`)
</script>

<template>
  <div :class="cn('flex items-start gap-3', props.class)">
    <CheckboxRoot
      :id="checkboxId"
      v-model="model"
      :disabled="props.disabled"
      :required="props.required"
      :aria-describedby="props.description ? descriptionId : undefined"
      class="motion-state-colors mt-0.5 grid size-5 shrink-0 place-items-center rounded-xs border border-input bg-surface text-primary-foreground shadow-xs outline-none data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <CheckboxIndicator class="motion-indicator grid place-items-center">
        <Minus v-if="model === 'indeterminate'" class="size-3.5" aria-hidden="true" />
        <Check v-else class="size-3.5" aria-hidden="true" />
      </CheckboxIndicator>
    </CheckboxRoot>
    <div class="grid gap-1">
      <label :for="checkboxId" class="text-body-sm font-medium text-foreground">
        {{ props.label }}
        <span v-if="props.required" class="text-destructive" aria-hidden="true">*</span>
      </label>
      <p v-if="props.description" :id="descriptionId" class="text-caption text-muted-foreground">
        {{ props.description }}
      </p>
    </div>
  </div>
</template>
