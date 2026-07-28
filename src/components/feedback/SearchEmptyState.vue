<script setup lang="ts">
import { SearchX } from '@lucide/vue'
import { computed } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = withDefaults(
  defineProps<{
    query: string
    title?: string
    description?: string
    class?: string
  }>(),
  {
    title: 'Không tìm thấy kết quả',
    description: undefined,
    class: undefined,
  },
)

const defaultDescription = computed(
  () => `Không có kết quả phù hợp với từ khóa “${props.query}”.`,
)
</script>

<template>
  <EmptyState
    :title="props.title"
    :description="props.description ?? defaultDescription"
    :class="props.class"
  >
    <template #icon>
      <slot name="icon"><SearchX class="size-6" aria-hidden="true" /></slot>
    </template>
    <template v-if="$slots.action" #action><slot name="action" /></template>
  </EmptyState>
</template>
