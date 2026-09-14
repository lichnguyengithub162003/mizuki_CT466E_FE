<script setup lang="ts">
import { computed } from 'vue'
import type { CustomerAppointmentStatus } from '@/types/clinic'

const props = defineProps<{
  status: CustomerAppointmentStatus
  label: string
}>()

const tone = computed(() => ({
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  confirmed: 'border-blue-200 bg-blue-50 text-blue-800',
  in_progress: 'border-violet-200 bg-violet-50 text-violet-800',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  cancelled: 'border-red-200 bg-red-50 text-red-800',
  no_show: 'border-slate-200 bg-slate-100 text-slate-700',
})[props.status])
</script>

<template>
  <span
    :class="['inline-flex min-h-7 items-center rounded-pill border px-3 text-caption font-semibold', tone]"
    :data-appointment-status="status"
  >
    {{ label }}
  </span>
</template>
