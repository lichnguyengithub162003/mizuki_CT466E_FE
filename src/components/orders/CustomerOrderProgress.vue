<script setup lang="ts">
import { Check, PackageCheck, Truck } from "@lucide/vue";
import { computed } from "vue";
import type { CustomerOrder } from "@/types/orders";

const props = defineProps<{ order: CustomerOrder }>();

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});
function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

const steps = computed(() => [
  {
    label: "Đã tiếp nhận đơn",
    date: formatDate(props.order.placedAt),
    icon: PackageCheck,
  },
  {
    label: "Đang giao hàng",
    date: formatDate(props.order.shipment?.shippedAt ?? null),
    icon: Truck,
  },
  {
    label: "Đã giao hàng",
    date: formatDate(props.order.shipment?.deliveredAt ?? null),
    icon: Check,
  },
]);
</script>

<template>
  <ol
    class="grid gap-0 sm:grid-cols-3"
    aria-label="Tiến trình giao hàng"
    data-order-progress
  >
    <li
      v-for="(step, index) in steps"
      :key="step.label"
      class="relative flex min-w-0 gap-3 pb-6 last:pb-0 sm:block sm:pb-0 sm:text-center"
    >
      <div class="flex items-center sm:justify-center">
        <span
          v-if="index"
          :class="[
            'absolute left-[1.2rem] top-0 h-5 w-0.5 sm:left-0 sm:top-5 sm:h-0.5 sm:w-[calc(50%-1.25rem)]',
            step.date ? 'bg-[#32a873]' : 'bg-[#dce8e2]',
          ]"
          aria-hidden="true"
        />
        <span
          :class="[
            'relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2',
            step.date
              ? 'border-[#32a873] bg-[#32a873] text-white shadow-[0_5px_14px_rgba(50,168,115,0.2)]'
              : 'border-[#dce8e2] bg-white text-[#9aaba2]',
          ]"
        >
          <component :is="step.icon" class="size-4" aria-hidden="true" />
        </span>
        <span
          v-if="index < steps.length - 1"
          :class="[
            'absolute left-[1.2rem] top-10 h-[calc(100%-2.5rem)] w-0.5 sm:left-[calc(50%+1.25rem)] sm:top-5 sm:h-0.5 sm:w-[calc(50%-1.25rem)]',
            steps[index + 1]?.date ? 'bg-[#32a873]' : 'bg-[#dce8e2]',
          ]"
          aria-hidden="true"
        />
      </div>
      <div class="min-w-0 pt-1 sm:pt-3">
        <p class="text-body-sm font-semibold text-[#143f30]">
          {{ step.label }}
        </p>
        <p
          v-if="step.date"
          class="mt-1 text-caption font-medium text-[#5e7168]"
        >
          {{ step.date }}
        </p>
      </div>
    </li>
  </ol>
</template>
