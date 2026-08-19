<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'

withDefaults(
  defineProps<{
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    loading: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <BaseButton
    type="button"
    variant="outline"
    class="h-[3.25rem] w-full rounded-xl border-input bg-surface px-5 text-body-md font-semibold text-foreground shadow-xs hover:border-primary-200 hover:bg-primary-50/60"
    :loading="loading"
    :disabled="disabled"
    @click="emit('click')"
  >
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>
    <slot />
  </BaseButton>
</template>
