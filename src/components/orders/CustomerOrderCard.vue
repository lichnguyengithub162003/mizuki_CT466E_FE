<script setup lang="ts">
import { ChevronDown, ChevronRight, RotateCcw, Truck } from "@lucide/vue";
import { computed, ref } from "vue";
import CustomerOrderProducts from "@/components/orders/CustomerOrderProducts.vue";
import CustomerOrderPaymentStatusBadge from "@/components/orders/CustomerOrderPaymentStatusBadge.vue";
import CustomerOrderStatusBadge from "@/components/orders/CustomerOrderStatusBadge.vue";
import {
  CUSTOMER_ORDER_STATUS_ACTIONS,
  type CustomerOrder,
} from "@/types/orders";

const props = withDefaults(
  defineProps<{
    order: CustomerOrder;
    buyAgainPending?: boolean;
    preview?: boolean;
  }>(),
  { buyAgainPending: false, preview: false },
);
const emit = defineEmits<{
  detail: [order: CustomerOrder];
  buyAgain: [order: CustomerOrder];
}>();
const productsOpen = ref(false);
const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});
const date = new Intl.DateTimeFormat("vi-VN", {
  day: "numeric",
  month: "long",
});

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : date.format(parsed);
}
function shipmentStatusLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return (
    (
      {
        in_transit: "Đang vận chuyển",
        delivering: "Đang giao hàng",
        delivered: "Đã giao hàng",
        cancelled: "Đã hủy",
        ready_to_pick: "Chờ lấy hàng",
      } as Record<string, string>
    )[value.toLowerCase()] ?? value
  );
}

const totalQuantity = computed(() =>
  props.order.items.reduce((sum, item) => sum + item.quantity, 0),
);
const visibleItems = computed(() =>
  productsOpen.value ? props.order.items : props.order.items.slice(0, 1),
);
const hiddenProductCount = computed(() =>
  Math.max(0, props.order.items.length - 1),
);
const actions = computed(
  () => CUSTOMER_ORDER_STATUS_ACTIONS[props.order.status],
);
const detailLabel = computed(() =>
  ["pending", "processing", "confirmed", "shipping"].includes(
    props.order.status,
  )
    ? "Theo dõi đơn"
    : "Xem chi tiết",
);
const canBuyAgain = computed(
  () =>
    !props.order.refund &&
    actions.value.includes("buy-again") &&
    props.order.items.length > 0 &&
    props.order.items.every((item) => item.productVariantId > 0),
);
const expectedDelivery = computed(() =>
  formatDate(props.order.shipment?.expectedDeliveryAt),
);
const safeShipmentStatus = computed(() => {
  const value = props.order.shipment?.status;
  if (!value) return null;
  if (value.toLowerCase() === "cancelled" && props.order.status !== "cancelled")
    return null;
  return shipmentStatusLabel(value);
});
const hasShippingHighlight = computed(
  () =>
    ["pending", "processing", "confirmed", "shipping"].includes(
      props.order.status,
    ) &&
    Boolean(
      expectedDelivery.value ||
      props.order.shipment?.currentLocation ||
      safeShipmentStatus.value ||
      props.order.shipment?.trackingCode,
    ),
);
const refundBadge = computed(() => {
  if (!props.order.refund) return null;
  if (props.order.refund.status === "rejected")
    return { label: "Hoàn tiền bị từ chối", tone: "refund-rejected" as const };
  if (props.order.refund.status === "refunded")
    return { label: "Hoàn tiền thành công", tone: "refund-success" as const };
  return {
    label:
      props.order.refund.status === "approved"
        ? "Đang hoàn tiền"
        : "Đang xử lý hoàn tiền",
    tone: "refund-processing" as const,
  };
});
</script>

<template>
  <article
    class="w-full overflow-hidden rounded-[1.5rem] bg-white shadow-[0_10px_34px_rgba(25,52,42,0.065)] ring-1 ring-black/[0.045]"
    :data-order-id="order.id"
    :data-preview-order="preview || undefined"
    data-order-row
  >
    <div
      class="grid min-w-0 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,7fr)_minmax(17rem,3fr)] lg:gap-0"
    >
      <div class="min-w-0" data-order-product-area>
        <span
          v-if="preview"
          class="mb-3 inline-flex rounded-pill border border-sky-200 bg-sky-50 px-3 py-1 text-caption font-semibold text-sky-800"
          data-preview-badge
          >Dữ liệu xem trước</span
        >
        <CustomerOrderProducts
          v-if="visibleItems.length"
          :items="visibleItems"
        />
        <p
          v-else
          class="rounded-2xl bg-[#f7faf8] p-4 text-body-sm text-text-secondary"
        >
          Đơn hàng chưa có thông tin sản phẩm.
        </p>
        <button
          v-if="hiddenProductCount"
          type="button"
          class="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-body-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :aria-expanded="productsOpen"
          :aria-label="
            productsOpen
              ? 'Thu gọn sản phẩm'
              : `Xem thêm ${hiddenProductCount} sản phẩm`
          "
          data-product-expand
          @click="productsOpen = !productsOpen"
        >
          <ChevronDown
            :class="[
              'size-4 transition-transform',
              productsOpen && 'rotate-180',
            ]"
            aria-hidden="true"
          />{{
            productsOpen
              ? "Ẩn bớt sản phẩm"
              : `Xem thêm ${hiddenProductCount} sản phẩm`
          }}
        </button>
      </div>

      <aside
        class="flex min-w-0 flex-col border-t border-black/[0.055] pt-5 lg:ml-7 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-1"
        data-order-summary-area
      >
        <div class="flex flex-wrap gap-2" data-order-state-badges>
          <CustomerOrderStatusBadge
            :status="order.status"
            :label="refundBadge?.label"
            :tone="refundBadge?.tone"
          /><CustomerOrderPaymentStatusBadge
            :status="order.paymentStatus"
            :label="order.paymentStatusLabel"
          />
        </div>
        <div class="mt-5">
          <p class="text-caption font-medium text-text-secondary">
            Tổng thanh toán · {{ totalQuantity }} sản phẩm
          </p>
          <strong
            class="mt-1.5 block text-[1.35rem] font-bold tracking-[-0.02em] text-[#173d30]"
            data-order-total
            >{{ currency.format(order.totalAmount) }}</strong
          >
        </div>
        <button
          v-if="hasShippingHighlight"
          type="button"
          class="mt-4 w-full rounded-2xl bg-[#edf8f2] p-3.5 text-left transition-colors hover:bg-[#e4f4eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          data-shipping-highlight
          @click="emit('detail', order)"
        >
          <span class="flex items-start gap-2"
            ><Truck
              class="mt-0.5 size-4.5 shrink-0 text-primary-700"
              aria-hidden="true" /><span class="min-w-0 flex-1"
              ><strong
                v-if="expectedDelivery"
                class="block text-body-sm text-primary-800"
                >Ngày giao dự kiến: {{ expectedDelivery }}</strong
              ><span
                v-if="order.shipment?.currentLocation"
                class="mt-1 block text-caption text-text-secondary"
                >{{ order.shipment.currentLocation }}</span
              ><span
                v-else-if="safeShipmentStatus"
                class="mt-1 block text-caption text-text-secondary"
                >{{ safeShipmentStatus }}</span
              ><span
                v-else-if="order.shipment?.trackingCode"
                class="mt-1 block break-all text-caption text-text-secondary"
                >Mã vận đơn: {{ order.shipment.trackingCode }}</span
              ></span
            ><ChevronRight
              class="mt-0.5 size-4 shrink-0 text-primary-700"
              aria-hidden="true"
          /></span>
        </button>
        <div
          class="mt-auto flex flex-wrap justify-end gap-2 pt-5 sm:flex-nowrap"
        >
          <button
            v-if="canBuyAgain && !preview"
            type="button"
            class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary-600 bg-white px-4 text-body-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-55"
            :disabled="buyAgainPending"
            @click="emit('buyAgain', order)"
          >
            <RotateCcw class="size-4" aria-hidden="true" />{{
              buyAgainPending ? "Đang thêm…" : "Mua lại"
            }}
          </button>
          <button
            type="button"
            class="inline-flex min-h-10 items-center gap-1 rounded-xl border border-primary-600 bg-white px-4 text-body-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            @click="emit('detail', order)"
          >
            {{ detailLabel }} <ChevronRight class="size-4" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </div>
  </article>
</template>
