<script setup lang="ts">
import { computed } from 'vue'
import { useAdminOrderCounts } from '@/queries/admin'

defineProps<{ compact?: boolean }>()

const countsQuery = useAdminOrderCounts()
const pending = computed(() => countsQuery.data.value?.pending ?? 0)
const label = computed(() => pending.value > 99 ? '99+' : String(pending.value))
</script>

<template>
  <span
    v-if="pending > 0"
    data-testid="admin-orders-pending-badge"
    :aria-label="`${pending} đơn hàng chờ xác nhận`"
    :class="compact
      ? 'absolute right-0.5 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[0.5rem] font-semibold leading-none tabular-nums text-white ring-2 ring-surface'
      : 'ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[0.625rem] font-semibold leading-none tabular-nums text-white'"
  >
    <span>{{ label }}</span>
  </span>
</template>
