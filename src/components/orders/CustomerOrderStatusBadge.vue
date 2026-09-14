<script setup lang="ts">
import {
  CUSTOMER_ORDER_STATUS_LABEL,
  type CustomerOrderStatus,
} from "@/types/orders";

const props = defineProps<{
  status: CustomerOrderStatus;
  label?: string;
  tone?: "default" | "refund-processing" | "refund-success" | "refund-rejected";
}>();
const statusClasses: Readonly<Record<CustomerOrderStatus, string>> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  processing: "border-blue-200 bg-blue-50 text-blue-800",
  confirmed: "border-violet-200 bg-violet-50 text-violet-800",
  shipping: "border-cyan-300 bg-cyan-50 text-blue-800",
  delivered: "border-primary-200 bg-primary-50 text-primary-800",
  refund_requested: "border-orange-200 bg-orange-50 text-orange-800",
  refunded: "border-teal-200 bg-teal-50 text-teal-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
};

const overrideClasses = {
  default: "",
  "refund-processing": "border-sky-200 bg-sky-50 text-sky-800",
  "refund-success": "border-teal-200 bg-teal-50 text-teal-800",
  "refund-rejected": "border-rose-200 bg-rose-50 text-rose-800",
} as const;
</script>

<template>
  <span
    :class="[
      'inline-flex rounded-pill border px-3 py-1 text-caption font-semibold',
      props.tone && props.tone !== 'default'
        ? overrideClasses[props.tone]
        : statusClasses[status],
    ]"
    data-order-status
    :data-status-tone="
      props.tone && props.tone !== 'default' ? props.tone : status
    "
    >{{ props.label ?? CUSTOMER_ORDER_STATUS_LABEL[status] }}</span
  >
</template>
