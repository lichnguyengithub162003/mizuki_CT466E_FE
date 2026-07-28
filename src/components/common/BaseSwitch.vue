<script setup lang="ts">
import { computed, useId } from 'vue'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    id?: string
    label: string
    description?: string
    disabled?: boolean
    class?: string
  }>(),
  {
    id: undefined,
    description: undefined,
    disabled: false,
    class: undefined,
  },
)

const model = defineModel<boolean>({ default: false })
const generatedId = useId()
const switchId = computed(() => props.id ?? generatedId)
const descriptionId = computed(() => `${switchId.value}-description`)
</script>

<template>
  <div :class="cn('flex items-start justify-between gap-4', props.class)">
    <div class="grid gap-1">
      <label :for="switchId" class="text-body-sm font-medium text-foreground">{{ props.label }}</label>
      <p v-if="props.description" :id="descriptionId" class="text-caption text-muted-foreground">
        {{ props.description }}
      </p>
    </div>
    <SwitchRoot
      :id="switchId"
      v-model="model"
      :disabled="props.disabled"
      :aria-describedby="props.description ? descriptionId : undefined"
      class="motion-state-colors relative h-6 w-11 shrink-0 rounded-pill bg-border outline-none data-[state=checked]:bg-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <SwitchThumb
        class="motion-switch-thumb block size-5 translate-x-0.5 rounded-pill bg-surface shadow-sm data-[state=checked]:translate-x-5"
      />
    </SwitchRoot>
  </div>
</template>
