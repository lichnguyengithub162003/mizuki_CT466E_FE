<script setup lang="ts">
import { ShieldX } from '@lucide/vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    class?: string
  }>(),
  {
    title: 'Bạn không có quyền truy cập',
    description: 'Tài khoản hiện tại không được phép xem nội dung này.',
    class: undefined,
  },
)
</script>

<template>
  <EmptyState :title="props.title" :description="props.description" :class="props.class">
    <template #icon>
      <slot name="icon"><ShieldX class="size-6" aria-hidden="true" /></slot>
    </template>
    <template v-if="$slots.action" #action><slot name="action" /></template>
  </EmptyState>
</template>
