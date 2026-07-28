<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    submitting?: boolean
    submitLabel?: string
    submittingLabel?: string
    cancelLabel?: string
    showCancel?: boolean
    class?: string
  }>(),
  {
    submitting: false,
    submitLabel: 'Gửi biểu mẫu',
    submittingLabel: 'Đang gửi…',
    cancelLabel: 'Đặt lại',
    showCancel: true,
    class: undefined,
  },
)

defineEmits<{ cancel: [] }>()
</script>

<template>
  <div :class="cn('flex flex-col-reverse gap-3 sm:flex-row sm:justify-end', props.class)">
    <slot name="before" />
    <BaseButton
      v-if="props.showCancel"
      type="button"
      variant="outline"
      :disabled="props.submitting"
      class="w-full sm:w-auto"
      @click="$emit('cancel')"
    >
      {{ props.cancelLabel }}
    </BaseButton>
    <BaseButton
      type="submit"
      :loading="props.submitting"
      :disabled="props.submitting"
      class="w-full sm:w-auto"
    >
      {{ props.submitting ? props.submittingLabel : props.submitLabel }}
    </BaseButton>
  </div>
</template>

