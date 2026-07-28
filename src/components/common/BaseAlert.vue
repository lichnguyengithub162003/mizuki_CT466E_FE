<script setup lang="ts">
import { CircleAlert, CircleCheck, CircleX, Info, X } from '@lucide/vue'
import { computed, type Component } from 'vue'
import { cn } from '@/utils/cn'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

const props = withDefaults(
  defineProps<{
    variant?: AlertVariant
    title: string
    description?: string
    dismissible?: boolean
    dismissLabel?: string
    class?: string
  }>(),
  {
    variant: 'info',
    description: undefined,
    dismissible: false,
    dismissLabel: 'Đóng thông báo',
    class: undefined,
  },
)

defineEmits<{
  dismiss: []
}>()

const variantClasses: Record<AlertVariant, string> = {
  info: 'border-info/25 bg-info/10 text-info',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/15 text-warning',
  error: 'border-destructive/25 bg-destructive/10 text-destructive',
}

const variantIcons: Record<AlertVariant, Component> = {
  info: Info,
  success: CircleCheck,
  warning: CircleAlert,
  error: CircleX,
}

const icon = computed(() => variantIcons[props.variant])
</script>

<template>
  <div
    :class="cn('flex items-start gap-3 rounded-lg border p-4', variantClasses[props.variant], props.class)"
    :role="props.variant === 'error' ? 'alert' : 'status'"
  >
    <span class="mt-0.5 shrink-0" aria-hidden="true">
      <slot name="icon">
        <component :is="icon" class="size-5" />
      </slot>
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-body-md font-semibold">{{ props.title }}</p>
      <p v-if="props.description" class="mt-1 text-body-sm text-foreground">
        {{ props.description }}
      </p>
    </div>
    <button
      v-if="props.dismissible"
      type="button"
      class="shrink-0 rounded-xs p-1 text-current hover:bg-surface/60 focus-visible:outline-2 focus-visible:outline-ring"
      :aria-label="props.dismissLabel"
      @click="$emit('dismiss')"
    >
      <X class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
