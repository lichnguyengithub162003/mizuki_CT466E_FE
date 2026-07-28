<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const props = withDefaults(
  defineProps<{
    pending: boolean
    pendingLabel?: string
    disabled?: boolean
    variant?: ButtonVariant
    size?: ButtonSize
    class?: string
  }>(),
  {
    pendingLabel: 'Đang xử lý',
    disabled: false,
    variant: 'primary',
    size: 'md',
    class: undefined,
  },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

function handleClick(event: MouseEvent): void {
  if (props.pending || props.disabled) return
  emit('click', event)
}
</script>

<template>
  <BaseButton
    :variant="props.variant"
    :size="props.size"
    :loading="props.pending"
    :disabled="props.disabled"
    :class="props.class"
    @click="handleClick"
  >
    <span>{{ props.pending ? props.pendingLabel : undefined }}</span>
    <span v-if="!props.pending"><slot /></span>
  </BaseButton>
</template>
