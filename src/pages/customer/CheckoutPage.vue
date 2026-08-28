<script setup lang="ts">
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  Info,
  PackageCheck,
  PackageOpen,
  QrCode,
  Store,
  Sparkles,
  Tag,
  Truck,
  WalletCards,
} from "@lucide/vue";
import { useQueryClient } from "@tanstack/vue-query";
import { computed, nextTick, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  CheckoutAddressDialog,
  CheckoutPaymentDialog,
  CheckoutVoucherDialog,
} from "@/components/checkout";
import { ROUTE_NAMES } from "@/constants/routes";
import {
  emptyCheckoutAddressDraft,
  checkoutPaymentMethods,
  checkoutVouchers,
} from "@/data/customer/checkoutDemoData";
import CustomerLayout from "@/layouts/CustomerLayout.vue";
import {
  useCreateCustomerAddressMutation,
  useCustomerAddressesQuery,
  useDeleteCustomerAddressMutation,
  useSetDefaultCustomerAddressMutation,
  useUpdateCustomerAddressMutation,
} from "@/queries/addresses";
import { useCustomerCartQuery } from "@/queries/cart";
import { useCheckoutPreviewQuery } from "@/queries/checkout";
import { useCreateCustomerOrderMutation } from "@/queries/orders";
import { useCreateVnPayPaymentUrlMutation } from "@/queries/payments";
import {
  customerShippingQuoteKeys,
  useCustomerShippingQuoteQuery,
} from "@/queries/shipping";
import { customerWalletKeys, useCustomerWalletQuery } from "@/queries/wallet";
import { useAuthStore } from "@/stores/auth";
import { useBranchPreferenceStore } from "@/stores/branchPreference";
import { pinia } from "@/stores/pinia";
import type {
  CheckoutAddress,
  CheckoutAddressDraft,
  CheckoutScenario,
} from "@/types/customer";
import { customerAddressFormErrors } from "@/types/addresses";
import type { ApiValidationErrors } from "@/types/api";
import type {
  CreateCustomerOrderRequest,
  CreatedCustomerOrder,
  CustomerOrderPaymentMethod,
} from "@/types/orders";
import { persistVnPayReturnContext, redirectToVnPay } from "@/utils/vnpay";

const props = defineProps<{
  scenario?: CheckoutScenario;
}>();

const authStore = useAuthStore(pinia);
const branchStore = useBranchPreferenceStore(pinia);
const queryClient = useQueryClient();
const userId = computed(() => authStore.user?.id ?? null);
const addresses = ref<CheckoutAddress[]>([]);
const selectedAddressId = ref(addresses.value[0]?.id ?? "");
const addressDraft = ref<CheckoutAddressDraft>({
  ...emptyCheckoutAddressDraft,
});
const addressDialogOpen = ref(false);
const addressDialogStartInForm = ref(false);
const paymentDialogOpen = ref(false);
const voucherDialogOpen = ref(false);
const selectedOrderVoucherId = ref("");
const selectedShippingVoucherId = ref("");
const fulfillmentMethod = ref<"delivery" | "pickup">("delivery");
const paymentMethodId = ref("cod");
const failedProductImageIds = ref<ReadonlySet<number>>(new Set<number>());
const confirmationDialogOpen = ref(false);
const confirmationSnapshot = ref<OrderConfirmationSnapshot | null>(null);
const createdOrder = ref<CreatedCustomerOrder | null>(null);
const orderNotice = ref("");
const orderSucceeded = ref(false);
const ORDER_ATTEMPT_STORAGE_PREFIX = "mizuki:checkout:create-order-attempt";

interface OrderConfirmationSnapshot {
  readonly payload: CreateCustomerOrderRequest;
  readonly fingerprint: string;
  readonly expectedTotal: number;
}

interface CheckoutOrderAttempt {
  readonly fingerprint: string;
  readonly idempotencyKey: string;
}

const orderAttempt = ref<CheckoutOrderAttempt | null>(null);

const addressesQuery = useCustomerAddressesQuery(userId);
const createAddressMutation = useCreateCustomerAddressMutation(userId);
const updateAddressMutation = useUpdateCustomerAddressMutation(userId);
const setDefaultAddressMutation = useSetDefaultCustomerAddressMutation(userId);
const deleteAddressMutation = useDeleteCustomerAddressMutation(userId);
const cartQuery = useCustomerCartQuery(userId);
const walletQuery = useCustomerWalletQuery(userId);
const createOrderMutation = useCreateCustomerOrderMutation();
const createVnPayUrlMutation = useCreateVnPayPaymentUrlMutation();
const vnPayRedirectError = ref("");
const cart = computed(() => cartQuery.data.value);
const cartItems = computed(() => cart.value?.items ?? []);
const cartBranch = computed(() => cart.value?.branch);
const branchMatchesCart = computed(() =>
  Boolean(
    cartBranch.value &&
    branchStore.selectedBranchId !== null &&
    cartBranch.value.id === branchStore.selectedBranchId,
  ),
);

watch(
  [() => addressesQuery.data.value, cartItems],
  ([serverAddresses, serverCartItems]) => {
    if (!serverAddresses) return;
    addresses.value = [...serverAddresses];
    const currentStillExists = serverAddresses.some(
      (address) => address.id === selectedAddressId.value,
    );
    if (!currentStillExists) {
      selectedAddressId.value =
        serverAddresses.find((address) => address.isDefault)?.id ??
        serverAddresses[0]?.id ??
        "";
    }
    if (
      fulfillmentMethod.value === "delivery" &&
      serverAddresses.length === 0 &&
      serverCartItems.length > 0
    ) {
      addressDraft.value = { ...emptyCheckoutAddressDraft, isDefault: true };
      addressDialogStartInForm.value = true;
      addressDialogOpen.value = true;
    }
  },
  { immediate: true },
);

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});
const numberFormatter = new Intl.NumberFormat("vi-VN");
const supportedCheckoutPaymentMethods = computed(() =>
  checkoutPaymentMethods
    .filter((method) => ["cod", "wallet", "vnpay"].includes(method.id))
    .map((method) => {
      if (method.id === "cod") return method;
      if (method.id === "wallet") {
        return {
          ...method,
          available: true,
          balance: walletQuery.data.value?.balance,
          balanceState: walletQuery.isPending.value
            ? ("loading" as const)
            : walletQuery.isError.value
              ? ("error" as const)
              : ("ready" as const),
        };
      }
      return { ...method, available: true, unavailableReason: undefined };
    }),
);

function formatSavings(amount: number): string {
  return `${numberFormatter.format(Math.max(amount, 0))} đ`;
}

function formatExpectedDeliveryDate(value: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  const vietnameseDate = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (vietnameseDate) return normalized;

  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const parsed = new Date(normalized);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(parsed);
}

const selectedAddress = computed(() =>
  addresses.value.find((address) => address.id === selectedAddressId.value),
);
const shippingAddressId = computed(() => {
  const id = Number(selectedAddress.value?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
});
const shippingQuoteEnabled = computed(
  () =>
    fulfillmentMethod.value === "delivery" &&
    !orderSucceeded.value &&
    cartItems.value.length > 0 &&
    shippingAddressId.value !== null &&
    branchMatchesCart.value,
);
const shippingQuoteQuery = useCustomerShippingQuoteQuery(
  shippingAddressId,
  shippingQuoteEnabled,
);
function quoteHasExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  const expiryTime = Date.parse(expiresAt);
  return !Number.isFinite(expiryTime) || expiryTime <= Date.now();
}

const shippingQuoteExpired = computed(() =>
  quoteHasExpired(shippingQuoteQuery.data.value?.expiresAt),
);
const expectedDeliveryDate = computed(() =>
  formatExpectedDeliveryDate(
    shippingQuoteQuery.data.value?.expectedDeliveryTime ?? null,
  ),
);
const selectedPayment = computed(() =>
  supportedCheckoutPaymentMethods.value.find(
    (method) => method.id === paymentMethodId.value,
  ),
);
const paymentPayloadValue = computed<CustomerOrderPaymentMethod | null>(() => {
  if (paymentMethodId.value === "cod") return "cash";
  if (paymentMethodId.value === "wallet") return "wallet";
  if (paymentMethodId.value === "vnpay") return "vnpay";
  return null;
});
const hasUnavailableProduct = computed(() =>
  cartItems.value.some(
    (item) => item.stockWarning || item.availableQuantity < item.quantity,
  ),
);
const checkoutPreviewPayload = computed<CreateCustomerOrderRequest | null>(
  () => {
    const paymentMethod = paymentPayloadValue.value;
    if (
      !paymentMethod ||
      !branchMatchesCart.value ||
      cartItems.value.length === 0 ||
      hasUnavailableProduct.value
    )
      return null;
    if (fulfillmentMethod.value === "pickup") {
      return { delivery_method: "pickup", payment_method: paymentMethod };
    }
    const addressId = shippingAddressId.value;
    const quote = shippingQuoteQuery.data.value;
    if (
      addressId === null ||
      !quote ||
      quoteHasExpired(quote.expiresAt) ||
      !/^[a-f0-9]{64}$/.test(quote.quoteToken)
    )
      return null;
    return {
      delivery_method: "delivery",
      address_id: addressId,
      shipping_quote_token: quote.quoteToken,
      payment_method: paymentMethod,
    };
  },
);
const checkoutPreviewQuery = useCheckoutPreviewQuery(checkoutPreviewPayload);
const selectedOrderVoucher = computed(() =>
  checkoutVouchers.find(
    (voucher) => voucher.id === selectedOrderVoucherId.value,
  ),
);
const selectedShippingVoucher = computed(() =>
  checkoutVouchers.find(
    (voucher) => voucher.id === selectedShippingVoucherId.value,
  ),
);

const totals = computed(() => {
  const preview = checkoutPreviewQuery.data.value;
  const subtotal = preview?.subtotal ?? cart.value?.totalAmount ?? 0;
  const productDiscount =
    preview?.discountAmount ?? cart.value?.discountAmount ?? 0;

  return {
    selectedCount: cart.value?.totalQuantity ?? 0,
    subtotal,
    productDiscount,
    shippingFee: preview?.shippingFee ?? null,
    total: preview?.totalAmount ?? null,
    savedAmount: productDiscount,
  };
});

const checkoutDataReady = computed(() => {
  if (userId.value === null || orderSucceeded.value) return false;
  if (cartItems.value.length === 0 || hasUnavailableProduct.value) return false;
  if (!branchMatchesCart.value) return false;
  if (!paymentPayloadValue.value || !selectedPayment.value?.available)
    return false;
  if (
    !checkoutPreviewPayload.value ||
    !checkoutPreviewQuery.data.value ||
    checkoutPreviewQuery.isError.value
  )
    return false;
  if (fulfillmentMethod.value === "pickup") return true;
  const quote = shippingQuoteQuery.data.value;
  return Boolean(
    selectedAddress.value &&
    shippingAddressId.value &&
    quote &&
    !shippingQuoteExpired.value,
  );
});
const canPlaceOrder = computed(
  () => checkoutDataReady.value && !createOrderMutation.isPending.value,
);

const checkoutReadinessMessage = computed(() => {
  if (userId.value === null) return "Vui lòng đăng nhập để đặt hàng.";
  if (!branchMatchesCart.value)
    return "Vui lòng kiểm tra lại chi nhánh của giỏ hàng.";
  if (fulfillmentMethod.value === "delivery" && !selectedAddress.value)
    return "Vui lòng chọn địa chỉ nhận hàng.";
  if (
    fulfillmentMethod.value === "pickup" &&
    checkoutPreviewQuery.isFetching.value
  )
    return "Đang xác nhận thông tin nhận hàng tại cửa hàng.";
  if (checkoutPreviewQuery.isError.value)
    return errorMessage(
      checkoutPreviewQuery.error.value,
      "Không thể xác nhận tổng thanh toán.",
    );
  if (fulfillmentMethod.value === "pickup") return "";
  if (shippingQuoteQuery.isFetching.value)
    return "Đang cập nhật báo giá vận chuyển.";
  if (shippingQuoteQuery.isError.value)
    return "Vui lòng lấy lại báo giá vận chuyển.";
  if (shippingQuoteExpired.value) return "Báo giá vận chuyển đã hết hạn.";
  if (!paymentPayloadValue.value)
    return "Vui lòng chọn phương thức thanh toán được hỗ trợ.";
  if (hasUnavailableProduct.value)
    return "Vui lòng điều chỉnh sản phẩm chưa đủ tồn kho.";
  return "";
});

function productImage(
  itemId: number,
  imageUrl: string | undefined,
): string | undefined {
  const normalizedUrl = imageUrl?.trim();
  if (!normalizedUrl || failedProductImageIds.value.has(itemId))
    return undefined;
  if (
    normalizedUrl.startsWith("/") ||
    normalizedUrl.startsWith("https://") ||
    normalizedUrl.startsWith("http://") ||
    normalizedUrl.startsWith("data:image/")
  ) {
    return normalizedUrl;
  }
  return undefined;
}

function productBrandName(product: object): string | undefined {
  if (!("brandName" in product) || typeof product.brandName !== "string")
    return undefined;
  return product.brandName.trim() || undefined;
}

function markProductImageFailed(itemId: number): void {
  failedProductImageIds.value = new Set([
    ...failedProductImageIds.value,
    itemId,
  ]);
}

const branchIssueMessage = computed(() => {
  if (branchStore.status === "error") {
    return branchStore.error ?? "Không thể xác nhận chi nhánh đang hoạt động.";
  }
  if (branchStore.selectedBranchId === null) {
    return "Chưa chọn chi nhánh đang hoạt động. Vui lòng chọn chi nhánh trước khi thanh toán.";
  }
  if (!cartBranch.value) {
    return "Giỏ hàng chưa được gắn với chi nhánh. Vui lòng quay lại giỏ hàng để đồng bộ.";
  }
  if (cartBranch.value.id !== branchStore.selectedBranchId) {
    return "Chi nhánh của giỏ hàng không khớp với chi nhánh đang hoạt động. Vui lòng quay lại giỏ hàng để đồng bộ.";
  }
  return "";
});

function errorMessage(error: unknown, fallback: string): string {
  return typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : fallback;
}

const cartErrorMessage = computed(() =>
  errorMessage(
    cartQuery.error.value,
    "Không thể tải giỏ hàng. Vui lòng thử lại.",
  ),
);
const shippingQuoteErrorMessage = computed(() =>
  errorMessage(
    shippingQuoteQuery.error.value,
    "Không thể lấy báo giá vận chuyển. Vui lòng thử lại.",
  ),
);
const orderErrorMessage = computed(() => {
  const errors = readValidationErrors(createOrderMutation.error.value);
  const balanceError =
    paymentMethodId.value === "wallet"
      ? errors?.balance?.[0]?.trim()
      : undefined;
  return (
    balanceError ||
    errorMessage(
      createOrderMutation.error.value,
      "Không thể tạo đơn hàng. Vui lòng kiểm tra thông tin và thử lại.",
    )
  );
});
const orderValidationMessages = computed(() => {
  const errors = readValidationErrors(createOrderMutation.error.value);
  if (!errors) return [];
  return Object.values(errors)
    .flatMap((messages) => messages)
    .map((message) => message.trim())
    .filter(
      (message) => Boolean(message) && message !== orderErrorMessage.value,
    );
});

function addressText(address: CheckoutAddress): string {
  return [
    address.detail,
    address.hamlet,
    address.wardName,
    address.districtName,
    address.provinceName,
  ]
    .filter(Boolean)
    .join(", ");
}

function openAddressSelector(): void {
  resetAddressMutationErrors();
  addressDialogStartInForm.value = addresses.value.length === 0;
  addressDraft.value = {
    ...emptyCheckoutAddressDraft,
    isDefault: addresses.value.length === 0,
  };
  addressDialogOpen.value = true;
}

async function handleAddressContinue(
  draft: CheckoutAddressDraft,
): Promise<void> {
  if (addressSaving.value) return;
  resetAddressMutationErrors();
  addressDraft.value = { ...draft };
  try {
    const savedAddress = draft.id
      ? await updateAddressMutation.mutateAsync(draft)
      : await createAddressMutation.mutateAsync(draft);
    selectedAddressId.value = savedAddress.id;
    addressDialogOpen.value = false;
  } catch {
    // The mutation owns the normalized error shown in the dialog.
  }
}

function handleAddressEdit(address: CheckoutAddress): void {
  resetAddressMutationErrors();
  addressDraft.value = { ...address };
}

async function handleSetDefaultAddress(id: string): Promise<void> {
  if (addressSaving.value) return;
  resetAddressMutationErrors();
  try {
    const address = await setDefaultAddressMutation.mutateAsync(id);
    selectedAddressId.value = address.id;
  } catch {
    // The mutation owns the normalized error shown in the dialog.
  }
}

async function handleDeleteAddress(id: string): Promise<void> {
  if (addressSaving.value) return;
  resetAddressMutationErrors();
  const remainingAddresses = addresses.value.filter(
    (address) => address.id !== id,
  );
  try {
    await deleteAddressMutation.mutateAsync(id);
    if (selectedAddressId.value === id) {
      selectedAddressId.value =
        remainingAddresses.find((address) => address.isDefault)?.id ??
        remainingAddresses[0]?.id ??
        "";
    }
  } catch {
    // The mutation owns the normalized error shown in the dialog.
  }
}

const addressErrorMessage = computed(() => {
  const error =
    createAddressMutation.error.value ??
    updateAddressMutation.error.value ??
    setDefaultAddressMutation.error.value ??
    deleteAddressMutation.error.value ??
    addressesQuery.error.value;
  if (!error) return "";
  if (
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Không thể xử lý địa chỉ. Vui lòng thử lại.";
});

function readValidationErrors(error: unknown): ApiValidationErrors | undefined {
  if (
    typeof error !== "object" ||
    error === null ||
    !("validationErrors" in error) ||
    typeof error.validationErrors !== "object" ||
    error.validationErrors === null
  ) {
    return undefined;
  }
  return error.validationErrors as ApiValidationErrors;
}

const addressServerErrors = computed(() => {
  const error =
    createAddressMutation.error.value ?? updateAddressMutation.error.value;
  return customerAddressFormErrors(readValidationErrors(error));
});

const addressSaving = computed(
  () =>
    createAddressMutation.isPending.value ||
    updateAddressMutation.isPending.value ||
    setDefaultAddressMutation.isPending.value ||
    deleteAddressMutation.isPending.value,
);

function resetAddressMutationErrors(): void {
  createAddressMutation.reset();
  updateAddressMutation.reset();
  setDefaultAddressMutation.reset();
  deleteAddressMutation.reset();
}

function selectAddress(id: string): void {
  selectedAddressId.value = id;
}

function selectPayment(id: string): void {
  const method = supportedCheckoutPaymentMethods.value.find(
    (item) => item.id === id,
  );
  if (method?.available) paymentMethodId.value = id;
}

function selectFulfillment(method: "delivery" | "pickup"): void {
  if (fulfillmentMethod.value === method) return;
  fulfillmentMethod.value = method;
  confirmationDialogOpen.value = false;
  confirmationSnapshot.value = null;
  orderNotice.value = "";
  createOrderMutation.reset();
  if (method === "delivery" && addresses.value.length === 0) {
    addressDraft.value = { ...emptyCheckoutAddressDraft, isDefault: true };
    addressDialogStartInForm.value = true;
    addressDialogOpen.value = true;
  }
}

function selectVouchers(
  orderVoucherId: string,
  shippingVoucherId: string,
): void {
  selectedOrderVoucherId.value = orderVoucherId;
  selectedShippingVoucherId.value = shippingVoucherId;
}

function removeSelectedVouchers(): void {
  selectedOrderVoucherId.value = "";
  selectedShippingVoucherId.value = "";
}

function checkoutOrderPayload(): CreateCustomerOrderRequest | null {
  return checkoutPreviewPayload.value;
}

const orderAttemptStorageKey = computed(() =>
  userId.value === null
    ? null
    : `${ORDER_ATTEMPT_STORAGE_PREFIX}:${userId.value}`,
);

function orderPayloadFingerprint(payload: CreateCustomerOrderRequest): string {
  return JSON.stringify({
    payload,
    cart: {
      id: cart.value?.id ?? null,
      branchId: cartBranch.value?.id ?? null,
      totalQuantity: cart.value?.totalQuantity ?? null,
      totalAmount: cart.value?.totalAmount ?? null,
      discountAmount: cart.value?.discountAmount ?? null,
      totalAfterDiscount: cart.value?.totalAfterDiscount ?? null,
      items: cartItems.value.map((item) => ({
        id: item.id,
        productId: item.product.id,
        variantId: item.variant.id,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
    },
  });
}

function storedOrderAttempt(fingerprint: string): CheckoutOrderAttempt | null {
  const storageKey = orderAttemptStorageKey.value;
  if (!storageKey) return null;
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<CheckoutOrderAttempt>;
    if (
      parsed.fingerprint !== fingerprint ||
      typeof parsed.idempotencyKey !== "string" ||
      parsed.idempotencyKey.length === 0
    )
      return null;
    return { fingerprint, idempotencyKey: parsed.idempotencyKey };
  } catch {
    return null;
  }
}

function persistOrderAttempt(attempt: CheckoutOrderAttempt): void {
  const storageKey = orderAttemptStorageKey.value;
  if (!storageKey) return;
  window.sessionStorage.setItem(storageKey, JSON.stringify(attempt));
}

function clearOrderAttempt(): void {
  const storageKey = orderAttemptStorageKey.value;
  orderAttempt.value = null;
  if (storageKey) window.sessionStorage.removeItem(storageKey);
}

function orderAttemptFor(
  payload: CreateCustomerOrderRequest,
): CheckoutOrderAttempt {
  const fingerprint = orderPayloadFingerprint(payload);
  if (orderAttempt.value?.fingerprint === fingerprint)
    return orderAttempt.value;

  const stored = storedOrderAttempt(fingerprint);
  if (stored) {
    orderAttempt.value = stored;
    return stored;
  }

  const attempt = {
    fingerprint,
    idempotencyKey: crypto.randomUUID(),
  };
  orderAttempt.value = attempt;
  persistOrderAttempt(attempt);
  return attempt;
}

const currentOrderPayloadFingerprint = computed(() => {
  const payload = checkoutOrderPayload();
  return payload ? orderPayloadFingerprint(payload) : null;
});

function openOrderConfirmation(): void {
  const payload = checkoutOrderPayload();
  if (!canPlaceOrder.value || !payload || totals.value.total === null) return;
  createOrderMutation.reset();
  orderNotice.value = "";
  confirmationSnapshot.value = {
    payload,
    fingerprint: orderPayloadFingerprint(payload),
    expectedTotal: totals.value.total,
  };
  confirmationDialogOpen.value = true;
}

function closeOrderConfirmation(): void {
  if (createOrderMutation.isPending.value) return;
  confirmationDialogOpen.value = false;
  confirmationSnapshot.value = null;
  createOrderMutation.reset();
}

async function refreshExpiredQuote(
  previousTotal: number | null,
): Promise<void> {
  confirmationDialogOpen.value = false;
  confirmationSnapshot.value = null;
  const result = await shippingQuoteQuery.refetch();
  await nextTick();
  if (result.error || !result.data || quoteHasExpired(result.data.expiresAt)) {
    orderNotice.value =
      "Chưa thể cập nhật báo giá. Vui lòng thử lấy lại báo giá vận chuyển.";
    return;
  }
  orderNotice.value =
    previousTotal !== null &&
    totals.value.total !== null &&
    previousTotal !== totals.value.total
      ? "Phí vận chuyển và Tổng dự kiến đã thay đổi. Vui lòng kiểm tra và xác nhận lại."
      : "Báo giá vận chuyển đã được cập nhật. Vui lòng xác nhận lại đơn hàng.";
}

async function confirmOrder(): Promise<void> {
  if (createOrderMutation.isPending.value) return;
  const snapshot = confirmationSnapshot.value;
  const quote = shippingQuoteQuery.data.value;
  if (!snapshot) {
    closeOrderConfirmation();
    orderNotice.value =
      "Thông tin đặt hàng đã thay đổi. Vui lòng xác nhận lại.";
    return;
  }
  if (
    fulfillmentMethod.value === "delivery" &&
    (!quote || quoteHasExpired(quote.expiresAt))
  ) {
    await refreshExpiredQuote(snapshot.expectedTotal);
    return;
  }

  const payload = checkoutOrderPayload();
  if (
    !payload ||
    orderPayloadFingerprint(payload) !== snapshot.fingerprint ||
    totals.value.total !== snapshot.expectedTotal
  ) {
    closeOrderConfirmation();
    orderNotice.value =
      "Địa chỉ, báo giá hoặc Tổng dự kiến đã thay đổi. Vui lòng xác nhận lại.";
    return;
  }

  try {
    const attempt = orderAttemptFor(payload);
    const order = await createOrderMutation.mutateAsync({
      payload,
      idempotencyKey: attempt.idempotencyKey,
    });
    clearOrderAttempt();
    confirmationDialogOpen.value = false;
    confirmationSnapshot.value = null;
    orderSucceeded.value = true;
    createdOrder.value = order;
    if (snapshot.payload.delivery_method === "delivery") {
      queryClient.removeQueries({
        queryKey: customerShippingQuoteKeys.detail(snapshot.payload.address_id),
        exact: true,
      });
    }
    if (order.paymentMethod === "wallet" && userId.value !== null) {
      await queryClient.invalidateQueries({
        queryKey: customerWalletKeys.detail(userId.value),
      });
    }
    await cartQuery.refetch();
    if (order.paymentMethod === "vnpay") await startVnPayPayment(order);
  } catch {
    // The normalized mutation error remains visible in the confirmation dialog.
  }
}

async function startVnPayPayment(order: CreatedCustomerOrder): Promise<void> {
  vnPayRedirectError.value = "";
  try {
    const payment = await createVnPayUrlMutation.mutateAsync(order.id);
    persistVnPayReturnContext({
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentNumber: payment.paymentNumber,
    });
    redirectToVnPay(payment.paymentUrl);
  } catch (error) {
    vnPayRedirectError.value = errorMessage(
      error,
      "Không thể mở cổng thanh toán VNPay. Vui lòng thử lại.",
    );
  }
}

watch(shippingAddressId, () => {
  if (createOrderMutation.isPending.value) return;
  confirmationDialogOpen.value = false;
  confirmationSnapshot.value = null;
  orderNotice.value = "";
  createOrderMutation.reset();
});

watch(currentOrderPayloadFingerprint, (fingerprint, previousFingerprint) => {
  if (previousFingerprint !== null && fingerprint !== previousFingerprint) {
    clearOrderAttempt();
  }
});
</script>

<template>
  <CustomerLayout :hide-floating-utilities="true">
    <div
      class="min-h-[70svh] bg-[#f7faf8] pb-20 md:pb-0"
      data-checkout-page
      :data-scenario="props.scenario"
    >
      <div
        class="mx-auto w-full max-w-[90rem] px-4 py-4 sm:px-6 lg:px-8 lg:py-5"
      >
        <div class="flex min-w-0 items-center gap-2">
          <RouterLink
            :to="{ name: ROUTE_NAMES.cart }"
            class="motion-interactive grid size-9 flex-none place-items-center rounded-lg text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Trở lại giỏ hàng"
          >
            <ChevronLeft class="size-4.5" aria-hidden="true" />
          </RouterLink>
          <h1 class="truncate text-body-lg font-semibold text-primary-950">
            Thanh toán
          </h1>
        </div>

        <div
          v-if="cartQuery.isPending.value"
          class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]"
          role="status"
          data-checkout-loading
        >
          <span class="sr-only">Đang tải giỏ hàng</span>
          <div class="h-96 animate-pulse rounded-3xl bg-primary-100" />
          <div class="h-80 animate-pulse rounded-3xl bg-primary-100" />
        </div>

        <section
          v-else-if="cartQuery.isError.value"
          class="mt-4 grid min-h-80 place-items-center rounded-3xl border border-primary-100 bg-white p-8 text-center"
          data-checkout-error
        >
          <div>
            <AlertTriangle
              class="mx-auto size-12 text-[#a26524]"
              aria-hidden="true"
            />
            <h2 class="mt-4 text-heading-2 text-primary-950">
              Chưa thể tải giỏ hàng
            </h2>
            <p class="mt-2 text-body-md text-text-secondary">
              {{ cartErrorMessage }}
            </p>
            <button
              type="button"
              class="mt-5 min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
              @click="cartQuery.refetch()"
            >
              Thử tải lại
            </button>
          </div>
        </section>

        <section
          v-else-if="cartItems.length === 0"
          class="mt-4 grid min-h-80 place-items-center rounded-3xl border border-primary-100 bg-white p-8 text-center"
          data-checkout-empty
        >
          <div>
            <PackageOpen
              class="mx-auto size-12 text-primary-500"
              aria-hidden="true"
            />
            <h2 class="mt-4 text-heading-2 text-primary-950">
              Chưa có sản phẩm để thanh toán
            </h2>
            <RouterLink
              :to="{ name: ROUTE_NAMES.products }"
              class="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
            >
              Xem sản phẩm
            </RouterLink>
          </div>
        </section>

        <div
          v-else
          class="mt-3 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] xl:gap-5"
          data-checkout-layout
        >
          <div class="grid min-w-0 gap-3">
            <section
              v-if="branchIssueMessage"
              class="rounded-2xl border border-[#edcbc7] bg-[#fff5f3] p-4 text-body-sm text-[#8f3733]"
              role="alert"
              data-checkout-branch-error
            >
              <p class="font-semibold">Chưa thể xác nhận chi nhánh</p>
              <p class="mt-1">{{ branchIssueMessage }}</p>
              <RouterLink
                :to="{ name: ROUTE_NAMES.cart }"
                class="mt-2 inline-flex min-h-9 items-center font-semibold underline underline-offset-2"
              >
                Quay lại giỏ hàng
              </RouterLink>
            </section>

            <section
              class="grid grid-cols-2 gap-2 rounded-2xl border border-primary-100 bg-white p-2 shadow-xs"
              aria-label="Phương thức nhận hàng"
              data-fulfillment-selector
            >
              <button
                type="button"
                class="motion-interactive min-h-12 rounded-xl px-3 text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                :class="
                  fulfillmentMethod === 'delivery'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-primary-800 hover:bg-primary-50'
                "
                :aria-pressed="fulfillmentMethod === 'delivery'"
                data-fulfillment="delivery"
                @click="selectFulfillment('delivery')"
              >
                Giao hàng tận nơi
              </button>
              <button
                type="button"
                class="motion-interactive min-h-12 rounded-xl px-3 text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                :class="
                  fulfillmentMethod === 'pickup'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-primary-800 hover:bg-primary-50'
                "
                :aria-pressed="fulfillmentMethod === 'pickup'"
                data-fulfillment="pickup"
                @click="selectFulfillment('pickup')"
              >
                Nhận hàng tại cửa hàng
              </button>
            </section>

            <section
              v-if="fulfillmentMethod === 'delivery'"
              class="rounded-2xl border border-primary-100 bg-white p-3.5 shadow-xs sm:p-4"
              aria-labelledby="delivery-address-heading"
              data-delivery-section
            >
              <div class="flex items-center justify-between gap-3">
                <h2
                  id="delivery-address-heading"
                  class="text-body-lg font-semibold text-primary-950"
                >
                  Địa chỉ nhận hàng
                </h2>
                <button
                  type="button"
                  class="min-h-10 rounded-xl px-3 text-body-sm font-semibold text-primary-800"
                  @click="openAddressSelector"
                >
                  {{ selectedAddress ? "Thay đổi" : "Thêm địa chỉ" }}
                </button>
              </div>
              <div
                v-if="addressesQuery.isPending.value"
                class="mt-3 rounded-2xl bg-muted p-4 text-body-sm text-text-secondary"
                role="status"
                data-address-loading
              >
                Đang tải địa chỉ đã lưu...
              </div>
              <div
                v-else-if="addressesQuery.isError.value"
                class="mt-3 rounded-2xl bg-destructive/10 p-4 text-body-sm text-destructive"
                role="alert"
                data-address-error
              >
                <p>{{ addressErrorMessage }}</p>
                <button
                  type="button"
                  class="mt-2 min-h-9 font-semibold underline underline-offset-2"
                  @click="addressesQuery.refetch()"
                >
                  Thử tải lại địa chỉ
                </button>
              </div>
              <div
                v-else-if="selectedAddress"
                class="mt-3 rounded-2xl bg-primary-50 p-4"
                data-selected-address
                :data-ghn-province-id="
                  selectedAddress.ghn_province_id ?? undefined
                "
                :data-ghn-district-id="
                  selectedAddress.ghn_district_id ?? undefined
                "
                :data-ghn-ward-code="selectedAddress.ghn_ward_code"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="text-primary-950">{{
                    selectedAddress.fullName
                  }}</strong>
                  <span class="text-body-sm text-text-secondary">{{
                    selectedAddress.phone
                  }}</span>
                  <span
                    v-if="selectedAddress.isDefault"
                    class="rounded-full bg-primary-700 px-2 py-1 text-caption font-semibold text-white"
                    >Mặc định</span
                  >
                </div>
                <p class="mt-2 text-body-sm leading-5 text-text-secondary">
                  {{ addressText(selectedAddress) }}
                </p>
                <p
                  class="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-blue-600"
                  data-saved-address-account
                >
                  <BadgeCheck class="size-4 text-blue-600" aria-hidden="true" />
                  Địa chỉ đã lưu trong tài khoản
                </p>
              </div>
              <div
                v-else
                class="mt-3 rounded-2xl border border-dashed border-primary-200 p-4 text-body-sm text-text-secondary"
                data-address-required
              >
                Thêm địa chỉ nhận hàng để tiếp tục.
              </div>

              <div
                v-if="selectedAddress && branchMatchesCart"
                class="mt-4"
                data-shipping-quote
              >
                <p class="text-body-sm font-semibold text-primary-950">
                  Vận chuyển GHN
                </p>
                <div
                  v-if="shippingQuoteQuery.isFetching.value"
                  class="mt-2 rounded-2xl bg-muted p-3 text-body-sm text-text-secondary"
                  role="status"
                  data-shipping-quote-loading
                >
                  Đang lấy báo giá vận chuyển...
                </div>
                <div
                  v-else-if="shippingQuoteQuery.isError.value"
                  class="mt-2 rounded-2xl bg-destructive/10 p-3 text-body-sm text-destructive"
                  role="alert"
                  data-shipping-quote-error
                >
                  <p>{{ shippingQuoteErrorMessage }}</p>
                  <button
                    type="button"
                    class="mt-2 min-h-9 font-semibold underline underline-offset-2"
                    @click="shippingQuoteQuery.refetch()"
                  >
                    Thử lấy lại báo giá
                  </button>
                </div>
                <div
                  v-else-if="shippingQuoteExpired"
                  class="mt-2 rounded-2xl border border-[#efd7b0] bg-[#fff9ed] p-3 text-body-sm text-[#78551d]"
                  role="alert"
                  data-shipping-quote-expired
                >
                  <p>Báo giá vận chuyển đã hết hạn.</p>
                  <button
                    type="button"
                    class="mt-2 min-h-9 font-semibold underline underline-offset-2"
                    @click="shippingQuoteQuery.refetch()"
                  >
                    Cập nhật báo giá
                  </button>
                </div>
                <div
                  v-else-if="shippingQuoteQuery.data.value"
                  class="mt-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3"
                  data-shipping-quote-success
                  :data-quote-token="shippingQuoteQuery.data.value.quoteToken"
                  :data-quote-expires-at="
                    shippingQuoteQuery.data.value.expiresAt
                  "
                >
                  <div class="flex items-start justify-between gap-3">
                    <span class="flex min-w-0 items-start gap-2.5">
                      <span
                        class="grid size-9 flex-none place-items-center rounded-full bg-primary-100 text-primary-700"
                      >
                        <Truck
                          class="size-5"
                          aria-hidden="true"
                          data-delivery-truck-icon
                        />
                      </span>
                      <span class="min-w-0">
                        <strong
                          v-if="expectedDeliveryDate"
                          class="block text-body-sm text-primary-950"
                          >Dự kiến nhận hàng: {{ expectedDeliveryDate }}</strong
                        >
                        <strong
                          v-else
                          class="block text-body-sm text-primary-950"
                          data-expected-delivery-fallback
                          >Ngày nhận hàng dự kiến đang được cập nhật</strong
                        >
                        <span
                          class="mt-0.5 block text-caption text-text-secondary"
                          >Báo giá GHN cho địa chỉ hiện tại.</span
                        >
                      </span>
                    </span>
                    <strong class="flex-none text-body-sm text-blue-800">{{
                      currencyFormatter.format(
                        shippingQuoteQuery.data.value.shippingFee,
                      )
                    }}</strong>
                  </div>
                  <div
                    class="mt-3 grid gap-2 border-t border-blue-100 pt-3 text-caption text-text-secondary"
                    data-delivery-policies
                  >
                    <p class="flex items-center gap-2">
                      <Info
                        class="size-4 flex-none text-blue-600"
                        aria-hidden="true"
                      />
                      Nhận tối đa 15.000đ nếu đơn hàng giao trễ
                    </p>
                    <details
                      class="group rounded-lg bg-white/70 px-2.5 py-2"
                      data-inspection-policy
                    >
                      <summary
                        class="flex cursor-pointer list-none items-center gap-2 font-semibold text-blue-800"
                      >
                        <PackageCheck
                          class="size-4 flex-none"
                          aria-hidden="true"
                        />
                        Được đồng kiểm
                        <span
                          class="ml-auto text-[0.68rem] font-medium text-blue-600 group-open:hidden"
                          >Xem thêm</span
                        >
                      </summary>
                      <p class="mt-2 pl-6 leading-5">
                        Bạn có thể kiểm tra tình trạng bên ngoài và đối chiếu
                        sản phẩm khi nhận hàng.
                      </p>
                    </details>
                  </div>
                </div>
              </div>
            </section>

            <section
              v-else
              class="rounded-2xl border border-primary-100 bg-white p-3.5 shadow-xs sm:p-4"
              aria-labelledby="pickup-heading"
              data-pickup-section
            >
              <div class="flex items-center gap-3">
                <span
                  class="grid size-10 flex-none place-items-center rounded-full bg-primary-100 text-primary-700"
                >
                  <Store class="size-5" aria-hidden="true" />
                </span>
                <div class="min-w-0">
                  <h2
                    id="pickup-heading"
                    class="text-body-lg font-semibold text-primary-950"
                  >
                    Nhận hàng tại cửa hàng
                  </h2>
                  <p class="mt-0.5 text-caption text-text-secondary">
                    Không phát sinh phí vận chuyển GHN.
                  </p>
                </div>
              </div>
              <div
                v-if="cartBranch"
                class="mt-4 rounded-2xl bg-primary-50 p-4"
                data-pickup-branch
              >
                <strong class="text-primary-950">{{ cartBranch.name }}</strong>
                <p
                  class="mt-1 break-words text-body-sm leading-5 text-text-secondary"
                >
                  {{ cartBranch.address }}
                </p>
              </div>
              <div
                class="mt-3 rounded-2xl border border-primary-100 p-4"
                data-pickup-customer
              >
                <p
                  class="text-caption font-semibold uppercase tracking-wide text-primary-700"
                >
                  Thông tin người nhận
                </p>
                <p class="mt-2 font-semibold text-primary-950">
                  {{ authStore.user?.name }}
                </p>
                <p class="mt-1 text-body-sm text-text-secondary">
                  {{ authStore.user?.phone || authStore.user?.email }}
                </p>
              </div>
            </section>

            <section
              class="rounded-2xl border border-primary-100 bg-white p-3.5 shadow-xs sm:p-4"
              aria-labelledby="checkout-products-heading"
              data-checkout-products
            >
              <div class="flex items-center justify-between gap-3">
                <h2
                  id="checkout-products-heading"
                  class="text-body-lg font-semibold text-primary-950"
                >
                  Toàn bộ giỏ hàng
                </h2>
                <RouterLink
                  :to="{ name: ROUTE_NAMES.cart }"
                  class="min-h-10 rounded-xl px-3 py-2 text-body-sm font-semibold text-primary-800"
                  >Thay đổi</RouterLink
                >
              </div>
              <div class="mt-3 divide-y divide-primary-100">
                <article
                  v-for="item in cartItems"
                  :key="item.id"
                  class="flex min-w-0 gap-3 py-3 first:pt-0 last:pb-0"
                  :data-product-available="
                    !item.stockWarning &&
                    item.availableQuantity >= item.quantity
                  "
                >
                  <div
                    class="grid size-18 flex-none place-items-center overflow-hidden rounded-xl bg-primary-50 text-primary-700 sm:size-20"
                  >
                    <img
                      v-if="productImage(item.id, item.product.imageUrl)"
                      :src="productImage(item.id, item.product.imageUrl)"
                      :alt="item.product.name"
                      class="size-full object-cover"
                      loading="lazy"
                      data-checkout-product-image
                      @error="markProductImageFailed(item.id)"
                    />
                    <PackageOpen
                      v-else
                      class="size-7"
                      aria-hidden="true"
                      data-checkout-product-fallback
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p
                      v-if="productBrandName(item.product)"
                      class="text-caption font-semibold text-primary-700"
                      data-product-brand
                    >
                      {{ productBrandName(item.product) }}
                    </p>
                    <h3
                      class="mt-1 break-words text-body-sm font-semibold leading-5 text-primary-950 [overflow-wrap:anywhere]"
                    >
                      {{ item.product.name }}
                    </h3>
                    <p class="mt-1 text-caption text-text-secondary">
                      Số lượng: {{ item.quantity }}
                    </p>
                    <p
                      v-if="
                        item.stockWarning ||
                        item.availableQuantity < item.quantity
                      "
                      class="mt-1 text-caption font-semibold text-[#923b37]"
                    >
                      Chỉ còn {{ item.availableQuantity }} sản phẩm
                    </p>
                  </div>
                  <div class="max-w-28 flex-none text-right sm:max-w-36">
                    <strong class="text-body-sm text-[#c8423a]">{{
                      currencyFormatter.format(item.subtotal)
                    }}</strong>
                    <span class="mt-1 block text-caption text-text-muted"
                      >{{
                        currencyFormatter.format(item.variant.effectivePrice)
                      }}/sp</span
                    >
                  </div>
                </article>
              </div>
              <div
                v-if="hasUnavailableProduct"
                class="mt-4 rounded-2xl border border-[#edcbc7] bg-[#fff5f3] p-3"
                role="alert"
                data-unavailable-warning
              >
                <p class="text-body-sm font-semibold text-[#8f3733]">
                  Có sản phẩm chưa thể đặt hàng.
                </p>
                <RouterLink
                  :to="{ name: ROUTE_NAMES.cart }"
                  class="mt-2 inline-flex min-h-10 items-center font-semibold text-primary-800"
                  >Quay lại giỏ hàng để điều chỉnh</RouterLink
                >
              </div>
            </section>
          </div>

          <aside
            class="min-w-0"
            aria-labelledby="checkout-summary-heading"
            data-checkout-sidebar
          >
            <div
              class="grid gap-3 lg:sticky lg:top-28"
              data-checkout-sidebar-stack
            >
              <section
                class="rounded-2xl border border-primary-100 bg-white p-4 shadow-xs"
                data-checkout-voucher-card
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="flex items-center gap-2">
                    <Tag class="size-4.5 text-blue-600" aria-hidden="true" />
                    <h2 class="text-body-md font-semibold text-primary-950">
                      Voucher
                    </h2>
                  </span>
                  <button
                    type="button"
                    class="min-h-9 flex-none text-caption font-semibold text-blue-700"
                    data-open-voucher-dialog
                    @click="voucherDialogOpen = true"
                  >
                    {{
                      selectedOrderVoucher || selectedShippingVoucher
                        ? "Đổi voucher"
                        : "Chọn voucher"
                    }}
                  </button>
                </div>

                <div
                  v-if="selectedOrderVoucher || selectedShippingVoucher"
                  class="mt-2 grid gap-2"
                  data-selected-voucher-box
                >
                  <article
                    v-if="selectedOrderVoucher"
                    class="relative overflow-hidden rounded-xl border border-blue-300 bg-blue-50 p-3 text-caption text-blue-950"
                    data-selected-order-voucher
                  >
                    <span
                      class="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-blue-300 bg-white"
                      aria-hidden="true"
                    />
                    <span class="flex items-start gap-2.5 pl-1">
                      <span
                        class="grid size-9 flex-none place-items-center rounded-lg bg-blue-100 text-blue-700"
                        ><Tag class="size-4.5" aria-hidden="true"
                      /></span>
                      <span class="min-w-0 flex-1">
                        <span class="flex items-start justify-between gap-2">
                          <strong
                            class="break-words text-body-sm text-blue-950"
                            >{{ selectedOrderVoucher.label }}</strong
                          >
                          <span
                            class="rounded bg-white px-1.5 py-0.5 text-[0.625rem] font-bold text-blue-700"
                            >{{ selectedOrderVoucher.code }}</span
                          >
                        </span>
                        <span class="mt-1 block leading-4 text-blue-800">{{
                          selectedOrderVoucher.description
                        }}</span>
                        <span
                          class="mt-1 flex items-start gap-1 text-[0.6875rem] text-blue-700"
                        >
                          <Info
                            class="mt-0.5 size-3.5 flex-none"
                            aria-hidden="true"
                          />
                          Đơn tối thiểu
                          {{
                            currencyFormatter.format(
                              selectedOrderVoucher.minimumOrder,
                            )
                          }}
                          · {{ selectedOrderVoucher.expiryText }}
                        </span>
                      </span>
                    </span>
                  </article>

                  <article
                    v-if="selectedShippingVoucher"
                    class="relative overflow-hidden rounded-xl border border-blue-300 bg-blue-50 p-3 text-caption text-blue-950"
                    data-selected-shipping-voucher
                  >
                    <span
                      class="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-blue-300 bg-white"
                      aria-hidden="true"
                    />
                    <span class="flex items-start gap-2.5 pl-1">
                      <span
                        class="grid size-9 flex-none place-items-center rounded-lg bg-blue-100 text-blue-700"
                        ><Truck class="size-4.5" aria-hidden="true"
                      /></span>
                      <span class="min-w-0 flex-1">
                        <span class="flex items-start justify-between gap-2">
                          <strong
                            class="break-words text-body-sm text-blue-950"
                            >{{ selectedShippingVoucher.label }}</strong
                          >
                          <span
                            class="rounded bg-white px-1.5 py-0.5 text-[0.625rem] font-bold text-blue-700"
                            >{{ selectedShippingVoucher.code }}</span
                          >
                        </span>
                        <span class="mt-1 block leading-4 text-blue-800">{{
                          selectedShippingVoucher.description
                        }}</span>
                        <span
                          class="mt-1 flex items-start gap-1 text-[0.6875rem] text-blue-700"
                        >
                          <Info
                            class="mt-0.5 size-3.5 flex-none"
                            aria-hidden="true"
                          />
                          Đơn tối thiểu
                          {{
                            currencyFormatter.format(
                              selectedShippingVoucher.minimumOrder,
                            )
                          }}
                          · {{ selectedShippingVoucher.expiryText }}
                        </span>
                      </span>
                    </span>
                  </article>

                  <button
                    type="button"
                    class="min-h-8 justify-self-start text-caption font-semibold text-blue-700 underline underline-offset-2"
                    data-remove-vouchers
                    @click="removeSelectedVouchers"
                  >
                    Bỏ voucher
                  </button>
                </div>
                <div
                  v-else
                  class="relative mt-2 flex items-center gap-2 overflow-hidden rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-caption text-blue-800"
                  data-voucher-empty
                >
                  <span
                    class="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-blue-200 bg-white"
                    aria-hidden="true"
                  />
                  <span
                    class="ml-1 grid size-8 flex-none place-items-center rounded-lg bg-blue-100"
                    ><Tag class="size-4" aria-hidden="true"
                  /></span>
                  <span class="min-w-0 flex-1">Chưa chọn voucher mẫu</span>
                  <Info class="size-4 flex-none" aria-hidden="true" />
                </div>
              </section>

              <section
                class="rounded-2xl border border-primary-200 bg-primary-50 p-4 shadow-xs"
                data-checkout-payment-card
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="flex items-center gap-2">
                    <WalletCards
                      v-if="paymentMethodId === 'wallet'"
                      class="size-4.5 text-primary-700"
                      aria-hidden="true"
                    />
                    <Banknote
                      v-else-if="paymentMethodId === 'cod'"
                      class="size-4.5 text-primary-700"
                      aria-hidden="true"
                    />
                    <QrCode
                      v-else
                      class="size-4.5 text-primary-700"
                      aria-hidden="true"
                    />
                    <h2 class="text-body-md font-semibold text-primary-950">
                      Thanh toán
                    </h2>
                  </span>
                  <button
                    type="button"
                    class="min-h-9 flex-none text-caption font-semibold text-primary-800"
                    data-change-payment
                    @click="paymentDialogOpen = true"
                  >
                    Thay đổi
                  </button>
                </div>
                <p
                  class="mt-1 text-body-sm font-semibold text-primary-900"
                  data-selected-payment
                >
                  {{ selectedPayment?.name }}
                </p>
                <p
                  v-if="
                    paymentMethodId === 'wallet' &&
                    selectedPayment?.balanceState === 'loading'
                  "
                  class="mt-1 text-caption text-text-secondary"
                  role="status"
                  data-selected-wallet-balance-loading
                >
                  Đang tải số dư ví...
                </p>
                <p
                  v-else-if="
                    paymentMethodId === 'wallet' &&
                    selectedPayment?.balanceState === 'ready' &&
                    selectedPayment.balance !== undefined
                  "
                  class="mt-1 text-caption text-primary-800"
                  data-selected-wallet-balance
                >
                  Số dư khả dụng:
                  {{ currencyFormatter.format(selectedPayment.balance) }}
                </p>
                <p
                  v-else-if="
                    paymentMethodId === 'wallet' &&
                    selectedPayment?.balanceState === 'error'
                  "
                  class="mt-1 text-caption text-[#8f493f]"
                  role="status"
                  data-selected-wallet-balance-error
                >
                  Không thể tải số dư. Hệ thống sẽ xác nhận khi đặt hàng.
                </p>
              </section>

              <section
                class="rounded-2xl border border-primary-100 bg-white p-4 shadow-sm"
                data-checkout-summary
              >
                <h2
                  id="checkout-summary-heading"
                  class="text-heading-3 text-primary-950"
                >
                  Đơn hàng
                </h2>
                <dl class="mt-4 space-y-3 text-body-sm">
                  <div class="flex justify-between gap-4">
                    <dt>Số lượng</dt>
                    <dd data-total-count>{{ totals.selectedCount }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt>Tạm tính</dt>
                    <dd data-total-subtotal>
                      {{ currencyFormatter.format(totals.subtotal) }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt>Phí vận chuyển</dt>
                    <dd data-total-shipping>
                      {{
                        totals.shippingFee === null
                          ? "Chưa xác định"
                          : currencyFormatter.format(totals.shippingFee)
                      }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4 text-primary-700">
                    <dt>Tiết kiệm</dt>
                    <dd data-saved-amount>
                      {{ formatSavings(totals.savedAmount) }}
                    </dd>
                  </div>
                  <div
                    class="flex items-end justify-between gap-4 border-t border-primary-100 pt-4"
                  >
                    <dt class="font-semibold text-primary-950">Tổng dự kiến</dt>
                    <dd class="text-heading-3 text-[#c8423a]" data-total>
                      {{
                        totals.total === null
                          ? "Chờ báo giá"
                          : currencyFormatter.format(totals.total)
                      }}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  class="motion-interactive mt-4 hidden min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45 lg:inline-flex"
                  :disabled="!canPlaceOrder"
                  data-place-order-desktop
                  @click="openOrderConfirmation"
                >
                  Đặt hàng
                </button>
                <p
                  v-if="checkoutReadinessMessage"
                  class="mt-2 text-caption text-text-secondary"
                  data-checkout-readiness-message
                >
                  {{ checkoutReadinessMessage }}
                </p>
                <p
                  v-if="orderNotice"
                  class="mt-2 rounded-xl bg-[#fff9ed] px-3 py-2 text-caption text-[#78551d]"
                  role="status"
                  data-order-notice
                >
                  {{ orderNotice }}
                </p>
              </section>
            </div>
          </aside>
        </div>
      </div>

      <div
        v-if="
          !cartQuery.isPending.value &&
          !cartQuery.isError.value &&
          cartItems.length
        "
        class="fixed inset-x-3 bottom-[5.75rem] z-30 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-lg backdrop-blur-md md:hidden"
        data-mobile-order-bar
        role="region"
        aria-label="Thanh đặt hàng mobile"
      >
        <div class="min-w-0">
          <strong class="block truncate text-body-lg text-[#c8423a]">{{
            totals.total === null
              ? "Chờ báo giá"
              : currencyFormatter.format(totals.total)
          }}</strong>
          <span class="block text-caption text-primary-700"
            >Tiết kiệm: {{ formatSavings(totals.savedAmount) }}</span
          >
        </div>
        <button
          type="button"
          class="motion-interactive inline-flex min-h-12 flex-none items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45"
          :disabled="!canPlaceOrder"
          data-place-order-mobile
          @click="openOrderConfirmation"
        >
          Đặt hàng
        </button>
      </div>

      <CheckoutAddressDialog
        v-model="addressDialogOpen"
        v-model:draft="addressDraft"
        :addresses="addresses"
        :selected-id="selectedAddressId"
        :start-in-form="addressDialogStartInForm"
        :loading="addressesQuery.isPending.value"
        :saving="addressSaving"
        :deleting-id="
          deleteAddressMutation.isPending.value
            ? deleteAddressMutation.variables.value
            : undefined
        "
        :error-message="addressErrorMessage"
        :server-errors="addressServerErrors"
        @continue="handleAddressContinue"
        @select="selectAddress"
        @edit="handleAddressEdit"
        @set-default="handleSetDefaultAddress"
        @delete="handleDeleteAddress"
        @reset-error="resetAddressMutationErrors"
      />
      <CheckoutPaymentDialog
        v-model="paymentDialogOpen"
        :methods="supportedCheckoutPaymentMethods"
        :selected-id="paymentMethodId"
        @confirm="selectPayment"
      />
      <CheckoutVoucherDialog
        v-model="voucherDialogOpen"
        :vouchers="checkoutVouchers"
        :subtotal="totals.subtotal"
        :shipping-fee="totals.shippingFee ?? 0"
        :selected-order-voucher-id="selectedOrderVoucherId"
        :selected-shipping-voucher-id="selectedShippingVoucherId"
        @confirm="selectVouchers"
      />

      <Teleport to="body">
        <div
          v-if="confirmationDialogOpen"
          class="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-primary-950/45 p-4 backdrop-blur-[2px]"
          data-order-confirmation
          @click.self="closeOrderConfirmation"
        >
          <section
            class="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-confirmation-title"
          >
            <h2
              id="order-confirmation-title"
              class="text-heading-2 text-primary-950"
            >
              Xác nhận đặt hàng
            </h2>
            <p class="mt-1 text-body-sm text-text-secondary">
              Kiểm tra thông tin hiện tại trước khi gửi đơn hàng.
            </p>
            <dl
              class="mt-5 grid gap-3 text-body-sm"
              data-order-confirmation-summary
            >
              <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
                <dt class="text-text-secondary">Cách nhận hàng</dt>
                <dd class="font-semibold text-primary-950">
                  {{
                    fulfillmentMethod === "delivery"
                      ? "Giao tận nơi"
                      : "Nhận tại cửa hàng"
                  }}
                </dd>
              </div>
              <div
                v-if="fulfillmentMethod === 'delivery'"
                class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3"
              >
                <dt class="text-text-secondary">Người nhận</dt>
                <dd class="min-w-0 font-semibold text-primary-950">
                  {{ selectedAddress?.fullName }} · {{ selectedAddress?.phone }}
                  <span
                    v-if="selectedAddress"
                    class="mt-1 block break-words font-normal text-text-secondary"
                    >{{ addressText(selectedAddress) }}</span
                  >
                </dd>
              </div>
              <div v-else class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
                <dt class="text-text-secondary">Người nhận</dt>
                <dd class="min-w-0 font-semibold text-primary-950">
                  {{ authStore.user?.name }}
                  <span class="mt-1 block font-normal text-text-secondary">{{
                    authStore.user?.phone || authStore.user?.email
                  }}</span>
                </dd>
              </div>
              <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
                <dt class="text-text-secondary">Chi nhánh</dt>
                <dd class="min-w-0 font-semibold text-primary-950">
                  {{ cartBranch?.name }}
                  <span
                    class="mt-1 block break-words font-normal text-text-secondary"
                    >{{ cartBranch?.address }}</span
                  >
                </dd>
              </div>
              <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
                <dt class="text-text-secondary">Số lượng</dt>
                <dd class="font-semibold text-primary-950">
                  {{ totals.selectedCount }} sản phẩm
                </dd>
              </div>
              <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
                <dt class="text-text-secondary">Thanh toán</dt>
                <dd class="font-semibold text-primary-950">
                  {{ selectedPayment?.name }}
                </dd>
              </div>
              <div
                class="flex items-end justify-between gap-4 border-t border-primary-100 pt-4"
              >
                <dt class="font-semibold text-primary-950">Tổng dự kiến</dt>
                <dd
                  class="text-heading-3 text-[#c8423a]"
                  data-confirmation-total
                >
                  {{
                    currencyFormatter.format(
                      confirmationSnapshot?.expectedTotal ?? 0,
                    )
                  }}
                </dd>
              </div>
            </dl>

            <div
              v-if="createOrderMutation.isError.value"
              class="mt-4 rounded-2xl bg-destructive/10 p-3 text-body-sm text-destructive"
              role="alert"
              data-create-order-error
            >
              <p class="font-semibold">{{ orderErrorMessage }}</p>
              <ul
                v-if="orderValidationMessages.length"
                class="mt-2 list-disc space-y-1 pl-5"
              >
                <li v-for="message in orderValidationMessages" :key="message">
                  {{ message }}
                </li>
              </ul>
            </div>

            <div class="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                class="min-h-11 rounded-xl border border-primary-200 px-4 font-semibold text-primary-800 disabled:opacity-50"
                :disabled="createOrderMutation.isPending.value"
                data-cancel-order-confirmation
                @click="closeOrderConfirmation"
              >
                Hủy
              </button>
              <button
                type="button"
                class="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:cursor-wait disabled:opacity-60"
                :disabled="createOrderMutation.isPending.value"
                data-confirm-order
                @click="confirmOrder"
              >
                {{
                  createOrderMutation.isPending.value
                    ? "Đang đặt hàng..."
                    : "Xác nhận đặt hàng"
                }}
              </button>
            </div>
          </section>
        </div>

        <div
          v-if="createdOrder"
          class="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-primary-950/50 p-4 backdrop-blur-sm"
          data-order-success
        >
          <section
            class="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-success-title"
          >
            <Sparkles
              class="absolute left-7 top-8 size-6 rotate-[-18deg] text-[#e7b451]"
              aria-hidden="true"
            />
            <Sparkles
              class="absolute right-8 top-14 size-5 rotate-12 text-[#67b98c]"
              aria-hidden="true"
            />
            <div
              class="mx-auto grid size-20 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-200"
            >
              <CheckCircle2 class="size-11" aria-hidden="true" />
            </div>
            <h2
              id="order-success-title"
              class="mt-5 text-heading-2 text-emerald-800"
            >
              {{
                createdOrder?.paymentMethod === "vnpay"
                  ? "Đơn hàng đã được tạo"
                  : "Đặt hàng thành công"
              }}
            </h2>
            <p class="mt-2 text-body-sm text-text-secondary">
              {{
                createdOrder?.paymentMethod === "vnpay"
                  ? "Tiếp tục tới VNPay để hoàn tất thanh toán."
                  : "Mizuki đã xác nhận đơn hàng của bạn."
              }}
            </p>
            <div
              class="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left text-body-sm"
            >
              <p class="flex justify-between gap-4">
                <span class="text-text-secondary">Mã đơn hàng</span
                ><strong data-success-order-number>{{
                  createdOrder.orderNumber
                }}</strong>
              </p>
              <p class="mt-3 flex justify-between gap-4">
                <span class="text-text-secondary">Thành tiền</span
                ><strong class="text-emerald-800" data-success-order-total>{{
                  currencyFormatter.format(createdOrder.totalAmount)
                }}</strong>
              </p>
              <p class="mt-3 flex justify-between gap-4">
                <span class="text-text-secondary">Cách nhận hàng</span
                ><strong>{{
                  createdOrder.deliveryMethod === "delivery"
                    ? "Giao tận nơi"
                    : "Nhận tại cửa hàng"
                }}</strong>
              </p>
              <p class="mt-3 flex justify-between gap-4">
                <span class="text-text-secondary">Trạng thái</span
                ><strong data-success-order-status>{{
                  createdOrder.statusLabel
                }}</strong>
              </p>
            </div>
            <p
              v-if="vnPayRedirectError"
              class="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-body-sm text-destructive"
              role="alert"
              data-vnpay-redirect-error
            >
              {{ vnPayRedirectError }}
            </p>
            <button
              v-if="createdOrder.paymentMethod === 'vnpay'"
              type="button"
              class="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
              :disabled="createVnPayUrlMutation.isPending.value"
              data-continue-vnpay
              @click="startVnPayPayment(createdOrder)"
            >
              {{
                createVnPayUrlMutation.isPending.value
                  ? "Đang mở VNPay..."
                  : "Tiếp tục thanh toán VNPay"
              }}
            </button>
            <RouterLink
              :to="{ name: ROUTE_NAMES.products }"
              class="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-primary-200 px-5 font-semibold text-primary-800"
              data-continue-shopping
            >
              Tiếp tục mua sắm
            </RouterLink>
          </section>
        </div>
      </Teleport>
    </div>
  </CustomerLayout>
</template>
