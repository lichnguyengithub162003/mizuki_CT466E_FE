<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Headphones,
  HelpCircle,
  MapPin,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Store,
  Truck,
  Undo2,
} from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import CustomerLayout from "@/layouts/CustomerLayout.vue";
import CustomerBackToTop from "@/components/customer-shell/CustomerBackToTop.vue";
import CustomerOrderProducts from "@/components/orders/CustomerOrderProducts.vue";
import CustomerOrderPaymentStatusBadge from "@/components/orders/CustomerOrderPaymentStatusBadge.vue";
import CustomerOrderProgress from "@/components/orders/CustomerOrderProgress.vue";
import CustomerRefundProgress from "@/components/orders/CustomerRefundProgress.vue";
import CustomerOrderSkeleton from "@/components/orders/CustomerOrderSkeleton.vue";
import CustomerOrderStatusBadge from "@/components/orders/CustomerOrderStatusBadge.vue";
import ProductSuggestions from "@/components/products/ProductSuggestions.vue";
import { useToast } from "@/components/common/toast";
import { ROUTE_NAMES } from "@/constants/routes";
import { useCustomerOrderQuery } from "@/queries/orders";
import { useAddCartItemMutation, useCustomerCartQuery } from "@/queries/cart";
import { useProductRecommendationsInfiniteQuery } from "@/queries/productListing";
import {
  useAddFavoriteMutation,
  useCustomerFavoritesQuery,
  useRemoveFavoriteMutation,
} from "@/queries/favorites";
import { useAuthStore } from "@/stores/auth";
import { pinia } from "@/stores/pinia";
import {
  resolveCustomerOrderPresentationState,
  type CustomerOrder,
} from "@/types/orders.ts";
import type { ProductListingProduct } from "@/types/products";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore(pinia);
const userId = computed(() => authStore.user?.id ?? null);
const isPreviewRoute = computed(
  () =>
    import.meta.env.DEV &&
    route.name === ROUTE_NAMES.customerOrderPreviewDetail,
);
const parsedOrderId = computed(() => {
  if (isPreviewRoute.value) return null;
  const value = Number(route.params.id);
  return Number.isInteger(value) && value > 0 ? value : null;
});
const orderQuery = useCustomerOrderQuery(parsedOrderId);
const previewOrder = ref<CustomerOrder | null>(null);
const previewResolved = ref(false);
const addCartItemMutation = useAddCartItemMutation(userId);
const cartQuery = useCustomerCartQuery(userId);
const favoritesQuery = useCustomerFavoritesQuery(userId);
const addFavoriteMutation = useAddFavoriteMutation(userId);
const removeFavoriteMutation = useRemoveFavoriteMutation(userId);
const buyAgainPending = ref(false);
const moneyOpen = ref(false);
const metaOpen = ref(false);
const productsOpen = ref(false);
const refundDetailOpen = ref(false);
const copiedValue = ref<string | null>(null);
let copyResetTimer: number | null = null;
const { toast } = useToast();
const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});
const date = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const order = computed(() =>
  isPreviewRoute.value ? previewOrder.value : orderQuery.data.value,
);
const isLoading = computed(
  () => !isPreviewRoute.value && orderQuery.isPending.value,
);
const isMissing = computed(() =>
  isPreviewRoute.value
    ? previewResolved.value && !previewOrder.value
    : orderQuery.isError.value || !order.value,
);
const presentationState = computed(() =>
  order.value ? resolveCustomerOrderPresentationState(order.value) : null,
);
const isRefund = computed(
  () => presentationState.value?.startsWith("refund_") ?? false,
);
const isCancelled = computed(() => presentationState.value === "cancelled");
const isCompleted = computed(() => presentationState.value === "completed");
const isActive = computed(
  () =>
    Boolean(presentationState.value) &&
    !isRefund.value &&
    !isCancelled.value &&
    !isCompleted.value,
);
const totalQuantity = computed(
  () => order.value?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
);
const visibleItems = computed(() =>
  productsOpen.value
    ? (order.value?.items ?? [])
    : (order.value?.items.slice(0, 1) ?? []),
);
const hiddenProductCount = computed(() =>
  Math.max(0, (order.value?.items.length ?? 0) - 1),
);
const canBuyAgain = computed(
  () =>
    !isPreviewRoute.value &&
    Boolean(order.value?.items.length) &&
    Boolean(order.value?.items.every((item) => item.productVariantId > 0)) &&
    (isCompleted.value || isCancelled.value),
);
const paymentLabel = computed(
  () =>
    ({ cash: "Thanh toán khi nhận hàng", vnpay: "VNPay", wallet: "Ví Mizuki" })[
      order.value?.paymentMethod ?? "cash"
    ],
);
const paymentEvent = computed(() => {
  const payment = order.value?.payment;
  if (!payment) return null;
  if (payment.status === "paid" && payment.paidAt)
    return { label: "Đã thu tiền lúc", value: payment.paidAt };
  if (payment.status === "failed" && payment.failedAt)
    return { label: "Thất bại lúc", value: payment.failedAt };
  if (payment.status === "cancelled" && payment.cancelledAt)
    return { label: "Đã hủy lúc", value: payment.cancelledAt };
  if (payment.status === "refunded" && payment.refundedAt)
    return { label: "Đã hoàn tiền lúc", value: payment.refundedAt };
  return null;
});
const cancellationRequesterLabel = computed(() => {
  const requester = order.value?.cancellationRequestedBy?.trim();
  if (!requester) return null;
  if (!["customer", "khách hàng"].includes(requester.toLowerCase()))
    return requester;
  const customerName =
    order.value?.deliveryAddress?.recipient_name ??
    order.value?.pickupCustomerName;
  return customerName
    ? `Được hủy bởi bạn · ${customerName}`
    : "Được hủy bởi bạn";
});
const refundDestinationLabel = computed(() => {
  if (order.value?.refund?.paymentDestinationLabel)
    return order.value.refund.paymentDestinationLabel;
  if (order.value?.refund?.paymentDestination === "wallet") return "Ví Mizuki";
  if (order.value?.refund?.paymentDestination === "card")
    return "Thẻ tín dụng / ghi nợ";
  return null;
});
const refundDisplayAmount = computed(
  () =>
    order.value?.refund?.receivedAmount ??
    order.value?.refund?.approvedAmount ??
    order.value?.refund?.requestedAmount ??
    0,
);
const activeShipmentStatus = computed(() => {
  const value = order.value?.shipment?.status;
  if (
    !value ||
    (value.toLowerCase() === "cancelled" && order.value?.status !== "cancelled")
  )
    return null;
  return shipmentStatusLabel(value);
});
const shipmentInformationFields = computed(() => {
  const shipment = order.value?.shipment;
  if (!shipment || !order.value) return [];
  const fields: Array<{
    key: string;
    label: string;
    value: string;
    emphasis?: boolean;
    copy?: boolean;
  }> = [];
  const expected = formatDate(shipment.expectedDeliveryAt);
  const carrier = carrierLabel(shipment.provider);
  if (expected)
    fields.push({
      key: "expected",
      label: "Ngày giao dự kiến",
      value: expected,
      emphasis: true,
    });
  if (shipment.currentLocation)
    fields.push({
      key: "location",
      label: "Vị trí hiện tại",
      value: shipment.currentLocation,
    });
  if (carrier)
    fields.push({ key: "carrier", label: "Đơn vị vận chuyển", value: carrier });
  if (activeShipmentStatus.value)
    fields.push({
      key: "status",
      label: "Trạng thái",
      value: activeShipmentStatus.value,
    });
  fields.push({
    key: "order-number",
    label: "Mã đơn hàng",
    value: order.value.orderNumber,
    copy: true,
  });
  return fields;
});
const refundTitle = computed(() => {
  const status = order.value?.refund?.status;
  if (status === "rejected") return "Yêu cầu hoàn tiền bị từ chối";
  if (status === "refunded") return "Hoàn tiền thành công";
  if (status === "approved") return "Đang hoàn tiền";
  return "Đang xử lý";
});
const refundTone = computed(() =>
  order.value?.refund?.status === "rejected"
    ? "rose"
    : order.value?.refund?.status === "refunded"
      ? "green"
      : "blue",
);
const recommendationsEnabled = computed(() => Boolean(order.value));
const recommendationRequest = computed(() => ({
  ...(cartQuery.data.value?.branch?.id
    ? { branch_id: cartQuery.data.value.branch.id }
    : {}),
  sort: "newest" as const,
  per_page: 12,
}));
const recommendationsQuery = useProductRecommendationsInfiniteQuery(
  recommendationRequest,
  recommendationsEnabled,
);
const recommendations = computed(
  () => recommendationsQuery.data.value?.pages[0]?.products ?? [],
);
const recommendationsState = computed(() =>
  recommendationsQuery.isPending.value
    ? ("loading" as const)
    : recommendationsQuery.isError.value
      ? ("error" as const)
      : recommendations.value.length
        ? ("success" as const)
        : ("empty" as const),
);
const favoriteIds = computed<ReadonlySet<string>>(
  () =>
    new Set(
      (favoritesQuery.data.value ?? []).map((favorite) =>
        String(favorite.productId),
      ),
    ),
);
const favoritePending = computed(
  () =>
    addFavoriteMutation.isPending.value ||
    removeFavoriteMutation.isPending.value,
);

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : date.format(parsed);
}
function carrierLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.toLowerCase() === "ghn" ? "Giao Hàng Nhanh (GHN)" : value;
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
function safeBack(): void {
  if (typeof window.history.state?.back === "string") router.back();
  else
    void router.push({
      name: ROUTE_NAMES.customerOrders,
      ...(isPreviewRoute.value ? { query: { preview: "1" } } : {}),
    });
}
async function copyValue(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    copiedValue.value = value;
    if (copyResetTimer !== null) window.clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
      copiedValue.value = null;
      copyResetTimer = null;
    }, 3000);
  } catch {
    copiedValue.value = null;
  }
}
async function buyAgain(): Promise<void> {
  if (!order.value || isPreviewRoute.value || buyAgainPending.value) return;
  buyAgainPending.value = true;
  let added = 0;
  const failed: string[] = [];
  try {
    for (const item of order.value.items) {
      try {
        await addCartItemMutation.mutateAsync({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
        });
        added += 1;
      } catch {
        failed.push(item.productName);
      }
    }
    if (added > 0) await cartQuery.refetch();
    toast({
      title: failed.length
        ? `Đã thêm ${added}/${order.value.items.length} sản phẩm. Không thể thêm: ${failed.join(", ")}.`
        : "Đã thêm sản phẩm vào giỏ hàng.",
      variant: failed.length ? "error" : "success",
    });
  } finally {
    buyAgainPending.value = false;
  }
}
async function toggleRecommendationFavorite(
  product: ProductListingProduct,
): Promise<void> {
  const productId = Number(product.id);
  if (
    !Number.isSafeInteger(productId) ||
    productId <= 0 ||
    favoritePending.value
  )
    return;
  const removing = favoriteIds.value.has(product.id);
  try {
    if (removing) await removeFavoriteMutation.mutateAsync(productId);
    else await addFavoriteMutation.mutateAsync(productId);
    toast({
      title: removing
        ? "Đã bỏ sản phẩm khỏi yêu thích."
        : "Đã thêm sản phẩm vào yêu thích.",
      variant: "success",
    });
  } catch {
    toast({
      title: "Không thể cập nhật danh sách yêu thích.",
      variant: "error",
    });
  }
}

onMounted(async () => {
  if (!isPreviewRoute.value) return;
  const preview = await import(
    /* @vite-ignore */ "../../data/customerOrderPreview.ts"
  );
  previewOrder.value =
    preview.findCustomerOrderPreview(String(route.params.fixtureId ?? "")) ??
    null;
  previewResolved.value = true;
});
onBeforeUnmount(() => {
  if (copyResetTimer !== null) window.clearTimeout(copyResetTimer);
});
</script>

<template>
  <CustomerLayout :hide-floating-utilities="true">
    <div class="min-h-[70svh] bg-[#f5f6f5]">
      <div
        class="mx-auto w-full max-w-[90rem] overflow-x-clip px-4 py-4 sm:px-5 md:py-5 lg:px-7"
      >
        <header class="flex items-center gap-2" data-order-detail-header>
          <button
            type="button"
            class="grid size-9 shrink-0 place-items-center rounded-xl text-primary-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Quay lại"
            @click="safeBack"
          >
            <ArrowLeft class="size-4.5" aria-hidden="true" />
          </button>
          <h1
            class="whitespace-nowrap text-[1.3rem] font-bold tracking-[-0.025em] text-primary-950 sm:text-[1.55rem]"
          >
            Chi tiết đơn hàng
          </h1>
          <span
            v-if="isPreviewRoute"
            class="ml-auto rounded-pill border border-sky-200 bg-sky-50 px-2 py-1 text-[0.68rem] font-semibold text-sky-800 sm:px-3 sm:text-caption"
            >Dữ liệu xem trước</span
          >
        </header>

        <CustomerOrderSkeleton
          v-if="isLoading"
          detail
          class="mt-5"
          aria-label="Đang tải chi tiết đơn hàng"
        />
        <div
          v-else-if="isMissing"
          class="mt-5 rounded-3xl bg-red-50 p-6 text-center ring-1 ring-red-200"
          role="alert"
        >
          <p class="font-semibold text-red-800">
            {{
              isPreviewRoute
                ? "Không tìm thấy mẫu giao diện này."
                : "Chưa thể tải chi tiết đơn hàng."
            }}
          </p>
          <button
            v-if="!isPreviewRoute"
            type="button"
            class="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary-800 px-4 text-body-sm font-semibold text-white"
            @click="orderQuery.refetch()"
          >
            <RefreshCw class="size-4" aria-hidden="true" />Thử lại
          </button>
        </div>

        <template v-else-if="order">
          <div
            class="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]"
            :data-order-presentation-state="presentationState"
          >
            <div class="grid min-w-0 gap-4">
              <section
                v-if="isActive"
                class="rounded-[1.6rem] bg-white p-5 shadow-[0_12px_36px_rgba(25,52,42,0.065)] ring-1 ring-black/[0.045]"
                data-active-order-detail
              >
                <div class="flex items-center justify-between gap-3">
                  <CustomerOrderStatusBadge :status="order.status" /><span
                    class="text-body-sm font-medium text-[#5e7168]"
                    >{{
                      order.deliveryMethod === "delivery"
                        ? "Giao tận nơi"
                        : "Nhận tại chi nhánh"
                    }}</span
                  >
                </div>
                <CustomerOrderProgress
                  v-if="order.deliveryMethod === 'delivery'"
                  :order="order"
                  class="mt-7 rounded-2xl bg-[#f4f8f6] p-5"
                />
              </section>

              <section
                v-else-if="isCompleted"
                class="rounded-[1.6rem] bg-white p-5 shadow-[0_12px_36px_rgba(25,52,42,0.065)] ring-1 ring-black/[0.045]"
                data-completed-order-detail
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p
                      class="text-caption font-semibold uppercase tracking-[0.12em] text-[#41906d]"
                    >
                      Hoàn tất
                    </p>
                    <h2
                      class="mt-1 text-xl font-bold tracking-[-0.02em] text-[#153d2f]"
                    >
                      Đơn hàng đã hoàn thành
                    </h2>
                  </div>
                  <CustomerOrderStatusBadge :status="order.status" />
                </div>
                <div
                  v-if="order.shipment"
                  class="mt-6 rounded-2xl bg-[#f3f8f5] p-4"
                >
                  <p
                    v-if="carrierLabel(order.shipment.provider)"
                    class="font-semibold text-[#244b3c]"
                  >
                    {{ carrierLabel(order.shipment.provider) }}
                  </p>
                  <p
                    v-if="order.shipment.trackingCode"
                    class="mt-1 text-body-sm text-text-secondary"
                  >
                    Mã vận đơn: {{ order.shipment.trackingCode }}
                  </p>
                  <div
                    v-if="order.shipment.deliveredAt"
                    class="mt-5 flex gap-3"
                  >
                    <span
                      class="grid size-10 shrink-0 place-items-center rounded-full bg-[#36a974] text-white"
                      ><Truck class="size-5" aria-hidden="true"
                    /></span>
                    <div>
                      <p class="font-semibold text-[#173d30]">
                        Giao hàng thành công
                      </p>
                      <p class="mt-1 text-body-sm text-text-secondary">
                        {{ formatDate(order.shipment.deliveredAt) }}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section
                v-else-if="isCancelled"
                class="rounded-[1.6rem] bg-[#fff7f6] p-5 shadow-[0_12px_36px_rgba(92,44,38,0.06)] ring-1 ring-rose-100"
                data-cancellation-summary
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <h2
                    class="text-xl font-bold tracking-[-0.02em] text-rose-900"
                  >
                    Đã hủy đơn hàng
                  </h2>
                  <CustomerOrderStatusBadge :status="order.status" />
                </div>
                <p
                  v-if="
                    formatDate(
                      order.cancellation?.cancelled_at ?? order.cancelledAt,
                    )
                  "
                  class="mt-5 text-lg font-semibold text-rose-900"
                >
                  Đã hủy vào
                  {{
                    formatDate(
                      order.cancellation?.cancelled_at ?? order.cancelledAt,
                    )
                  }}
                </p>
                <dl class="mt-4 grid gap-4 text-body-sm sm:grid-cols-2">
                  <div v-if="cancellationRequesterLabel">
                    <dt class="text-text-muted">Yêu cầu bởi</dt>
                    <dd class="mt-1 font-semibold">
                      {{ cancellationRequesterLabel }}
                    </dd>
                  </div>
                  <div v-if="formatDate(order.cancellationRequestedAt)">
                    <dt class="text-text-muted">Yêu cầu lúc</dt>
                    <dd class="mt-1 font-semibold">
                      {{ formatDate(order.cancellationRequestedAt) }}
                    </dd>
                  </div>
                  <div v-if="order.cancellation?.reason">
                    <dt class="text-text-muted">Lý do</dt>
                    <dd class="mt-1 font-semibold">
                      {{ order.cancellation.reason }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-text-muted">Phương thức thanh toán</dt>
                    <dd class="mt-1 font-semibold">{{ paymentLabel }}</dd>
                  </div>
                </dl>
                <div
                  v-if="order.shipment?.status?.toLowerCase() === 'cancelled'"
                  class="mt-5 flex items-start gap-3 rounded-2xl bg-white/80 p-4 text-body-sm text-rose-800"
                  data-cancelled-shipment
                >
                  <Truck class="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
                  <p>
                    Đơn vị vận chuyển thông báo đơn hàng đã bị hủy<span
                      v-if="order.shipment.cancelledAt"
                    >
                      · {{ formatDate(order.shipment.cancelledAt) }}</span
                    >
                  </p>
                </div>
                <div class="mt-5 rounded-2xl bg-white/80 p-4">
                  <template v-if="order.deliveryMethod === 'delivery'"
                    ><p
                      v-if="order.deliveryAddress?.recipient_name"
                      class="font-semibold"
                    >
                      {{ order.deliveryAddress.recipient_name
                      }}<span v-if="order.deliveryAddress.recipient_phone">
                        · {{ order.deliveryAddress.recipient_phone }}</span
                      >
                    </p>
                    <p
                      v-if="order.deliveryAddress?.full_address"
                      class="mt-1 text-body-sm text-text-secondary"
                    >
                      {{ order.deliveryAddress.full_address }}
                    </p></template
                  ><template v-else
                    ><p
                      v-if="
                        order.pickupCustomerName || order.pickupCustomerPhone
                      "
                      class="font-semibold"
                    >
                      {{ order.pickupCustomerName
                      }}<span v-if="order.pickupCustomerPhone">
                        · {{ order.pickupCustomerPhone }}</span
                      >
                    </p>
                    <p
                      v-if="
                        order.pickupCustomerAddress ??
                        order.deliveryAddress?.full_address
                      "
                      class="mt-1 text-body-sm text-text-secondary"
                    >
                      {{
                        order.pickupCustomerAddress ??
                        order.deliveryAddress?.full_address
                      }}
                    </p>
                    <p class="mt-3 font-semibold">{{ order.branch.name }}</p>
                    <p class="mt-1 text-body-sm text-text-secondary">
                      {{ order.branch.address }}
                    </p></template
                  >
                </div>
              </section>

              <section
                v-else-if="isRefund && order.refund"
                :class="[
                  'rounded-[1.6rem] p-5 shadow-[0_12px_36px_rgba(25,52,42,0.065)] ring-1',
                  refundTone === 'rose'
                    ? 'bg-[#fff7f7] ring-rose-100'
                    : refundTone === 'green'
                      ? 'bg-[#f2faf6] ring-emerald-100'
                      : 'bg-[#f4f8fc] ring-sky-100',
                ]"
                data-refund-status-card
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p
                      class="text-caption font-semibold uppercase tracking-[0.12em] text-text-muted"
                    >
                      Trả hàng / hoàn tiền
                    </p>
                    <h2
                      class="mt-1 text-xl font-bold tracking-[-0.02em] text-[#173d30]"
                    >
                      {{ refundTitle }}
                    </h2>
                  </div>
                  <CustomerOrderStatusBadge
                    :status="order.status"
                    :label="refundTitle"
                    :tone="
                      order.refund.status === 'rejected'
                        ? 'refund-rejected'
                        : order.refund.status === 'refunded'
                          ? 'refund-success'
                          : 'refund-processing'
                    "
                  />
                </div>
                <CustomerRefundProgress
                  v-if="order.refund.status !== 'rejected'"
                  :refund="order.refund"
                  class="mt-7 rounded-2xl bg-white/75 p-5"
                />
                <div
                  v-if="
                    order.refund.status === 'approved' ||
                    order.refund.status === 'refunded'
                  "
                  class="mt-5 rounded-2xl bg-white/80 p-4 text-body-sm text-text-secondary"
                >
                  <p class="font-semibold text-[#173d30]">
                    Yêu cầu của bạn đã được Mizuki xử lý.
                  </p>
                  <p
                    v-if="order.refund.paymentDestination === 'card'"
                    class="mt-2"
                  >
                    Khoản hoàn có thể cần thêm 7–14 ngày để ngân hàng cập nhật.
                    Bạn có thể liên hệ ngân hàng để kiểm tra ngày ghi nhận cụ
                    thể.
                  </p>
                  <p
                    v-else-if="order.refund.paymentDestination === 'wallet'"
                    class="mt-2"
                  >
                    Tiền hoàn về Ví Mizuki thường được cập nhật gần như ngay lập
                    tức và có thể dùng cho đơn hàng tiếp theo.
                  </p>
                </div>
                <dl
                  v-if="order.refund.status === 'rejected'"
                  class="mt-5 grid gap-4 rounded-2xl bg-white/80 p-4 text-body-sm sm:grid-cols-2"
                >
                  <div v-if="formatDate(order.refund.reviewedAt)">
                    <dt class="text-text-muted">Ngày từ chối</dt>
                    <dd class="mt-1 font-semibold">
                      {{ formatDate(order.refund.reviewedAt) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-text-muted">Số tiền yêu cầu</dt>
                    <dd class="mt-1 font-semibold">
                      {{ currency.format(order.refund.requestedAmount) }}
                    </dd>
                  </div>
                  <div v-if="order.refund.reviewNote" class="sm:col-span-2">
                    <dt class="text-text-muted">Lý do từ chối</dt>
                    <dd class="mt-1 font-semibold">
                      {{ order.refund.reviewNote }}
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                v-if="!isCancelled"
                class="rounded-[1.4rem] bg-white p-5 shadow-[0_8px_28px_rgba(25,52,42,0.05)] ring-1 ring-black/[0.04]"
                aria-labelledby="order-destination-title"
                data-customer-destination
              >
                <div class="flex gap-3">
                  <MapPin
                    v-if="order.deliveryMethod === 'delivery'"
                    class="mt-0.5 size-5 shrink-0 text-[#3e956d]"
                    aria-hidden="true"
                  /><Store
                    v-else
                    class="mt-0.5 size-5 shrink-0 text-[#3e956d]"
                    aria-hidden="true"
                  />
                  <div class="min-w-0">
                    <h2
                      id="order-destination-title"
                      class="font-semibold text-primary-950"
                    >
                      {{
                        isCompleted
                          ? "Địa chỉ nhận hàng"
                          : order.deliveryMethod === "delivery"
                            ? "Địa chỉ giao hàng"
                            : "Thông tin nhận tại chi nhánh"
                      }}
                    </h2>
                    <template v-if="order.deliveryMethod === 'delivery'"
                      ><p
                        v-if="order.deliveryAddress?.recipient_name"
                        class="mt-3 font-medium"
                      >
                        {{ order.deliveryAddress.recipient_name
                        }}<span v-if="order.deliveryAddress.recipient_phone">
                          · {{ order.deliveryAddress.recipient_phone }}</span
                        >
                      </p>
                      <p
                        v-if="order.deliveryAddress?.full_address"
                        class="mt-1 text-body-sm text-text-secondary"
                      >
                        {{ order.deliveryAddress.full_address }}
                      </p></template
                    ><template v-else
                      ><p
                        v-if="
                          order.pickupCustomerName || order.pickupCustomerPhone
                        "
                        class="mt-3 font-medium"
                      >
                        {{ order.pickupCustomerName
                        }}<span v-if="order.pickupCustomerPhone">
                          · {{ order.pickupCustomerPhone }}</span
                        >
                      </p>
                      <p
                        v-if="
                          order.pickupCustomerAddress ??
                          order.deliveryAddress?.full_address
                        "
                        class="mt-1 text-body-sm text-text-secondary"
                      >
                        {{
                          order.pickupCustomerAddress ??
                          order.deliveryAddress?.full_address
                        }}
                      </p>
                      <p class="mt-3 font-medium">{{ order.branch.name }}</p>
                      <p class="mt-1 text-body-sm text-text-secondary">
                        {{ order.branch.address }}
                      </p></template
                    >
                  </div>
                </div>
              </section>

              <section
                v-if="isActive && order.shipment"
                class="rounded-[1.4rem] bg-[#edf8f2] p-5 ring-1 ring-[#dcefe5]"
                data-shipment-information
              >
                <h2
                  class="flex items-center gap-2 font-semibold text-[#173d30]"
                >
                  <Truck
                    class="size-5 text-[#369268]"
                    aria-hidden="true"
                  />Thông tin vận chuyển
                </h2>
                <dl
                  :class="[
                    'mt-4 grid gap-4 text-body-sm sm:grid-cols-2',
                    shipmentInformationFields.length === 5 && 'lg:grid-cols-6',
                  ]"
                  data-shipment-information-grid
                >
                  <div
                    v-for="(field, index) in shipmentInformationFields"
                    :key="field.key"
                    :class="[
                      shipmentInformationFields.length === 5 && 'lg:col-span-2',
                      shipmentInformationFields.length === 5 &&
                        index === 3 &&
                        'lg:col-start-2',
                    ]"
                  >
                    <dt class="text-text-muted">{{ field.label }}</dt>
                    <dd
                      :class="[
                        'mt-1 flex items-center gap-2',
                        field.emphasis
                          ? 'font-semibold text-[#287c58]'
                          : 'font-medium',
                      ]"
                    >
                      <span class="break-words">{{ field.value }}</span
                      ><button
                        v-if="field.copy"
                        type="button"
                        class="grid size-8 shrink-0 place-items-center rounded-lg text-primary-700 hover:bg-white"
                        :aria-label="
                          copiedValue === field.value
                            ? 'Đã sao chép mã đơn hàng'
                            : 'Sao chép mã đơn hàng'
                        "
                        @click="copyValue(field.value)"
                      >
                        <Check
                          v-if="copiedValue === field.value"
                          class="size-4"
                          aria-hidden="true"
                          data-copy-success-icon
                        /><Copy v-else class="size-4" aria-hidden="true" />
                      </button>
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                class="rounded-[1.4rem] bg-white p-4 shadow-[0_8px_28px_rgba(25,52,42,0.05)] ring-1 ring-black/[0.04]"
                data-order-detail-products
              >
                <div class="flex items-center justify-between gap-3 px-1 pb-3">
                  <h2 class="font-semibold text-primary-950">
                    Sản phẩm ({{ totalQuantity }})
                  </h2>
                  <button
                    v-if="hiddenProductCount"
                    type="button"
                    class="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-body-sm font-semibold text-primary-700 hover:bg-primary-50"
                    :aria-expanded="productsOpen"
                    :aria-label="
                      productsOpen
                        ? 'Thu gọn sản phẩm'
                        : `Xem thêm ${hiddenProductCount} sản phẩm`
                    "
                    data-detail-product-expand
                    @click="productsOpen = !productsOpen"
                  >
                    {{
                      productsOpen
                        ? "Ẩn bớt"
                        : `Xem thêm ${hiddenProductCount}`
                    }}<ChevronDown
                      :class="[
                        'size-4 transition-transform',
                        productsOpen && 'rotate-180',
                      ]"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <CustomerOrderProducts :items="visibleItems" />
              </section>

              <section
                v-if="isRefund && order.refund"
                class="rounded-[1.4rem] bg-white p-5 shadow-[0_8px_28px_rgba(25,52,42,0.05)] ring-1 ring-black/[0.04]"
                data-refund-detail
              >
                <div class="flex items-center justify-between gap-3">
                  <h2 class="font-semibold text-primary-950">
                    Chi tiết yêu cầu hoàn tiền
                  </h2>
                  <button
                    type="button"
                    class="grid size-9 place-items-center rounded-xl text-primary-700 hover:bg-primary-50"
                    :aria-expanded="refundDetailOpen"
                    :aria-label="
                      refundDetailOpen
                        ? 'Ẩn chi tiết hoàn tiền'
                        : 'Hiển thị chi tiết hoàn tiền'
                    "
                    @click="refundDetailOpen = !refundDetailOpen"
                  >
                    <ChevronUp
                      v-if="refundDetailOpen"
                      class="size-5"
                      aria-hidden="true"
                    /><ChevronDown v-else class="size-5" aria-hidden="true" />
                  </button>
                </div>
                <dl
                  v-if="refundDetailOpen"
                  class="mt-4 grid gap-4 text-body-sm sm:grid-cols-2"
                >
                  <div v-if="order.refund.reason">
                    <dt class="text-text-muted">Lý do trả hàng / hoàn tiền</dt>
                    <dd class="mt-1 font-medium">{{ order.refund.reason }}</dd>
                  </div>
                  <div v-if="formatDate(order.refund.requestedAt)">
                    <dt class="text-text-muted">Đã yêu cầu lúc</dt>
                    <dd class="mt-1 font-medium">
                      {{ formatDate(order.refund.requestedAt) }}
                    </dd>
                  </div>
                  <div
                    v-if="
                      formatDate(
                        order.refund.acceptedAt ?? order.refund.reviewedAt,
                      )
                    "
                  >
                    <dt class="text-text-muted">
                      Thời gian chấp nhận trả hàng / hoàn tiền
                    </dt>
                    <dd class="mt-1 font-medium">
                      {{
                        formatDate(
                          order.refund.acceptedAt ?? order.refund.reviewedAt,
                        )
                      }}
                    </dd>
                  </div>
                  <div v-if="formatDate(order.refund.refundedAt)">
                    <dt class="text-text-muted">Thời gian hoàn tiền</dt>
                    <dd class="mt-1 font-medium">
                      {{ formatDate(order.refund.refundedAt) }}
                    </dd>
                  </div>
                  <div
                    v-if="
                      order.refund.status === 'rejected' &&
                      formatDate(order.refund.reviewedAt)
                    "
                  >
                    <dt class="text-text-muted">Thời gian từ chối</dt>
                    <dd class="mt-1 font-medium">
                      {{ formatDate(order.refund.reviewedAt) }}
                    </dd>
                  </div>
                  <div
                    v-if="
                      order.refund.status === 'rejected' &&
                      order.refund.reviewNote
                    "
                  >
                    <dt class="text-text-muted">Lý do từ chối</dt>
                    <dd class="mt-1 font-medium">
                      {{ order.refund.reviewNote }}
                    </dd>
                  </div>
                  <div class="sm:col-span-2">
                    <dt class="text-text-muted">
                      Mã yêu cầu trả hàng / hoàn tiền
                    </dt>
                    <dd class="mt-1 flex items-center gap-2 font-semibold">
                      <span class="break-all">{{
                        order.refund.refundNumber
                      }}</span
                      ><button
                        type="button"
                        class="grid size-8 place-items-center rounded-lg text-primary-700 hover:bg-primary-50"
                        :aria-label="
                          copiedValue === order.refund.refundNumber
                            ? 'Đã sao chép mã yêu cầu hoàn tiền'
                            : 'Sao chép mã yêu cầu hoàn tiền'
                        "
                        @click="copyValue(order.refund.refundNumber)"
                      >
                        <Check
                          v-if="copiedValue === order.refund.refundNumber"
                          class="size-4"
                          aria-hidden="true"
                          data-copy-success-icon
                        /><Copy v-else class="size-4" aria-hidden="true" />
                      </button>
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            <aside class="grid h-fit gap-4 xl:sticky xl:top-24">
              <section
                class="rounded-[1.4rem] bg-white p-5 shadow-[0_8px_28px_rgba(25,52,42,0.05)] ring-1 ring-black/[0.04]"
                aria-label="Tổng tiền đơn hàng"
                data-money-box
              >
                <div class="flex items-center justify-between gap-3">
                  <h2 class="font-semibold text-primary-950">
                    {{ isRefund ? "Hoàn tiền" : "Thanh toán" }}
                  </h2>
                  <button
                    type="button"
                    class="grid size-9 place-items-center rounded-xl text-primary-700 hover:bg-primary-50"
                    :aria-label="
                      moneyOpen
                        ? 'Ẩn chi tiết thanh toán'
                        : 'Hiển thị chi tiết thanh toán'
                    "
                    :aria-expanded="moneyOpen"
                    @click="moneyOpen = !moneyOpen"
                  >
                    <ChevronUp
                      v-if="moneyOpen"
                      class="size-5"
                      aria-hidden="true"
                    /><ChevronDown v-else class="size-5" aria-hidden="true" />
                  </button>
                </div>
                <div class="mt-4 flex items-end justify-between gap-3">
                  <span class="text-body-sm text-text-secondary">{{
                    isRefund ? "Tổng tiền hoàn" : "Thành tiền"
                  }}</span
                  ><strong
                    class="text-xl font-bold tracking-[-0.02em] text-[#173d30]"
                    >{{
                      currency.format(
                        isRefund ? refundDisplayAmount : order.totalAmount,
                      )
                    }}</strong
                  >
                </div>
                <dl
                  v-if="moneyOpen && !isRefund"
                  class="mt-5 grid gap-3 border-t border-black/[0.06] pt-4 text-body-sm"
                  data-money-breakdown
                >
                  <div class="flex justify-between gap-3">
                    <dt>Tổng tiền hàng</dt>
                    <dd>{{ currency.format(order.subtotal) }}</dd>
                  </div>
                  <div
                    v-if="
                      order.productDiscountAmount !== null &&
                      order.productDiscountAmount !== undefined
                    "
                    class="flex justify-between gap-3"
                  >
                    <dt>Giảm giá sản phẩm</dt>
                    <dd>-{{ currency.format(order.productDiscountAmount) }}</dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt>Phí vận chuyển</dt>
                    <dd>{{ currency.format(order.shippingFee) }}</dd>
                  </div>
                  <div
                    v-if="
                      order.shippingDiscountAmount !== null &&
                      order.shippingDiscountAmount !== undefined
                    "
                    class="flex justify-between gap-3"
                  >
                    <dt>Ưu đãi phí vận chuyển</dt>
                    <dd>
                      -{{ currency.format(order.shippingDiscountAmount) }}
                    </dd>
                  </div>
                  <div
                    v-if="
                      order.voucherDiscountAmount !== null &&
                      order.voucherDiscountAmount !== undefined
                    "
                    class="flex justify-between gap-3"
                  >
                    <dt>Mizuki Voucher</dt>
                    <dd>-{{ currency.format(order.voucherDiscountAmount) }}</dd>
                  </div>
                </dl>
                <dl
                  v-else-if="moneyOpen && order.refund"
                  class="mt-5 grid gap-3 border-t border-black/[0.06] pt-4 text-body-sm"
                  data-money-breakdown
                  data-refund-money-breakdown
                >
                  <div class="flex justify-between gap-3">
                    <dt>Tổng tiền</dt>
                    <dd>{{ currency.format(order.refund.requestedAmount) }}</dd>
                  </div>
                  <div
                    v-if="refundDestinationLabel"
                    class="flex justify-between gap-3"
                  >
                    <dt>Hoàn tiền vào</dt>
                    <dd class="text-right">{{ refundDestinationLabel }}</dd>
                  </div>
                  <div
                    v-if="
                      order.refund.productValue !== null &&
                      order.refund.productValue !== undefined
                    "
                    class="flex justify-between gap-3"
                  >
                    <dt>Tổng giá trị sản phẩm</dt>
                    <dd>{{ currency.format(order.refund.productValue) }}</dd>
                  </div>
                  <div
                    v-if="
                      order.refund.voucherDiscountAmount !== null &&
                      order.refund.voucherDiscountAmount !== undefined
                    "
                    class="flex justify-between gap-3"
                  >
                    <dt>Voucher giảm giá</dt>
                    <dd>
                      {{ currency.format(order.refund.voucherDiscountAmount) }}
                    </dd>
                  </div>
                  <div
                    v-if="
                      order.refund.receivedAmount !== null &&
                      order.refund.receivedAmount !== undefined
                    "
                    class="flex justify-between gap-3 font-semibold text-[#173d30]"
                  >
                    <dt>Số tiền hoàn nhận được</dt>
                    <dd>{{ currency.format(order.refund.receivedAmount) }}</dd>
                  </div>
                </dl>
                <dl
                  class="mt-5 grid gap-3 border-t border-black/[0.06] pt-4 text-body-sm"
                  data-payment-summary
                >
                  <div class="flex items-center justify-between gap-3">
                    <dt class="text-text-secondary">Phương thức thanh toán</dt>
                    <dd class="text-right font-semibold text-primary-950">
                      {{ paymentLabel }}
                    </dd>
                  </div>
                  <div
                    v-if="order.paymentStatus"
                    class="flex items-center justify-between gap-3"
                  >
                    <dt class="text-text-secondary">Trạng thái thanh toán</dt>
                    <dd>
                      <CustomerOrderPaymentStatusBadge
                        :status="order.paymentStatus"
                        :label="order.paymentStatusLabel"
                      />
                    </dd>
                  </div>
                  <div
                    v-if="order.payment?.paymentNumber"
                    class="flex items-start justify-between gap-3"
                  >
                    <dt class="text-text-secondary">Mã thanh toán</dt>
                    <dd class="break-all text-right font-medium">
                      {{ order.payment.paymentNumber }}
                    </dd>
                  </div>
                  <div
                    v-if="order.payment?.provider"
                    class="flex items-start justify-between gap-3"
                  >
                    <dt class="text-text-secondary">Nhà cung cấp</dt>
                    <dd class="text-right font-medium">
                      {{ order.payment.provider }}
                    </dd>
                  </div>
                  <div
                    v-if="order.payment?.transactionReference"
                    class="flex items-start justify-between gap-3"
                  >
                    <dt class="text-text-secondary">Mã giao dịch</dt>
                    <dd class="break-all text-right font-medium">
                      {{ order.payment.transactionReference }}
                    </dd>
                  </div>
                  <div
                    v-if="paymentEvent && formatDate(paymentEvent.value)"
                    class="flex items-start justify-between gap-3"
                  >
                    <dt class="text-text-secondary">
                      {{ paymentEvent.label }}
                    </dt>
                    <dd class="text-right font-medium">
                      {{ formatDate(paymentEvent.value) }}
                    </dd>
                  </div>
                </dl>
                <button
                  v-if="canBuyAgain"
                  type="button"
                  class="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#32946a] bg-white px-4 text-body-sm font-semibold text-[#287a57] hover:bg-[#f1faf5] disabled:opacity-55"
                  :disabled="buyAgainPending"
                  @click="buyAgain"
                >
                  <RotateCcw class="size-4" aria-hidden="true" />{{
                    buyAgainPending ? "Đang thêm…" : "Mua lại"
                  }}
                </button>
                <div
                  v-else-if="isPreviewRoute"
                  class="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f5f6f5] px-4 text-body-sm font-semibold text-text-muted"
                >
                  <Check class="size-4" aria-hidden="true" />Mẫu chỉ để xem
                </div>
              </section>

              <section
                v-if="!isActive"
                class="rounded-[1.4rem] bg-white p-5 shadow-[0_8px_28px_rgba(25,52,42,0.05)] ring-1 ring-black/[0.04]"
                data-order-meta
              >
                <div class="flex items-center justify-between gap-3">
                  <h2 class="font-semibold text-primary-950">Mã đơn hàng</h2>
                  <button
                    type="button"
                    class="grid size-9 place-items-center rounded-xl text-primary-700 hover:bg-primary-50"
                    :aria-expanded="metaOpen"
                    :aria-label="
                      metaOpen
                        ? 'Ẩn thông tin đơn hàng'
                        : 'Hiển thị thông tin đơn hàng'
                    "
                    @click="metaOpen = !metaOpen"
                  >
                    <ChevronUp
                      v-if="metaOpen"
                      class="size-5"
                      aria-hidden="true"
                    /><ChevronDown v-else class="size-5" aria-hidden="true" />
                  </button>
                </div>
                <div class="mt-3 flex items-center gap-2">
                  <strong class="min-w-0 break-all text-body-sm">{{
                    order.orderNumber
                  }}</strong
                  ><button
                    type="button"
                    class="grid size-8 shrink-0 place-items-center rounded-lg text-primary-700 hover:bg-primary-50"
                    :aria-label="
                      copiedValue === order.orderNumber
                        ? 'Đã sao chép mã đơn hàng'
                        : 'Sao chép mã đơn hàng'
                    "
                    @click="copyValue(order.orderNumber)"
                  >
                    <Check
                      v-if="copiedValue === order.orderNumber"
                      class="size-4"
                      aria-hidden="true"
                      data-copy-success-icon
                    /><Copy v-else class="size-4" aria-hidden="true" />
                  </button>
                </div>
                <dl
                  v-if="metaOpen"
                  class="mt-4 grid gap-3 border-t border-black/[0.06] pt-4 text-body-sm"
                >
                  <div>
                    <dt class="text-text-muted">Phương thức thanh toán</dt>
                    <dd class="mt-1 font-medium">{{ paymentLabel }}</dd>
                  </div>
                  <div v-if="formatDate(order.placedAt ?? order.createdAt)">
                    <dt class="text-text-muted">Thời gian đặt hàng</dt>
                    <dd class="mt-1 font-medium">
                      {{ formatDate(order.placedAt ?? order.createdAt) }}
                    </dd>
                  </div>
                  <div v-if="formatDate(order.paidAt)">
                    <dt class="text-text-muted">Thời gian thanh toán</dt>
                    <dd class="mt-1 font-medium">
                      {{ formatDate(order.paidAt) }}
                    </dd>
                  </div>
                  <div v-if="formatDate(order.shipment?.shippedAt)">
                    <dt class="text-text-muted">Đơn vị vận chuyển lấy hàng</dt>
                    <dd class="mt-1 font-medium">
                      {{ formatDate(order.shipment?.shippedAt) }}
                    </dd>
                  </div>
                  <div v-if="formatDate(order.shipment?.deliveredAt)">
                    <dt class="text-text-muted">Thời gian hoàn thành đơn</dt>
                    <dd class="mt-1 font-medium">
                      {{ formatDate(order.shipment?.deliveredAt) }}
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                class="rounded-[1.4rem] bg-white p-5 shadow-[0_8px_28px_rgba(25,52,42,0.05)] ring-1 ring-black/[0.04]"
                aria-labelledby="support-title"
              >
                <h2
                  id="support-title"
                  class="flex items-center gap-2 font-semibold text-primary-950"
                >
                  <HelpCircle
                    class="size-5 text-[#3e956d]"
                    aria-hidden="true"
                  />Bạn cần hỗ trợ?
                </h2>
                <div class="mt-4 grid gap-2">
                  <div
                    v-if="order.availableActions?.canRequestRefund"
                    class="flex min-h-11 items-center gap-3 rounded-xl bg-[#f7f8f7] px-3 text-body-sm font-medium text-text-secondary"
                  >
                    <Undo2
                      class="size-4 text-[#3e956d]"
                      aria-hidden="true"
                    />Gửi yêu cầu trả hàng/hoàn tiền<span
                      v-if="isPreviewRoute"
                      class="ml-auto text-caption"
                      >Xem trước</span
                    >
                  </div>
                  <div
                    class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-body-sm text-text-secondary"
                  >
                    <MessageCircle
                      class="size-4 text-[#3e956d]"
                      aria-hidden="true"
                    />Liên hệ Mizuki
                  </div>
                  <RouterLink
                    :to="{
                      path: '/customer-shell',
                      query: { section: 'support' },
                    }"
                    class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-body-sm font-semibold text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    ><Headphones
                      class="size-4 text-[#3e956d]"
                      aria-hidden="true" />Trung tâm hỗ trợ<ChevronRight
                      class="ml-auto size-4"
                      aria-hidden="true"
                  /></RouterLink>
                </div>
              </section>
            </aside>
          </div>

          <section class="mt-10" data-order-recommendations>
            <div class="mb-5 flex items-center gap-4">
              <span class="h-px flex-1 bg-black/10" aria-hidden="true" />
              <h2
                class="shrink-0 text-center text-lg font-semibold tracking-[-0.01em] text-[#25493a]"
              >
                Có thể bạn cũng thích
              </h2>
              <span class="h-px flex-1 bg-black/10" aria-hidden="true" />
            </div>
            <ProductSuggestions
              layout="six-column-grid"
              :show-header="false"
              :products="recommendations"
              :state="recommendationsState"
              :favorite-ids="favoriteIds"
              :favorite-pending="favoritePending"
              @retry="recommendationsQuery.refetch()"
              @toggle-favorite="toggleRecommendationFavorite"
            />
          </section>
        </template>
      </div>
    </div>
    <CustomerBackToTop />
  </CustomerLayout>
</template>
