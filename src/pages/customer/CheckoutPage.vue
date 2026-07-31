<script setup lang="ts">
import {
  AlertTriangle,
  BadgeCheck,
  ChevronLeft,
  Clock3,
  PackageOpen,
  Store,
  Tag,
  Truck,
  WalletCards,
} from '@lucide/vue'
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  CheckoutAddressDialog,
  CheckoutOtpDialog,
  CheckoutPaymentDialog,
  CheckoutVoucherDialog,
} from '@/components/checkout'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import {
  checkoutBranches,
  emptyCheckoutAddressDraft,
  checkoutPaymentMethods,
  checkoutShippingOptions,
  checkoutVouchers,
  createCheckoutScenario,
} from '@/data/customer/checkoutDemoData'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import type {
  CheckoutAddress,
  CheckoutAddressDraft,
  CheckoutOrderResult,
  CheckoutScenario,
  CheckoutTotals,
  CheckoutVoucher,
  FulfillmentMethod,
} from '@/types/customer'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    scenario?: CheckoutScenario
  }>(),
  {
    scenario: 'first-time',
  },
)

const scenarioData = createCheckoutScenario(props.scenario)
const viewState = ref(scenarioData.viewState)
const addresses = ref<CheckoutAddress[]>(scenarioData.addresses.map((address) => ({ ...address })))
const products = ref([...scenarioData.products])
const selectedAddressId = ref(addresses.value[0]?.id ?? '')
const addressDraft = ref<CheckoutAddressDraft>({ ...emptyCheckoutAddressDraft })
const addressDialogOpen = ref(
  viewState.value === 'success' && products.value.length > 0 && addresses.value.length === 0,
)
const addressDialogStartInForm = ref(addresses.value.length === 0)
const otpDialogOpen = ref(false)
const voucherDialogOpen = ref(false)
const paymentDialogOpen = ref(false)
const fulfillment = ref<FulfillmentMethod>('delivery')
const selectedShippingId = ref(checkoutShippingOptions[0]!.id)
const selectedBranchId = ref(checkoutBranches.find((branch) => branch.available)?.id ?? '')
const orderVoucherId = ref('')
const shippingVoucherId = ref('')
const paymentMethodId = ref(checkoutPaymentMethods.find((method) => method.available)?.id ?? '')
const orderNote = ref('')
const isSubmitting = ref(false)
const submitCount = ref(0)
const result = ref<CheckoutOrderResult | null>(null)
const resultDialogOpen = ref(false)
const nextResultKind = ref(scenarioData.result)
const orderPlaceholderVisible = ref(false)
let submitTimer: number | undefined
let localAddressCount = 0

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

const selectedAddress = computed(
  () => addresses.value.find((address) => address.id === selectedAddressId.value),
)
const selectedShipping = computed(
  () => checkoutShippingOptions.find((option) => option.id === selectedShippingId.value)
    ?? checkoutShippingOptions[0]!,
)
const selectedBranch = computed(
  () => checkoutBranches.find((branch) => branch.id === selectedBranchId.value),
)
const selectedPayment = computed(
  () => checkoutPaymentMethods.find((method) => method.id === paymentMethodId.value),
)
const selectedOrderVoucher = computed(
  () => checkoutVouchers.find((voucher) => voucher.id === orderVoucherId.value),
)
const selectedShippingVoucher = computed(
  () => checkoutVouchers.find((voucher) => voucher.id === shippingVoucherId.value),
)
const hasUnavailableProduct = computed(() => products.value.some((product) => !product.available))
const shippingFee = computed(
  () => fulfillment.value === 'pickup' ? 0 : selectedShipping.value.fee,
)

function calculateVoucherDiscount(
  voucher: CheckoutVoucher | undefined,
  eligibilityBasis: number,
  discountBasis: number,
): number {
  if (!voucher || eligibilityBasis < voucher.minimumOrder) return 0
  if (voucher.discountType === 'fixed') return Math.min(voucher.discountValue, discountBasis)
  const percentageDiscount = Math.round(discountBasis * voucher.discountValue / 100)
  return Math.min(
    percentageDiscount,
    voucher.maximumDiscount ?? percentageDiscount,
    discountBasis,
  )
}

const totals = computed<CheckoutTotals>(() => {
  const subtotal = products.value.reduce(
    (sum, product) => sum + product.unitPrice * product.quantity,
    0,
  )
  const productDiscount = products.value.reduce(
    (sum, product) =>
      sum + Math.max((product.originalUnitPrice ?? product.unitPrice) - product.unitPrice, 0)
        * product.quantity,
    0,
  )
  const orderVoucherDiscount = calculateVoucherDiscount(
    selectedOrderVoucher.value,
    subtotal,
    subtotal,
  )
  const shippingVoucherDiscount = fulfillment.value === 'delivery'
    ? calculateVoucherDiscount(selectedShippingVoucher.value, subtotal, shippingFee.value)
    : 0
  const total = Math.max(
    subtotal - orderVoucherDiscount + shippingFee.value - shippingVoucherDiscount,
    0,
  )

  return {
    selectedCount: products.value.reduce((count, product) => count + product.quantity, 0),
    subtotal,
    productDiscount,
    orderVoucherDiscount,
    shippingFee: shippingFee.value,
    shippingVoucherDiscount,
    total,
    savedAmount: productDiscount + orderVoucherDiscount + shippingVoucherDiscount,
  }
})

const canPlaceOrder = computed(() => {
  if (isSubmitting.value || products.value.length === 0 || hasUnavailableProduct.value) return false
  if (!paymentMethodId.value || !selectedPayment.value?.available) return false
  if (fulfillment.value === 'delivery') {
    return Boolean(selectedAddress.value?.phoneVerified)
  }
  return Boolean(selectedBranch.value?.available)
})

function addressText(address: CheckoutAddress): string {
  return [
    address.detail,
    address.wardName,
    address.districtName,
    address.provinceName,
  ].filter(Boolean).join(', ')
}

function openAddressSelector(): void {
  addressDialogStartInForm.value = addresses.value.length === 0
  addressDialogOpen.value = true
}

function handleAddressContinue(draft: CheckoutAddressDraft): void {
  addressDraft.value = { ...draft }
  addressDialogOpen.value = false
  otpDialogOpen.value = true
}

function handleAddressVerified(): void {
  localAddressCount += 1
  const newAddress: CheckoutAddress = {
    ...addressDraft.value,
    id: `local-address-${localAddressCount}`,
    phoneVerified: true,
  }

  addresses.value = newAddress.isDefault
    ? [...addresses.value.map((address) => ({ ...address, isDefault: false })), newAddress]
    : [...addresses.value, newAddress]
  selectedAddressId.value = newAddress.id
  otpDialogOpen.value = false
}

async function handleChangePhone(): Promise<void> {
  otpDialogOpen.value = false
  addressDialogStartInForm.value = true
  addressDialogOpen.value = true
  await nextTick()
  await nextTick()
  document.getElementById('checkout-phone')?.focus()
}

function selectAddress(id: string): void {
  selectedAddressId.value = id
}

function switchFulfillment(method: FulfillmentMethod): void {
  fulfillment.value = method
  if (method === 'pickup') shippingVoucherId.value = ''
}

function applyVouchers(orderId: string, shippingId: string): void {
  orderVoucherId.value = orderId
  shippingVoucherId.value = fulfillment.value === 'delivery' ? shippingId : ''
}

function selectPayment(id: string): void {
  const method = checkoutPaymentMethods.find((item) => item.id === id)
  if (method?.available) paymentMethodId.value = id
}

function clearSubmitTimer(): void {
  if (submitTimer !== undefined) {
    window.clearTimeout(submitTimer)
    submitTimer = undefined
  }
}

function placeOrder(): void {
  if (!canPlaceOrder.value || isSubmitting.value) return
  isSubmitting.value = true
  submitCount.value += 1
  clearSubmitTimer()

  submitTimer = window.setTimeout(() => {
    isSubmitting.value = false
    result.value = nextResultKind.value === 'success'
      ? {
          kind: 'success',
          orderNumber: 'MZK-DEMO-260731',
          message: 'Đơn hàng demo đã được tạo trong bộ nhớ cục bộ.',
        }
      : {
          kind: 'failure',
          message: 'Mô phỏng gián đoạn tạm thời. Thông tin checkout vẫn được giữ nguyên.',
        }
    resultDialogOpen.value = true
    submitTimer = undefined
  }, 250)
}

function retryOrder(): void {
  resultDialogOpen.value = false
  result.value = null
  nextResultKind.value = 'success'
}

function retryCheckout(): void {
  viewState.value = 'success'
}

onUnmounted(clearSubmitTimer)
</script>

<template>
  <CustomerLayout :hide-floating-utilities="true">
    <div
      class="min-h-[70svh] bg-[#f7faf8] pb-20 md:pb-0"
      data-checkout-page
      :data-scenario="props.scenario"
      :data-submit-count="submitCount"
    >
      <div class="mx-auto w-full max-w-[90rem] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <div class="flex min-w-0 items-center gap-2">
          <RouterLink
            :to="{ name: ROUTE_NAMES.cart }"
            class="motion-interactive grid size-10 flex-none place-items-center rounded-xl text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Trở lại giỏ hàng"
          >
            <ChevronLeft class="size-5" aria-hidden="true" />
          </RouterLink>
          <h1 class="truncate text-heading-3 text-primary-950">Thanh toán</h1>
          <span class="text-caption text-text-muted">· Checkout demo</span>
        </div>

        <div v-if="viewState === 'loading'" class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]" role="status" data-checkout-loading>
          <span class="sr-only">Đang chuẩn bị checkout</span>
          <div class="h-96 animate-pulse rounded-3xl bg-primary-100" />
          <div class="h-80 animate-pulse rounded-3xl bg-primary-100" />
        </div>

        <section v-else-if="viewState === 'empty'" class="mt-4 grid min-h-80 place-items-center rounded-3xl border border-primary-100 bg-white p-8 text-center" data-checkout-empty>
          <div>
            <PackageOpen class="mx-auto size-12 text-primary-500" aria-hidden="true" />
            <h2 class="mt-4 text-heading-2 text-primary-950">Chưa có sản phẩm để thanh toán</h2>
            <RouterLink :to="{ name: ROUTE_NAMES.products }" class="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
              Xem sản phẩm
            </RouterLink>
          </div>
        </section>

        <section v-else-if="viewState === 'error'" class="mt-4 grid min-h-80 place-items-center rounded-3xl border border-primary-100 bg-white p-8 text-center" data-checkout-error>
          <div>
            <AlertTriangle class="mx-auto size-12 text-[#a26524]" aria-hidden="true" />
            <h2 class="mt-4 text-heading-2 text-primary-950">Chưa thể chuẩn bị checkout</h2>
            <p class="mt-2 text-body-md text-text-secondary">Dữ liệu demo gặp gián đoạn có thể khôi phục.</p>
            <button type="button" class="mt-5 min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" @click="retryCheckout">
              Thử lại
            </button>
          </div>
        </section>

        <div v-else class="mt-3 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-7" data-checkout-layout>
          <div class="grid min-w-0 gap-4">
            <section class="rounded-3xl border border-primary-100 bg-white p-4 shadow-xs sm:p-5" aria-labelledby="fulfillment-heading">
              <h2 id="fulfillment-heading" class="text-body-lg font-semibold text-primary-950">Cách nhận hàng</h2>
              <div class="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cách nhận hàng">
                <button
                  v-for="option in [
                    { id: 'delivery', label: 'Giao tận nơi', icon: Truck },
                    { id: 'pickup', label: 'Nhận tại chi nhánh', icon: Store },
                  ] as const"
                  :key="option.id"
                  type="button"
                  role="radio"
                  :aria-checked="fulfillment === option.id"
                  :class="cn(
                    'motion-interactive inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    fulfillment === option.id
                      ? 'border-primary-500 bg-primary-50 text-primary-950'
                      : 'border-primary-100 text-text-secondary',
                  )"
                  :data-fulfillment="option.id"
                  @click="switchFulfillment(option.id)"
                >
                  <component :is="option.icon" class="size-4.5" aria-hidden="true" />
                  {{ option.label }}
                </button>
              </div>
            </section>

            <section
              v-if="fulfillment === 'delivery'"
              class="rounded-3xl border border-primary-100 bg-white p-4 shadow-xs sm:p-5"
              aria-labelledby="delivery-address-heading"
              data-delivery-section
            >
              <div class="flex items-center justify-between gap-3">
                <h2 id="delivery-address-heading" class="text-body-lg font-semibold text-primary-950">Địa chỉ nhận hàng</h2>
                <button type="button" class="min-h-10 rounded-xl px-3 text-body-sm font-semibold text-primary-800" @click="openAddressSelector">
                  {{ selectedAddress ? 'Thay đổi' : 'Thêm địa chỉ' }}
                </button>
              </div>
              <div
                v-if="selectedAddress"
                class="mt-3 rounded-2xl bg-primary-50 p-4"
                data-selected-address
                :data-ghn-province-id="selectedAddress.ghn_province_id ?? undefined"
                :data-ghn-district-id="selectedAddress.ghn_district_id ?? undefined"
                :data-ghn-ward-code="selectedAddress.ghn_ward_code"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="text-primary-950">{{ selectedAddress.fullName }}</strong>
                  <span class="text-body-sm text-text-secondary">{{ selectedAddress.phone }}</span>
                  <span class="rounded-full bg-white px-2 py-1 text-caption font-semibold text-primary-800">
                    {{ selectedAddress.type === 'home' ? 'Nhà riêng' : 'Văn phòng' }}
                  </span>
                  <span v-if="selectedAddress.isDefault" class="rounded-full bg-primary-700 px-2 py-1 text-caption font-semibold text-white">Mặc định</span>
                </div>
                <p class="mt-2 text-body-sm leading-5 text-text-secondary">{{ addressText(selectedAddress) }}</p>
                <p class="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-primary-700">
                  <BadgeCheck class="size-4" aria-hidden="true" />
                  Số điện thoại đã xác thực local
                </p>
              </div>
              <div v-else class="mt-3 rounded-2xl border border-dashed border-primary-200 p-4 text-body-sm text-text-secondary" data-address-required>
                Hoàn tất địa chỉ và xác thực số điện thoại để đặt hàng.
              </div>

              <fieldset class="mt-4 grid gap-2">
                <legend class="text-body-sm font-semibold text-primary-950">Phương thức giao hàng</legend>
                <label
                  v-for="option in checkoutShippingOptions"
                  :key="option.id"
                  class="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary-100 p-3 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
                  :data-shipping-option="option.id"
                >
                  <input v-model="selectedShippingId" type="radio" name="shipping" :value="option.id" class="mt-1 size-4 accent-primary" />
                  <span class="min-w-0 flex-1">
                    <strong class="text-body-sm text-primary-950">{{ option.label }}</strong>
                    <span class="mt-1 block text-caption text-text-secondary">{{ option.estimate }} · {{ option.description }}</span>
                  </span>
                  <strong class="flex-none text-body-sm text-primary-900">{{ currencyFormatter.format(option.fee) }}</strong>
                </label>
              </fieldset>
            </section>

            <section v-else class="rounded-3xl border border-primary-100 bg-white p-4 shadow-xs sm:p-5" aria-labelledby="pickup-heading" data-pickup-section>
              <h2 id="pickup-heading" class="text-body-lg font-semibold text-primary-950">Chi nhánh nhận hàng</h2>
              <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <label
                  v-for="branch in checkoutBranches"
                  :key="branch.id"
                  class="flex items-start gap-3 rounded-2xl border border-primary-100 p-3 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
                  :class="!branch.available && 'opacity-60'"
                  :data-branch-id="branch.id"
                >
                  <input
                    v-model="selectedBranchId"
                    type="radio"
                    name="pickup-branch"
                    :value="branch.id"
                    :disabled="!branch.available"
                    class="mt-1 size-4 accent-primary"
                  />
                  <span>
                    <strong class="text-body-sm text-primary-950">{{ branch.name }}</strong>
                    <span class="mt-1 block text-caption leading-5 text-text-secondary">{{ branch.address }}</span>
                    <span class="mt-1 block text-caption"><Clock3 class="mr-1 inline size-3.5" />{{ branch.openingHours }}</span>
                    <span :class="cn('mt-1 block text-caption font-semibold', branch.available ? 'text-primary-700' : 'text-[#8f493f]')">{{ branch.availabilityLabel }}</span>
                  </span>
                </label>
              </div>
            </section>

            <section class="rounded-3xl border border-primary-100 bg-white p-4 shadow-xs sm:p-5" aria-labelledby="checkout-products-heading" data-checkout-products>
              <div class="flex items-center justify-between gap-3">
                <h2 id="checkout-products-heading" class="text-body-lg font-semibold text-primary-950">Sản phẩm đã chọn</h2>
                <RouterLink :to="{ name: ROUTE_NAMES.cart }" class="min-h-10 rounded-xl px-3 py-2 text-body-sm font-semibold text-primary-800">Thay đổi</RouterLink>
              </div>
              <div class="mt-3 divide-y divide-primary-100">
                <article v-for="product in products" :key="product.id" class="flex min-w-0 gap-3 py-3 first:pt-0 last:pb-0" :data-product-available="product.available">
                  <div class="grid size-20 flex-none place-items-center rounded-2xl bg-primary-50 text-primary-700">
                    <PackageOpen class="size-7" aria-hidden="true" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-caption font-semibold uppercase tracking-[0.08em] text-primary-700">{{ product.product.brand }}</p>
                    <h3 class="mt-1 text-body-sm font-semibold leading-5 text-primary-950">{{ product.product.name }}</h3>
                    <p class="mt-1 text-caption text-text-secondary">{{ product.variantLabel }} · SL {{ product.quantity }}</p>
                    <p :class="cn('mt-1 text-caption font-semibold', product.available ? 'text-primary-700' : 'text-[#923b37]')">{{ product.availabilityLabel }}</p>
                  </div>
                  <div class="flex-none text-right">
                    <strong class="text-body-sm text-[#c8423a]">{{ currencyFormatter.format(product.unitPrice * product.quantity) }}</strong>
                    <span class="mt-1 block text-caption text-text-muted">{{ currencyFormatter.format(product.unitPrice) }}/sp</span>
                  </div>
                </article>
              </div>
              <div v-if="hasUnavailableProduct" class="mt-4 rounded-2xl border border-[#edcbc7] bg-[#fff5f3] p-3" role="alert" data-unavailable-warning>
                <p class="text-body-sm font-semibold text-[#8f3733]">Có sản phẩm chưa thể đặt hàng.</p>
                <RouterLink :to="{ name: ROUTE_NAMES.cart }" class="mt-2 inline-flex min-h-10 items-center font-semibold text-primary-800">Quay lại giỏ hàng để điều chỉnh</RouterLink>
              </div>
            </section>

            <section class="grid gap-3 rounded-3xl border border-primary-100 bg-white p-4 shadow-xs sm:grid-cols-2 sm:p-5">
              <div data-checkout-voucher-card>
                <div class="flex items-center gap-2">
                  <Tag class="size-4.5 text-primary-700" aria-hidden="true" />
                  <h2 class="text-body-md font-semibold text-primary-950">Voucher</h2>
                </div>
                <p class="mt-2 text-body-sm text-text-secondary" data-selected-voucher>
                  {{ selectedOrderVoucher?.label ?? selectedShippingVoucher?.label ?? 'Chưa chọn voucher' }}
                </p>
                <button type="button" class="mt-2 min-h-10 text-body-sm font-semibold text-primary-800" @click="voucherDialogOpen = true">
                  {{ selectedOrderVoucher || selectedShippingVoucher ? 'Thay đổi' : 'Chọn voucher' }}
                </button>
              </div>
              <div class="border-primary-100 sm:border-l sm:pl-4" data-checkout-payment-card>
                <div class="flex items-center gap-2">
                  <WalletCards class="size-4.5 text-primary-700" aria-hidden="true" />
                  <h2 class="text-body-md font-semibold text-primary-950">Thanh toán</h2>
                </div>
                <p class="mt-2 text-body-sm text-text-secondary" data-selected-payment>
                  {{ fulfillment === 'pickup' && paymentMethodId === 'cod' ? 'Thanh toán tại chi nhánh' : selectedPayment?.name }}
                </p>
                <button type="button" class="mt-2 min-h-10 text-body-sm font-semibold text-primary-800" @click="paymentDialogOpen = true">Thay đổi</button>
              </div>
            </section>

            <section class="rounded-3xl border border-primary-100 bg-white p-4 shadow-xs sm:p-5">
              <label for="checkout-note" class="text-body-md font-semibold text-primary-950">Ghi chú đơn hàng</label>
              <textarea
                id="checkout-note"
                v-model="orderNote"
                maxlength="300"
                rows="2"
                class="mt-2 min-h-20 w-full resize-none rounded-xl border border-input px-3 py-2 text-body-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-ring/20"
                placeholder="Ghi chú cho Mizuki về việc giao hoặc nhận hàng..."
              />
              <p class="mt-1 text-right text-caption text-text-muted">{{ orderNote.length }}/300</p>
            </section>
          </div>

          <aside class="min-w-0" aria-labelledby="checkout-summary-heading">
            <div class="rounded-3xl border border-primary-100 bg-white p-5 shadow-sm lg:sticky lg:top-36" data-checkout-summary>
              <h2 id="checkout-summary-heading" class="text-heading-3 text-primary-950">Đơn hàng</h2>
              <dl class="mt-4 space-y-3 text-body-sm">
                <div class="flex justify-between gap-4"><dt>Sản phẩm</dt><dd data-total-count>{{ totals.selectedCount }}</dd></div>
                <div class="flex justify-between gap-4"><dt>Tạm tính</dt><dd data-total-subtotal>{{ currencyFormatter.format(totals.subtotal) }}</dd></div>
                <div class="flex justify-between gap-4 text-primary-700"><dt>Giảm từ sản phẩm</dt><dd>-{{ currencyFormatter.format(totals.productDiscount) }}</dd></div>
                <div class="flex justify-between gap-4 text-primary-700"><dt>Voucher đơn hàng</dt><dd data-total-order-voucher>-{{ currencyFormatter.format(totals.orderVoucherDiscount) }}</dd></div>
                <div class="flex justify-between gap-4"><dt>Phí vận chuyển</dt><dd data-total-shipping>{{ totals.shippingFee ? currencyFormatter.format(totals.shippingFee) : 'Miễn phí' }}</dd></div>
                <div class="flex justify-between gap-4 text-primary-700"><dt>Ưu đãi vận chuyển</dt><dd data-total-shipping-discount>-{{ currencyFormatter.format(totals.shippingVoucherDiscount) }}</dd></div>
                <div class="flex items-end justify-between gap-4 border-t border-primary-100 pt-4">
                  <dt class="font-semibold text-primary-950">Tổng cộng</dt>
                  <dd class="text-heading-3 text-[#c8423a]" data-total>{{ currencyFormatter.format(totals.total) }}</dd>
                </div>
              </dl>
              <p v-if="totals.savedAmount" class="mt-3 rounded-xl bg-primary-50 px-3 py-2 text-caption font-semibold text-primary-800" data-saved-amount>
                Tiết kiệm {{ currencyFormatter.format(totals.savedAmount) }}
              </p>
              <details class="mt-4 rounded-xl border border-dashed border-primary-100 px-3 py-2 text-caption">
                <summary class="cursor-pointer select-none font-medium text-text-secondary">
                  Kịch bản demo
                </summary>
                <label class="mt-3 grid gap-1.5 text-primary-950">
                  Kết quả đặt hàng
                  <select
                    v-model="nextResultKind"
                    class="min-h-10 rounded-lg border border-primary-100 bg-white px-3 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    data-checkout-result-scenario
                  >
                    <option value="success">Thành công</option>
                    <option value="failure">Lỗi có thể thử lại</option>
                  </select>
                </label>
              </details>
              <button
                type="button"
                class="motion-interactive mt-4 hidden min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45 lg:inline-flex"
                :disabled="!canPlaceOrder"
                data-place-order-desktop
                @click="placeOrder"
              >
                {{ isSubmitting ? 'Đang đặt hàng...' : 'Đặt hàng' }}
              </button>
              <p v-if="!canPlaceOrder && !isSubmitting" class="mt-2 text-caption text-text-secondary">
                Hoàn tất địa chỉ, sản phẩm và thanh toán để tiếp tục.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <div
        v-if="viewState === 'success' && products.length"
        class="fixed inset-x-3 bottom-[5.75rem] z-30 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-lg backdrop-blur-md md:hidden"
        data-mobile-order-bar
        role="region"
        aria-label="Thanh đặt hàng mobile"
      >
        <div class="min-w-0">
          <strong class="block truncate text-body-lg text-[#c8423a]">{{ currencyFormatter.format(totals.total) }}</strong>
          <span v-if="totals.savedAmount" class="block text-caption text-primary-700">Tiết kiệm {{ currencyFormatter.format(totals.savedAmount) }}</span>
        </div>
        <button
          type="button"
          class="motion-interactive inline-flex min-h-12 flex-none items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45"
          :disabled="!canPlaceOrder"
          data-place-order-mobile
          @click="placeOrder"
        >
          {{ isSubmitting ? 'Đang xử lý...' : 'Đặt hàng' }}
        </button>
      </div>

      <CheckoutAddressDialog
        v-model="addressDialogOpen"
        v-model:draft="addressDraft"
        :addresses="addresses"
        :start-in-form="addressDialogStartInForm"
        @continue="handleAddressContinue"
        @select="selectAddress"
      />
      <CheckoutOtpDialog
        v-model="otpDialogOpen"
        :phone="addressDraft.phone"
        @verified="handleAddressVerified"
        @change-phone="handleChangePhone"
      />
      <CheckoutVoucherDialog
        v-model="voucherDialogOpen"
        :vouchers="checkoutVouchers"
        :subtotal="totals.subtotal"
        :shipping-fee="totals.shippingFee"
        :selected-order-voucher-id="orderVoucherId"
        :selected-shipping-voucher-id="shippingVoucherId"
        @confirm="applyVouchers"
      />
      <CheckoutPaymentDialog
        v-model="paymentDialogOpen"
        :methods="checkoutPaymentMethods"
        :selected-id="paymentMethodId"
        :fulfillment="fulfillment"
        @confirm="selectPayment"
      />

      <BaseDialog
        v-model="resultDialogOpen"
        :title="result?.kind === 'success' ? 'Đặt hàng thành công' : 'Chưa thể đặt hàng'"
        :description="result?.message"
        close-label="Đóng kết quả đặt hàng"
      >
        <div v-if="result" class="grid gap-4" data-order-result :data-result-kind="result.kind">
          <template v-if="result.kind === 'success'">
            <p class="rounded-2xl bg-primary-50 p-4 text-body-sm text-primary-900">
              Mã đơn demo: <strong>{{ result.orderNumber }}</strong><br />
              {{ fulfillment === 'delivery' ? 'Giao tận nơi' : `Nhận tại ${selectedBranch?.name}` }} ·
              {{ selectedPayment?.name }}
            </p>
            <p v-if="orderPlaceholderVisible" class="text-body-sm text-text-secondary" role="status">
              Trang theo dõi đơn thật chưa có; kết quả local vẫn được giữ trong hộp thoại này.
            </p>
            <button type="button" class="min-h-11 rounded-xl border border-primary-200 font-semibold text-primary-900" @click="orderPlaceholderVisible = true">
              Xem đơn hàng
            </button>
            <RouterLink :to="{ name: ROUTE_NAMES.products }" class="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
              Tiếp tục mua sắm
            </RouterLink>
          </template>
          <template v-else>
            <button type="button" class="min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" @click="retryOrder">
              Thử đặt hàng lại
            </button>
          </template>
        </div>
      </BaseDialog>
    </div>
  </CustomerLayout>
</template>
