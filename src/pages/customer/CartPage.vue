<script setup lang="ts">
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Info,
  LockKeyhole,
  Search,
  ShoppingBag,
  TicketPercent,
  Truck,
} from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import CartItemCard from "@/components/cart/CartItemCard.vue";
import BaseCheckbox from "@/components/common/BaseCheckbox.vue";
import BaseDialog from "@/components/common/BaseDialog.vue";
import BaseSkeleton from "@/components/common/BaseSkeleton.vue";
import BaseTooltip from "@/components/common/BaseTooltip.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { ROUTE_NAMES } from "@/constants/routes";
import CustomerLayout from "@/layouts/CustomerLayout.vue";
import {
  useCustomerCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from "@/queries/cart";
import { useAuthStore } from "@/stores/auth";
import { pinia } from "@/stores/pinia";
import type { CustomerCartItem } from "@/types/cart";

type CartVoucherKind = "order" | "shipping";
type CartVoucherDiscountType = "fixed" | "percentage";

interface CartVoucher {
  readonly id: string;
  readonly code: string;
  readonly kind: CartVoucherKind;
  readonly label: string;
  readonly description: string;
  readonly discountType: CartVoucherDiscountType;
  readonly discountValue: number;
  readonly maximumDiscount?: number;
  readonly minimumOrder: number;
  readonly expiryText: string;
}

const cartVouchers: readonly CartVoucher[] = [
  {
    id: "order-50",
    code: "MIZUKI50",
    kind: "order",
    label: "Giảm 50.000 ₫",
    description: "Cho đơn hàng chăm sóc sắc đẹp.",
    discountType: "fixed",
    discountValue: 50_000,
    minimumOrder: 300_000,
    expiryText: "HSD 31/08/2026",
  },
  {
    id: "order-10",
    code: "BEAUTY10",
    kind: "order",
    label: "Giảm 10% tối đa 80.000 ₫",
    description: "Ưu đãi cho đơn hàng từ Mizuki.",
    discountType: "percentage",
    discountValue: 10,
    maximumDiscount: 80_000,
    minimumOrder: 500_000,
    expiryText: "HSD 15/09/2026",
  },
  {
    id: "order-premium",
    code: "PREMIUM150",
    kind: "order",
    label: "Giảm 150.000 ₫",
    description: "Đặc quyền cho đơn hàng cao cấp.",
    discountType: "fixed",
    discountValue: 150_000,
    minimumOrder: 1_500_000,
    expiryText: "HSD 30/09/2026",
  },
  {
    id: "shipping-free",
    code: "FREESHIP",
    kind: "shipping",
    label: "Miễn phí vận chuyển",
    description: "Giảm phí giao hàng tiêu chuẩn.",
    discountType: "percentage",
    discountValue: 100,
    minimumOrder: 400_000,
    expiryText: "HSD 20/09/2026",
  },
  {
    id: "shipping-20",
    code: "SHIP20",
    kind: "shipping",
    label: "Giảm 20.000 ₫ phí vận chuyển",
    description: "Áp dụng cho đơn giao tận nơi.",
    discountType: "fixed",
    discountValue: 20_000,
    minimumOrder: 250_000,
    expiryText: "HSD 10/09/2026",
  },
  {
    id: "shipping-plus",
    code: "MIZUKISHIP",
    kind: "shipping",
    label: "Giảm 50% phí vận chuyển",
    description: "Tối đa 30.000 ₫ phí giao hàng.",
    discountType: "percentage",
    discountValue: 50,
    maximumDiscount: 30_000,
    minimumOrder: 700_000,
    expiryText: "HSD 25/09/2026",
  },
];

const orderVouchers = cartVouchers.filter(
  (voucher) => voucher.kind === "order",
);
const shippingVouchers = cartVouchers.filter(
  (voucher) => voucher.kind === "shipping",
);

const authStore = useAuthStore(pinia);
const router = useRouter();
const userId = computed(() => authStore.user?.id ?? null);
const cartQuery = useCustomerCartQuery(userId);
const updateMutation = useUpdateCartItemMutation(userId);
const removeMutation = useRemoveCartItemMutation(userId);
const feedback = ref("");
const voucherDialogOpen = ref(false);
const voucherSearch = ref("");
const orderVouchersExpanded = ref(false);
const shippingVouchersExpanded = ref(false);
const selectedOrderVoucherId = ref<string | null>(null);
const selectedShippingVoucherId = ref<string | null>(null);
const selectedItemIds = ref<ReadonlySet<number>>(new Set<number>());
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});
const cart = computed(() => cartQuery.data.value);
const items = computed(() => cart.value?.items ?? []);
const isMutationPending = computed(
  () => updateMutation.isPending.value || removeMutation.isPending.value,
);
const eligibleItems = computed(() =>
  items.value.filter((item) => isSelectable(item)),
);
const hasStockWarning = computed(() =>
  items.value.some((item) => item.stockWarning || item.availableQuantity <= 0),
);
const selectedQuantity = computed(() =>
  eligibleItems.value.reduce(
    (total, item) =>
      total + (selectedItemIds.value.has(item.id) ? item.quantity : 0),
    0,
  ),
);
const selectedLineCount = computed(
  () =>
    eligibleItems.value.filter((item) => selectedItemIds.value.has(item.id))
      .length,
);
const selectedSubtotal = computed(() =>
  eligibleItems.value.reduce(
    (total, item) =>
      total + (selectedItemIds.value.has(item.id) ? item.subtotal : 0),
    0,
  ),
);
const selectedServerDiscount = computed(() => {
  if (!cart.value || cart.value.totalAmount <= 0 || selectedSubtotal.value <= 0)
    return 0;
  const proportionalDiscount = Math.round(
    (cart.value.discountAmount * selectedSubtotal.value) /
      cart.value.totalAmount,
  );
  return Math.min(proportionalDiscount, selectedSubtotal.value);
});
const selectedOrderVoucher = computed(() =>
  orderVouchers.find((voucher) => voucher.id === selectedOrderVoucherId.value),
);
const selectedShippingVoucher = computed(() =>
  shippingVouchers.find(
    (voucher) => voucher.id === selectedShippingVoucherId.value,
  ),
);
const normalizedVoucherSearch = computed(() =>
  voucherSearch.value.trim().toLocaleLowerCase("vi-VN"),
);
const filteredOrderVouchers = computed(() => filterVouchers(orderVouchers));
const filteredShippingVouchers = computed(() =>
  filterVouchers(shippingVouchers),
);
const visibleOrderVouchers = computed(() =>
  normalizedVoucherSearch.value || orderVouchersExpanded.value
    ? filteredOrderVouchers.value
    : filteredOrderVouchers.value.slice(0, 2),
);
const visibleShippingVouchers = computed(() =>
  normalizedVoucherSearch.value || shippingVouchersExpanded.value
    ? filteredShippingVouchers.value
    : filteredShippingVouchers.value.slice(0, 2),
);
const selectedVoucherDiscount = computed(() =>
  calculateVoucherDiscount(selectedOrderVoucher.value, selectedSubtotal.value),
);
const selectedDiscount = computed(() =>
  Math.min(
    selectedServerDiscount.value + selectedVoucherDiscount.value,
    selectedSubtotal.value,
  ),
);
const selectedTotal = computed(() =>
  Math.max(selectedSubtotal.value - selectedDiscount.value, 0),
);
const selectAllModel = computed<boolean | "indeterminate">({
  get: () => {
    if (eligibleItems.value.length === 0 || selectedItemIds.value.size === 0)
      return false;
    return eligibleItems.value.every((item) =>
      selectedItemIds.value.has(item.id),
    )
      ? true
      : "indeterminate";
  },
  set: (selected) => {
    selectedItemIds.value =
      selected === true
        ? new Set(eligibleItems.value.map((item) => item.id))
        : new Set<number>();
  },
});

watch(
  items,
  (nextItems, previousItems) => {
    const previousIds = new Set((previousItems ?? []).map((item) => item.id));
    const nextSelection = new Set(
      [...selectedItemIds.value].filter((id) =>
        nextItems.some((item) => item.id === id && isSelectable(item)),
      ),
    );

    nextItems.forEach((item) => {
      if (isSelectable(item) && !previousIds.has(item.id))
        nextSelection.add(item.id);
    });
    selectedItemIds.value = nextSelection;
  },
  { immediate: true },
);

watch(userId, () => {
  selectedItemIds.value = new Set<number>();
  selectedOrderVoucherId.value = null;
  selectedShippingVoucherId.value = null;
});

function isSelectable(item: CustomerCartItem): boolean {
  return !item.stockWarning && item.availableQuantity > 0;
}

function calculateVoucherDiscount(
  voucher: CartVoucher | undefined,
  subtotal: number,
): number {
  if (!voucher || subtotal < voucher.minimumOrder) return 0;
  if (voucher.discountType === "fixed")
    return Math.min(voucher.discountValue, subtotal);
  const percentageDiscount = Math.round(
    (subtotal * voucher.discountValue) / 100,
  );
  return Math.min(
    percentageDiscount,
    voucher.maximumDiscount ?? percentageDiscount,
    subtotal,
  );
}

function isVoucherEligible(voucher: CartVoucher): boolean {
  return selectedSubtotal.value >= voucher.minimumOrder;
}

function voucherDetails(voucher: CartVoucher): string {
  return `${voucher.code} · ${voucher.expiryText} · ${voucher.description} Đơn tối thiểu ${currencyFormatter.format(voucher.minimumOrder)}.`;
}

function filterVouchers(
  vouchers: readonly CartVoucher[],
): readonly CartVoucher[] {
  if (!normalizedVoucherSearch.value) return vouchers;
  return vouchers.filter((voucher) =>
    [voucher.code, voucher.label, voucher.description].some((value) =>
      value.toLocaleLowerCase("vi-VN").includes(normalizedVoucherSearch.value),
    ),
  );
}

function messageFrom(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : "Không thể cập nhật giỏ hàng. Vui lòng thử lại.";
}

function toggleItem(itemId: number): void {
  const nextSelection = new Set(selectedItemIds.value);
  if (nextSelection.has(itemId)) nextSelection.delete(itemId);
  else nextSelection.add(itemId);
  selectedItemIds.value = nextSelection;
}

function toggleVoucher(voucher: CartVoucher): void {
  if (voucher.kind === "order") {
    if (selectedOrderVoucherId.value === voucher.id) {
      selectedOrderVoucherId.value = null;
      return;
    }
    if (isVoucherEligible(voucher)) selectedOrderVoucherId.value = voucher.id;
    return;
  }

  if (selectedShippingVoucherId.value === voucher.id) {
    selectedShippingVoucherId.value = null;
    return;
  }
  if (isVoucherEligible(voucher)) selectedShippingVoucherId.value = voucher.id;
}

function openVoucherDialog(): void {
  voucherSearch.value = "";
  orderVouchersExpanded.value = false;
  shippingVouchersExpanded.value = false;
  voucherDialogOpen.value = true;
}

function goBack(): void {
  if (router.options.history.state.back) {
    router.back();
    return;
  }
  void router.push({ name: ROUTE_NAMES.products });
}

async function updateQuantity(itemId: number, quantity: number): Promise<void> {
  feedback.value = "";
  try {
    await updateMutation.mutateAsync({ itemId, quantity });
  } catch (error: unknown) {
    feedback.value = messageFrom(error);
  }
}

async function removeItem(itemId: number): Promise<void> {
  feedback.value = "";
  try {
    await removeMutation.mutateAsync(itemId);
  } catch (error: unknown) {
    feedback.value = messageFrom(error);
  }
}
</script>

<template>
  <CustomerLayout compact-cart-mobile>
    <div class="flex h-svh min-h-0 flex-col overflow-hidden bg-surface-subtle min-[85rem]:block min-[85rem]:h-auto min-[85rem]:min-h-[70svh] min-[85rem]:overflow-visible min-[85rem]:pb-10" data-cart-page>
      <header class="sticky top-0 z-40 grid h-12 flex-none grid-cols-[2.75rem_1fr_2.75rem] items-center border-b border-border bg-white px-2 shadow-xs min-[85rem]:hidden" aria-label="Đầu trang giỏ hàng" data-cart-mobile-header>
        <button type="button" class="grid size-10 place-items-center rounded-xl text-primary-950 hover:bg-primary-50" aria-label="Quay lại" @click="goBack"><ArrowLeft class="size-5" aria-hidden="true" /></button>
        <h1 class="text-center text-body-lg font-semibold text-primary-950">Giỏ hàng</h1>
        <span aria-hidden="true" />
      </header>

      <div class="app-container flex min-h-0 flex-1 flex-col py-0 min-[85rem]:block min-[85rem]:py-3">
        <nav
          class="hidden items-center gap-1.5 text-caption text-text-secondary min-[85rem]:flex"
          aria-label="Đường dẫn trang"
        >
          <RouterLink
            :to="{ name: 'customer-home' }"
            class="rounded-md transition-colors hover:text-primary-800"
          >
            Trang chủ
          </RouterLink>
          <ChevronRight class="size-4" aria-hidden="true" />
          <span aria-current="page">Giỏ hàng</span>
        </nav>

        <p
          v-if="feedback"
          class="mt-3 flex items-start gap-2 rounded-2xl border border-[#edcbc7] bg-[#fff5f3] px-4 py-3 text-body-sm font-medium text-[#8f3733]"
          role="alert"
        >
          <AlertTriangle class="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {{ feedback }}
        </p>

        <section
          v-if="!authStore.isAuthenticated"
          class="mt-3 rounded-4xl border border-primary-100 bg-white p-6 shadow-xs sm:p-10"
          data-cart-auth-required
        >
          <EmptyState
            title="Đăng nhập để xem giỏ hàng"
            description="Giỏ hàng của bạn được đồng bộ an toàn trên mọi thiết bị."
            class="border-0 bg-transparent p-0"
          >
            <template #icon
              ><LockKeyhole class="size-6" aria-hidden="true"
            /></template>
            <template #action>
              <RouterLink
                :to="{ name: ROUTE_NAMES.login, query: { redirect: '/cart' } }"
                class="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-white"
              >
                Đăng nhập
              </RouterLink>
            </template>
          </EmptyState>
        </section>

        <section
          v-else-if="cartQuery.isPending.value"
          class="mt-3 grid gap-6 min-[85rem]:grid-cols-[minmax(0,1fr)_23rem]"
          data-cart-loading
          aria-label="Đang tải giỏ hàng"
        >
          <div class="grid gap-4">
            <div class="rounded-3xl border border-primary-100 bg-white p-5">
              <BaseSkeleton class="h-16 w-full" />
            </div>
            <div
              v-for="index in 2"
              :key="index"
              class="rounded-3xl border border-primary-100 bg-white p-5"
            >
              <div class="flex gap-4">
                <BaseSkeleton class="size-24 flex-none" />
                <div class="flex-1 space-y-3">
                  <BaseSkeleton shape="text" class="w-3/4" /><BaseSkeleton
                    shape="text"
                    class="w-1/2"
                  /><BaseSkeleton class="mt-5 h-10 w-32" />
                </div>
              </div>
            </div>
          </div>
          <div class="rounded-3xl border border-primary-100 bg-white p-5">
            <BaseSkeleton shape="text" class="w-2/3" /><BaseSkeleton
              class="mt-6 h-40 w-full"
            /><BaseSkeleton class="mt-5 h-12 w-full" />
          </div>
        </section>

        <section
          v-else-if="cartQuery.isError.value"
          class="mt-3"
          data-cart-error
        >
          <ErrorState
            title="Chưa thể tải giỏ hàng"
            description="Kết nối có thể đang gián đoạn. Hãy thử tải lại để tiếp tục."
            class="min-h-72 rounded-4xl bg-white"
            @retry="cartQuery.refetch()"
          />
        </section>

        <template v-else-if="cart">
          <div
            v-if="items.length"
            class="flex min-h-0 flex-1 flex-col min-[85rem]:mt-3 min-[85rem]:grid min-[85rem]:grid-cols-[minmax(0,1fr)_23rem] min-[85rem]:gap-8"
          >
            <div class="flex min-h-0 min-w-0 flex-1 flex-col min-[85rem]:block">
              <section class="sticky top-12 z-30 -mx-4 flex min-h-12 flex-none items-center justify-between border-b border-primary-100 bg-white px-4 shadow-xs sm:-mx-5 sm:px-5 min-[85rem]:hidden" data-cart-mobile-selection>
                <BaseCheckbox v-model="selectAllModel" :label="`Tất cả (${cart.totalQuantity} sản phẩm)`" data-select-all-mobile />
                <span class="text-caption font-medium text-text-secondary">Đã chọn {{ selectedQuantity }}</span>
              </section>

              <div class="flex min-h-10 flex-none items-center gap-2 border-b border-primary-100 bg-primary-50/70 px-1 text-caption min-[85rem]:hidden" data-cart-mobile-branch>
                <span class="font-medium text-text-secondary">Chi nhánh:</span>
                <strong class="truncate text-primary-900">{{ cart.branch?.name ?? "Chưa chọn chi nhánh" }}</strong>
                <span v-if="hasStockWarning" class="ml-auto flex-none text-[#8f3733]">Có cảnh báo tồn kho</span>
              </div>

              <section
                class="hidden rounded-3xl border border-primary-100 bg-white px-4 py-3 shadow-xs sm:px-5 min-[85rem]:block"
                data-cart-selection
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <BaseCheckbox
                    v-model="selectAllModel"
                    label="Chọn tất cả sản phẩm có thể mua"
                    :description="`${selectedLineCount}/${eligibleItems.length} dòng sản phẩm đã chọn`"
                    data-select-all
                  />
                  <span class="text-caption font-medium text-text-secondary"
                    >{{ selectedQuantity }}/{{ cart.totalQuantity }} sản
                    phẩm</span
                  >
                </div>
              </section>

              <div class="grid min-h-0 flex-1 gap-2 overflow-y-auto overscroll-contain pb-32 pt-2 pr-1 [scrollbar-color:var(--primary-300)_transparent] [scrollbar-width:thin] min-[85rem]:mt-4 min-[85rem]:gap-4 min-[85rem]:overflow-visible min-[85rem]:p-0" data-cart-product-scroll>
                <CartItemCard
                  v-for="item in items"
                  :key="item.id"
                  :item="item"
                  :selected="selectedItemIds.has(item.id)"
                  :pending="isMutationPending"
                  @toggle="toggleItem"
                  @increment="updateQuantity(item.id, item.quantity + 1)"
                  @decrement="updateQuantity(item.id, item.quantity - 1)"
                  @remove="removeItem"
                />
              </div>
            </div>

            <aside class="hidden min-w-0 min-[85rem]:block" aria-labelledby="cart-summary-heading">
              <div class="space-y-4 min-[85rem]:sticky min-[85rem]:top-36">
                <section
                  class="overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-xs"
                  aria-labelledby="cart-branch-heading"
                  data-cart-group
                >
                  <div class="flex min-w-0 items-start gap-3 p-4">
                    <div class="min-w-0 flex-1">
                      <p
                        class="text-[0.90rem] font-medium uppercase text-primary-700"
                      >
                        Chi nhánh
                        {{ cart.branch?.name ?? "Chưa chọn chi nhánh" }}
                      </p>

                      <p
                        v-if="cart.branch?.address"
                        class="mt-0.5 text-caption leading-5 text-text-secondary"
                      >
                        {{ cart.branch.address }}
                      </p>
                      <p
                        class="mt-2 text-caption leading-5 text-text-muted font-normal!"
                      >
                        Đổi tại thanh điều hướng để đồng bộ tồn kho.
                      </p>
                    </div>
                  </div>
                  <div
                    v-if="hasStockWarning"
                    class="flex items-start gap-2 border-t border-[#efd7b0] bg-[#fff9ed] px-4 py-3 text-caption leading-5 text-[#78551d]"
                    role="status"
                    data-branch-conflict
                  >
                    <AlertTriangle
                      class="mt-0.5 size-4 flex-none"
                      aria-hidden="true"
                    />
                    <p>Một số sản phẩm vượt tồn kho và chưa thể chọn.</p>
                  </div>
                </section>
                <section
                  class="rounded-3xl border border-primary-100 bg-white p-3.5 shadow-xs"
                  data-cart-voucher
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span
                        class="grid size-8 place-items-center rounded-lg bg-primary-50 text-primary-700"
                        ><TicketPercent class="size-4" aria-hidden="true"
                      /></span>
                      <h2 class="text-body-sm font-semibold text-primary-950">
                        Voucher Mizuki
                      </h2>
                    </div>
                    <button
                      type="button"
                      class="inline-flex min-h-8 items-center gap-0.5 text-caption font-semibold text-primary-700"
                      data-open-voucher
                      @click="openVoucherDialog"
                    >
                      Đổi voucher<ChevronRight
                        class="size-3.5"
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <div
                    v-if="selectedOrderVoucher || selectedShippingVoucher"
                    class="mt-2.5 grid gap-2"
                  >
                    <div
                      v-if="selectedOrderVoucher"
                      class="relative flex min-h-16 overflow-hidden rounded-xl border border-[#5b9de3] bg-[#eef6ff] shadow-xs"
                      data-selected-order-voucher
                    >
                      <div
                        class="grid w-11 flex-none place-items-center bg-[#e0efff] text-[#2268a8]"
                      >
                        <TicketPercent class="size-4.5" aria-hidden="true" />
                      </div>
                      <div
                        class="relative min-w-0 flex-1 border-l border-dashed border-[#8ebce9] px-2.5 py-2"
                      >
                        <span
                          class="absolute -left-1.5 -top-1.5 size-3 rounded-full border border-[#8ebce9] bg-white"
                          aria-hidden="true"
                        /><span
                          class="absolute -bottom-1.5 -left-1.5 size-3 rounded-full border border-[#8ebce9] bg-white"
                          aria-hidden="true"
                        />
                        <div class="flex items-start justify-between gap-2">
                          <div class="min-w-0">
                            <strong
                              class="block truncate text-body-sm text-[#174f84]"
                              >{{ selectedOrderVoucher.label }}</strong
                            >
                            <p
                              class="mt-0.5 truncate text-[0.6875rem] text-[#4d6f8f]"
                            >
                              Đơn từ
                              {{
                                currencyFormatter.format(
                                  selectedOrderVoucher.minimumOrder,
                                )
                              }}
                            </p>
                          </div>
                          <span
                            class="flex-none rounded bg-white px-1.5 py-0.5 text-[0.625rem] font-bold text-[#1d5f9f]"
                            >{{ selectedOrderVoucher.code }}</span
                          >
                        </div>
                      </div>
                      <BaseTooltip
                        :content="voucherDetails(selectedOrderVoucher)"
                        side="left"
                        ><button
                          type="button"
                          class="mr-1 grid size-8 place-items-center self-center rounded-lg text-[#2268a8] hover:bg-white/70"
                          :aria-label="`Chi tiết ${selectedOrderVoucher.code}`"
                        >
                          <Info class="size-3.5" aria-hidden="true" /></button
                      ></BaseTooltip>
                    </div>
                    <div
                      v-if="selectedShippingVoucher"
                      class="relative flex min-h-16 overflow-hidden rounded-xl border border-[#5b9de3] bg-[#eef6ff] shadow-xs"
                      data-selected-shipping-voucher
                    >
                      <div
                        class="grid w-11 flex-none place-items-center bg-[#e0efff] text-[#2268a8]"
                      >
                        <Truck class="size-4.5" aria-hidden="true" />
                      </div>
                      <div
                        class="relative min-w-0 flex-1 border-l border-dashed border-[#8ebce9] px-2.5 py-2"
                      >
                        <span
                          class="absolute -left-1.5 -top-1.5 size-3 rounded-full border border-[#8ebce9] bg-white"
                          aria-hidden="true"
                        /><span
                          class="absolute -bottom-1.5 -left-1.5 size-3 rounded-full border border-[#8ebce9] bg-white"
                          aria-hidden="true"
                        />
                        <div class="flex items-start justify-between gap-2">
                          <div class="min-w-0">
                            <strong
                              class="block truncate text-body-sm text-[#174f84]"
                              >{{ selectedShippingVoucher.label }}</strong
                            >
                            <p
                              class="mt-0.5 truncate text-[0.6875rem] text-[#4d6f8f]"
                            >
                              Đơn từ
                              {{
                                currencyFormatter.format(
                                  selectedShippingVoucher.minimumOrder,
                                )
                              }}
                            </p>
                          </div>
                          <span
                            class="flex-none rounded bg-white px-1.5 py-0.5 text-[0.625rem] font-bold text-[#1d5f9f]"
                            >{{ selectedShippingVoucher.code }}</span
                          >
                        </div>
                      </div>
                      <BaseTooltip
                        :content="voucherDetails(selectedShippingVoucher)"
                        side="left"
                        ><button
                          type="button"
                          class="mr-1 grid size-8 place-items-center self-center rounded-lg text-[#2268a8] hover:bg-white/70"
                          :aria-label="`Chi tiết ${selectedShippingVoucher.code}`"
                        >
                          <Info class="size-3.5" aria-hidden="true" /></button
                      ></BaseTooltip>
                    </div>
                  </div>
                  <div
                    v-else
                    class="mt-2.5 rounded-xl border border-dashed border-border bg-white px-3 py-2.5 text-center shadow-xs"
                    data-voucher-placeholder
                  >
                    <p class="text-caption font-medium text-text-secondary">
                      Chưa chọn mã giảm giá hoặc vận chuyển
                    </p>
                  </div>
                </section>

                <section
                  class="rounded-3xl border border-primary-100 bg-white p-5 shadow-sm"
                  data-cart-summary
                >
                  <h2
                    id="cart-summary-heading"
                    class="text-heading-3 text-primary-950"
                  >
                    Tóm tắt đơn hàng
                  </h2>
                  <p class="mt-1 text-caption text-text-secondary">
                    Tính theo các sản phẩm bạn đang chọn.
                  </p>

                  <dl class="mt-5 space-y-3 text-body-sm">
                    <div class="flex justify-between gap-4">
                      <dt>Sản phẩm đã chọn</dt>
                      <dd class="font-semibold" data-summary-count>
                        {{ selectedQuantity }}
                      </dd>
                    </div>
                    <div class="flex justify-between gap-4">
                      <dt>Tạm tính đã chọn</dt>
                      <dd class="font-semibold" data-summary-subtotal>
                        {{ currencyFormatter.format(selectedSubtotal) }}
                      </dd>
                    </div>
                    <div class="flex justify-between gap-4 text-primary-700">
                      <dt>
                        Giảm giá<span
                          v-if="selectedVoucherDiscount"
                          class="mt-0.5 block text-[0.6875rem] font-medium text-text-muted"
                          >Đã gồm {{ selectedOrderVoucher?.code }}</span
                        >
                      </dt>
                      <dd class="font-semibold" data-summary-discount>
                        -{{ currencyFormatter.format(selectedDiscount) }}
                      </dd>
                    </div>
                    <div
                      class="flex items-end justify-between gap-4 border-t border-primary-100 pt-4"
                    >
                      <dt class="font-semibold text-primary-950">Tổng cộng</dt>
                      <dd
                        class="text-heading-3 text-[#bd443d]"
                        data-summary-total
                      >
                        {{ currencyFormatter.format(selectedTotal) }}
                      </dd>
                    </div>
                  </dl>

                  <RouterLink
                    :to="{ name: ROUTE_NAMES.checkout }"
                    class="mt-5 hidden min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-800 min-[85rem]:inline-flex"
                    data-checkout-action
                  >
                    Tiến hành thanh toán
                  </RouterLink>
                </section>
              </div>
            </aside>
          </div>

          <section
            v-else
            class="mt-3 rounded-4xl border border-primary-100 bg-white p-6 shadow-xs sm:p-10"
            data-cart-empty
          >
            <EmptyState
              title="Giỏ hàng đang trống"
              description="Những sản phẩm bạn chọn sẽ xuất hiện ở đây để kiểm tra trước khi thanh toán."
              class="min-h-64 border-0 bg-transparent p-0"
            >
              <template #icon
                ><ShoppingBag class="size-6" aria-hidden="true"
              /></template>
              <template #action
                ><RouterLink
                  :to="{ name: ROUTE_NAMES.products }"
                  class="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-white"
                  >Khám phá sản phẩm</RouterLink
                ></template
              >
            </EmptyState>
          </section>
        </template>
      </div>

      <div
        v-if="cart && items.length"
        class="fixed inset-x-0 bottom-0 z-40 border-t border-primary-100 bg-white/97 shadow-[0_-8px_24px_rgba(16,28,19,0.10)] backdrop-blur-md min-[85rem]:hidden"
        data-mobile-checkout-bar
        role="region"
        aria-label="Thanh mua hàng mobile"
      >
        <div class="mx-auto w-full max-w-3xl">
          <button type="button" class="flex min-h-10 w-full items-center gap-2 border-b border-primary-100 px-4 text-left" data-mobile-voucher-action @click="openVoucherDialog">
            <TicketPercent class="size-4 flex-none text-primary-700" aria-hidden="true" />
            <span class="text-body-sm font-medium text-primary-950">Voucher Mizuki</span>
            <span class="ml-auto max-w-[45%] truncate text-caption font-semibold" :class="selectedOrderVoucher || selectedShippingVoucher ? 'text-[#2268a8]' : 'text-text-secondary'">{{ selectedOrderVoucher?.code ?? selectedShippingVoucher?.code ?? "Chọn" }}</span>
            <ChevronRight class="size-4 flex-none text-text-muted" aria-hidden="true" />
          </button>
          <div class="flex min-h-14 items-center gap-3 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
            <BaseCheckbox v-model="selectAllModel" label="Tất cả" data-select-all-bottom />
            <div class="ml-auto min-w-0 text-right">
              <p class="text-[0.6875rem] text-text-secondary">{{ selectedQuantity }} sản phẩm</p>
              <strong class="block truncate text-body-lg font-bold text-[#bd443d]">{{ currencyFormatter.format(selectedTotal) }}</strong>
            </div>
            <RouterLink :to="{ name: ROUTE_NAMES.checkout }" class="inline-flex min-h-11 flex-none items-center rounded-xl bg-primary px-5 text-body-sm font-semibold text-white" data-checkout-action>Thanh toán</RouterLink>
          </div>
        </div>
      </div>

      <BaseDialog
        v-model="voucherDialogOpen"
        title="Chọn voucher Mizuki"
        close-label="Đóng danh sách voucher"
        class="max-w-2xl overflow-hidden"
        data-voucher-dialog
      >
        <label class="relative block">
          <span class="sr-only">Nhập mã giảm giá</span>
          <Search
            class="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            v-model="voucherSearch"
            type="search"
            placeholder="Nhập mã giảm giá"
            class="min-h-11 w-full rounded-xl border border-primary-200 bg-white pl-10 pr-3 text-body-sm outline-none placeholder:text-text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            data-voucher-search
          />
        </label>

        <div
          class="mt-4 max-h-[56svh] overflow-y-auto overscroll-contain pr-2 [scrollbar-color:var(--primary-300)_transparent] scrollbar-thin"
          data-voucher-scroll-area
        >
          <section
            aria-labelledby="order-voucher-heading"
            data-voucher-section="order"
          >
            <div
              class="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white py-2"
            >
              <h3
                id="order-voucher-heading"
                class="text-caption font-bold uppercase tracking-[0.12em] text-primary-900"
              >
                Mã giảm giá
              </h3>
              <span class="text-caption text-text-muted"
                >Áp dụng tối đa: 1</span
              >
            </div>
            <div class="grid gap-3 pb-5 pt-1">
              <div
                v-for="voucher in visibleOrderVouchers"
                :key="voucher.id"
                role="button"
                class="group relative flex min-h-20 w-full overflow-hidden rounded-xl border text-left shadow-xs transition-[border-color,background-color,box-shadow,opacity]"
                :class="[
                  selectedOrderVoucherId === voucher.id
                    ? 'border-[#5b9de3] bg-[#eef6ff] ring-2 ring-[#d9ebff]'
                    : 'border-border bg-white hover:border-primary-300 hover:shadow-sm',
                  !isVoucherEligible(voucher) &&
                  selectedOrderVoucherId !== voucher.id
                    ? 'cursor-not-allowed opacity-50 grayscale-[0.25]'
                    : '',
                ]"
                :tabindex="
                  !isVoucherEligible(voucher) &&
                  selectedOrderVoucherId !== voucher.id
                    ? -1
                    : 0
                "
                :aria-disabled="
                  !isVoucherEligible(voucher) &&
                  selectedOrderVoucherId !== voucher.id
                "
                :aria-pressed="selectedOrderVoucherId === voucher.id"
                :data-voucher-id="voucher.id"
                :data-voucher-selected="selectedOrderVoucherId === voucher.id"
                @click="
                  isVoucherEligible(voucher) ||
                  selectedOrderVoucherId === voucher.id
                    ? toggleVoucher(voucher)
                    : undefined
                "
                @keydown.enter.prevent="
                  isVoucherEligible(voucher) ||
                  selectedOrderVoucherId === voucher.id
                    ? toggleVoucher(voucher)
                    : undefined
                "
                @keydown.space.prevent="
                  isVoucherEligible(voucher) ||
                  selectedOrderVoucherId === voucher.id
                    ? toggleVoucher(voucher)
                    : undefined
                "
              >
                <span
                  class="grid w-16 flex-none place-items-center px-2 text-center"
                  :class="
                    selectedOrderVoucherId === voucher.id
                      ? 'bg-[#e0efff] text-[#2268a8]'
                      : 'bg-primary-50 text-primary-700'
                  "
                  ><span
                    ><TicketPercent
                      class="mx-auto size-5"
                      aria-hidden="true"
                    /><span
                      class="mt-1 block text-[0.5625rem] font-bold uppercase tracking-widest"
                      >Mizuki</span
                    ></span
                  ></span
                >
                <span
                  class="relative min-w-0 flex-1 border-l border-dashed px-3 py-2.5"
                  :class="
                    selectedOrderVoucherId === voucher.id
                      ? 'border-[#8ebce9]'
                      : 'border-primary-200'
                  "
                  ><span
                    class="absolute -left-2 -top-2 size-4 rounded-full border bg-white"
                    :class="
                      selectedOrderVoucherId === voucher.id
                        ? 'border-[#8ebce9]'
                        : 'border-primary-200'
                    "
                    aria-hidden="true"
                  /><span
                    class="absolute -bottom-2 -left-2 size-4 rounded-full border bg-white"
                    :class="
                      selectedOrderVoucherId === voucher.id
                        ? 'border-[#8ebce9]'
                        : 'border-primary-200'
                    "
                    aria-hidden="true"
                  /><span class="flex items-start justify-between gap-2"
                    ><span class="min-w-0"
                      ><strong
                        class="block truncate text-body-sm"
                        :class="
                          selectedOrderVoucherId === voucher.id
                            ? 'text-[#174f84]'
                            : 'text-primary-950'
                        "
                        >{{ voucher.label }}</strong
                      ><span class="mt-1 block text-caption text-text-secondary"
                        >Đơn từ
                        {{
                          currencyFormatter.format(voucher.minimumOrder)
                        }}</span
                      ></span
                    ><span class="flex items-center gap-1"
                      ><span
                        class="rounded px-1.5 py-0.5 text-[0.625rem] font-bold"
                        :class="
                          selectedOrderVoucherId === voucher.id
                            ? 'bg-white text-[#1d5f9f]'
                            : 'bg-primary-50 text-primary-800'
                        "
                        >{{ voucher.code }}</span
                      ><BaseTooltip
                        :content="voucherDetails(voucher)"
                        side="left"
                        ><button
                          type="button"
                          class="grid size-7 place-items-center rounded-md text-text-secondary hover:bg-white hover:text-primary-800"
                          :aria-label="`Chi tiết ${voucher.code}`"
                          @click.stop
                        >
                          <Info
                            class="size-3.5"
                            aria-hidden="true"
                          /></button></BaseTooltip></span></span
                  ><span
                    class="mt-1.5 block text-[0.6875rem] font-semibold"
                    :class="
                      selectedOrderVoucherId === voucher.id
                        ? 'text-[#2268a8]'
                        : !isVoucherEligible(voucher)
                          ? 'text-[#923b37]'
                          : 'text-text-muted'
                    "
                    >{{
                      selectedOrderVoucherId === voucher.id
                        ? "Đã chọn"
                        : !isVoucherEligible(voucher)
                          ? "Chưa đủ điều kiện"
                          : "Nhấn để chọn"
                    }}</span
                  ></span
                >
              </div>
              <p
                v-if="filteredOrderVouchers.length === 0"
                class="rounded-xl bg-surface-subtle p-4 text-center text-body-sm text-text-secondary"
              >
                Không tìm thấy mã giảm giá phù hợp.
              </p>
              <button
                v-if="
                  !normalizedVoucherSearch && filteredOrderVouchers.length > 2
                "
                type="button"
                class="mx-auto min-h-9 px-3 text-body-sm font-semibold text-primary-700"
                data-toggle-vouchers="order"
                @click="orderVouchersExpanded = !orderVouchersExpanded"
              >
                {{ orderVouchersExpanded ? "Thu gọn" : "Xem thêm" }}
              </button>
            </div>
          </section>

          <section
            class="border-t border-primary-100 pt-2"
            aria-labelledby="shipping-voucher-heading"
            data-voucher-section="shipping"
          >
            <div
              class="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white py-2"
            >
              <h3
                id="shipping-voucher-heading"
                class="text-caption font-bold uppercase tracking-[0.12em] text-primary-900"
              >
                Mã vận chuyển
              </h3>
              <span class="text-caption text-text-muted"
                >Áp dụng tối đa: 1</span
              >
            </div>
            <div class="grid gap-3 pb-1 pt-1">
              <div
                v-for="voucher in visibleShippingVouchers"
                :key="voucher.id"
                role="button"
                class="group relative flex min-h-20 w-full overflow-hidden rounded-xl border text-left shadow-xs transition-[border-color,background-color,box-shadow,opacity]"
                :class="[
                  selectedShippingVoucherId === voucher.id
                    ? 'border-[#5b9de3] bg-[#eef6ff] ring-2 ring-[#d9ebff]'
                    : 'border-border bg-white hover:border-primary-300 hover:shadow-sm',
                  !isVoucherEligible(voucher) &&
                  selectedShippingVoucherId !== voucher.id
                    ? 'cursor-not-allowed opacity-50 grayscale-[0.25]'
                    : '',
                ]"
                :tabindex="
                  !isVoucherEligible(voucher) &&
                  selectedShippingVoucherId !== voucher.id
                    ? -1
                    : 0
                "
                :aria-disabled="
                  !isVoucherEligible(voucher) &&
                  selectedShippingVoucherId !== voucher.id
                "
                :aria-pressed="selectedShippingVoucherId === voucher.id"
                :data-voucher-id="voucher.id"
                :data-voucher-selected="
                  selectedShippingVoucherId === voucher.id
                "
                @click="
                  isVoucherEligible(voucher) ||
                  selectedShippingVoucherId === voucher.id
                    ? toggleVoucher(voucher)
                    : undefined
                "
                @keydown.enter.prevent="
                  isVoucherEligible(voucher) ||
                  selectedShippingVoucherId === voucher.id
                    ? toggleVoucher(voucher)
                    : undefined
                "
                @keydown.space.prevent="
                  isVoucherEligible(voucher) ||
                  selectedShippingVoucherId === voucher.id
                    ? toggleVoucher(voucher)
                    : undefined
                "
              >
                <span
                  class="grid w-16 flex-none place-items-center px-2 text-center"
                  :class="
                    selectedShippingVoucherId === voucher.id
                      ? 'bg-[#e0efff] text-[#2268a8]'
                      : 'bg-primary-50 text-primary-700'
                  "
                  ><span
                    ><Truck class="mx-auto size-5" aria-hidden="true" /><span
                      class="mt-1 block text-[0.5625rem] font-bold uppercase tracking-widest"
                      >Mizuki</span
                    ></span
                  ></span
                >
                <span
                  class="relative min-w-0 flex-1 border-l border-dashed px-3 py-2.5"
                  :class="
                    selectedShippingVoucherId === voucher.id
                      ? 'border-[#8ebce9]'
                      : 'border-primary-200'
                  "
                  ><span
                    class="absolute -left-2 -top-2 size-4 rounded-full border bg-white"
                    :class="
                      selectedShippingVoucherId === voucher.id
                        ? 'border-[#8ebce9]'
                        : 'border-primary-200'
                    "
                    aria-hidden="true"
                  /><span
                    class="absolute -bottom-2 -left-2 size-4 rounded-full border bg-white"
                    :class="
                      selectedShippingVoucherId === voucher.id
                        ? 'border-[#8ebce9]'
                        : 'border-primary-200'
                    "
                    aria-hidden="true"
                  /><span class="flex items-start justify-between gap-2"
                    ><span class="min-w-0"
                      ><strong
                        class="block truncate text-body-sm"
                        :class="
                          selectedShippingVoucherId === voucher.id
                            ? 'text-[#174f84]'
                            : 'text-primary-950'
                        "
                        >{{ voucher.label }}</strong
                      ><span class="mt-1 block text-caption text-text-secondary"
                        >Đơn từ
                        {{
                          currencyFormatter.format(voucher.minimumOrder)
                        }}</span
                      ></span
                    ><span class="flex items-center gap-1"
                      ><span
                        class="rounded px-1.5 py-0.5 text-[0.625rem] font-bold"
                        :class="
                          selectedShippingVoucherId === voucher.id
                            ? 'bg-white text-[#1d5f9f]'
                            : 'bg-primary-50 text-primary-800'
                        "
                        >{{ voucher.code }}</span
                      ><BaseTooltip
                        :content="voucherDetails(voucher)"
                        side="left"
                        ><button
                          type="button"
                          class="grid size-7 place-items-center rounded-md text-text-secondary hover:bg-white hover:text-primary-800"
                          :aria-label="`Chi tiết ${voucher.code}`"
                          @click.stop
                        >
                          <Info
                            class="size-3.5"
                            aria-hidden="true"
                          /></button></BaseTooltip></span></span
                  ><span
                    class="mt-1.5 block text-[0.6875rem] font-semibold"
                    :class="
                      selectedShippingVoucherId === voucher.id
                        ? 'text-[#2268a8]'
                        : !isVoucherEligible(voucher)
                          ? 'text-[#923b37]'
                          : 'text-text-muted'
                    "
                    >{{
                      selectedShippingVoucherId === voucher.id
                        ? "Đã chọn"
                        : !isVoucherEligible(voucher)
                          ? "Chưa đủ điều kiện"
                          : "Nhấn để chọn"
                    }}</span
                  ></span
                >
              </div>
              <p
                v-if="filteredShippingVouchers.length === 0"
                class="rounded-xl bg-surface-subtle p-4 text-center text-body-sm text-text-secondary"
              >
                Không tìm thấy mã vận chuyển phù hợp.
              </p>
              <button
                v-if="
                  !normalizedVoucherSearch &&
                  filteredShippingVouchers.length > 2
                "
                type="button"
                class="mx-auto min-h-9 px-3 text-body-sm font-semibold text-primary-700"
                data-toggle-vouchers="shipping"
                @click="shippingVouchersExpanded = !shippingVouchersExpanded"
              >
                {{ shippingVouchersExpanded ? "Thu gọn" : "Xem thêm" }}
              </button>
            </div>
          </section>
        </div>
      </BaseDialog>
    </div>
  </CustomerLayout>
</template>
