<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string; label?: string | null }>()

const tone = computed(() => ({
  requested: 'bg-amber-500',
  approved: 'bg-sky-500',
  rejected: 'bg-rose-500',
  refunded: 'bg-emerald-600',
} as Record<string, string>)[props.status] ?? 'bg-slate-400')

const fallbackLabel = computed(() => ({
  requested: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  refunded: 'Đã hoàn tiền',
} as Record<string, string>)[props.status] ?? props.status)
</script>

<template>
  <span data-testid="refund-status-indicator" class="inline-flex items-center gap-2 whitespace-nowrap text-[0.8125rem]">
    <span :class="['size-2 shrink-0 rounded-full', tone]" aria-hidden="true" />
    <span>{{ label || fallbackLabel }}</span>
  </span>
</template>
