<script setup lang="ts">
import { computed } from "vue";
import {
  customerOrderPaymentStatusLabel,
  type CustomerOrderPaymentStatus,
} from "@/types/orders";

const props = defineProps<{
  status: CustomerOrderPaymentStatus | null;
  label?: string | null;
}>();
const displayLabel = computed(() =>
  customerOrderPaymentStatusLabel(props.status, props.label),
);
const statusClasses: Readonly<Record<CustomerOrderPaymentStatus, string>> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-red-200 bg-red-50 text-red-800",
  cancelled: "border-slate-200 bg-slate-50 text-slate-700",
  refunded: "border-teal-200 bg-teal-50 text-teal-800",
};
</script>

<template>
  <span
    v-if="status && displayLabel"
    :class="[
      'inline-flex rounded-pill border px-3 py-1 text-caption font-semibold',
      statusClasses[status],
    ]"
    data-payment-status
    :data-payment-status-tone="status"
    >{{ displayLabel }}</span
  >
</template>
