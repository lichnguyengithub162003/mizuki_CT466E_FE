<script setup lang="ts">
import ErrorState from '@/components/common/ErrorState.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    retryLabel?: string
    class?: string
  }>(),
  {
    title: 'Không thể kết nối',
    description: 'Vui lòng kiểm tra kết nối mạng và thử lại.',
    retryLabel: 'Thử lại',
    class: undefined,
  },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <ErrorState
    :title="props.title"
    :description="props.description"
    :retry-label="props.retryLabel"
    :class="props.class"
    aria-live="assertive"
    @retry="$emit('retry')"
  />
</template>
