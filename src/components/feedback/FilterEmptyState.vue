<script setup lang="ts">
import { ListFilter } from '@lucide/vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    class?: string
  }>(),
  {
    title: 'Không có kết quả phù hợp với bộ lọc',
    description: 'Hãy điều chỉnh hoặc xóa bộ lọc để xem thêm dữ liệu.',
    class: undefined,
  },
)
</script>

<template>
  <EmptyState :title="props.title" :description="props.description" :class="props.class">
    <template #icon>
      <slot name="icon"><ListFilter class="size-6" aria-hidden="true" /></slot>
    </template>
    <template v-if="$slots.action" #action><slot name="action" /></template>
  </EmptyState>
</template>
