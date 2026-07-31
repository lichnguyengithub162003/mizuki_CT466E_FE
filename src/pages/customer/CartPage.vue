<script setup lang="ts">
import {
  AlertTriangle,
  Check,
  ChevronRight,
  PackageOpen,
  ShoppingBag,
  Store,
} from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CartItemCard from '@/components/cart/CartItemCard.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import {
  cartItemsDemo,
  cartRecommendations,
  cartVouchersDemo,
  selectedCartBranch,
} from '@/data/customer/cartDemoData'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import type { CartItem, CartSummary, Voucher } from '@/types/customer'
import { cn } from '@/utils/cn'

const cartItems = ref<CartItem[]>(
  cartItemsDemo.map((item) => ({ ...item, variant: { ...item.variant } })),
)
const selectedVoucherId = ref('none')
const promoCode = ref('')
const feedback = ref('')

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

const eligibleItems = computed(() => cartItems.value.filter((item) => item.stockState === 'available'))
const selectedItems = computed(() => eligibleItems.value.filter((item) => item.selected))
const allSelected = computed(
  () => eligibleItems.value.length > 0 && eligibleItems.value.every((item) => item.selected),
)
const selectedVoucher = computed<Voucher>(
  () => cartVouchersDemo.find((voucher) => voucher.id === selectedVoucherId.value)
    ?? cartVouchersDemo[0]!,
)
const hasBranchConflict = computed(
  () => cartItems.value.some((item) => item.stockState === 'branch-unavailable'),
)

const summary = computed<CartSummary>(() => {
  const subtotal = selectedItems.value.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  )
  const voucher = selectedVoucher.value
  const eligibleForVoucher = voucher.applicable && subtotal >= voucher.minimumOrder
  const discount = !eligibleForVoucher
    ? 0
    : voucher.discountType === 'fixed'
      ? Math.min(voucher.discountValue, subtotal)
      : Math.min(Math.round(subtotal * voucher.discountValue / 100), 80_000)
  const shipping = subtotal === 0 || subtotal >= 500_000 ? 0 : 30_000

  return {
    subtotal,
    discount,
    shipping,
    total: Math.max(subtotal - discount + shipping, 0),
    selectedCount: selectedItems.value.reduce((count, item) => count + item.quantity, 0),
  }
})

function findItem(id: string): CartItem | undefined {
  return cartItems.value.find((item) => item.id === id)
}

function toggleItem(id: string): void {
  const item = findItem(id)
  if (item?.stockState === 'available') item.selected = !item.selected
}

function toggleAll(): void {
  const nextSelected = !allSelected.value
  eligibleItems.value.forEach((item) => {
    item.selected = nextSelected
  })
}

function increment(id: string): void {
  const item = findItem(id)
  if (item?.stockState === 'available') item.quantity += 1
}

function decrement(id: string): void {
  const item = findItem(id)
  if (item?.stockState === 'available') item.quantity = Math.max(1, item.quantity - 1)
}

function removeItem(id: string): void {
  const item = findItem(id)
  cartItems.value = cartItems.value.filter((candidate) => candidate.id !== id)
  feedback.value = item ? `Đã xóa “${item.product.name}” khỏi giỏ hàng.` : ''
}

function moveToFavorites(id: string): void {
  const item = findItem(id)
  cartItems.value = cartItems.value.filter((candidate) => candidate.id !== id)
  feedback.value = item ? `Đã chuyển “${item.product.name}” sang yêu thích.` : ''
}

function applyPromoCode(): void {
  const normalizedCode = promoCode.value.trim().toUpperCase()
  const matchedVoucher = cartVouchersDemo.find((voucher) => voucher.id === normalizedCode)

  if (!matchedVoucher) {
    feedback.value = 'Mã ưu đãi demo chưa hợp lệ.'
    return
  }

  selectedVoucherId.value = matchedVoucher.id
  feedback.value = summary.value.subtotal >= matchedVoucher.minimumOrder
    ? `Đã áp dụng ${matchedVoucher.id}.`
    : `Đơn hàng chưa đạt mức tối thiểu ${currencyFormatter.format(matchedVoucher.minimumOrder)}.`
}

function announceChange(message: string): void {
  feedback.value = message
}

function addRecommendedProduct(name: string): void {
  feedback.value = `Đã thêm “${name}” vào giỏ hàng demo.`
}

</script>

<template>
  <CustomerLayout>
    <div class="min-h-[70svh] bg-[#f7faf8] pb-20 md:pb-0" data-cart-page>
      <div class="mx-auto w-full max-w-[90rem] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <nav class="flex items-center gap-1.5 text-caption text-text-secondary" aria-label="Đường dẫn trang">
          <RouterLink
            :to="{ name: 'customer-home' }"
            class="motion-interactive rounded-md hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Trang chủ
          </RouterLink>
          <ChevronRight class="size-4" aria-hidden="true" />
          <span aria-current="page">Giỏ hàng</span>
        </nav>

        <h1 class="sr-only">Giỏ hàng của bạn</h1>

        <p v-if="feedback" class="mt-3 rounded-2xl bg-primary-50 px-4 py-3 text-body-sm font-medium text-primary-800" role="status">
          {{ feedback }}
        </p>

        <div v-if="cartItems.length" class="mt-3 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
          <div class="min-w-0">
            <section
              class="rounded-3xl border border-primary-100 bg-white p-4 shadow-xs sm:p-5"
              aria-labelledby="cart-branch-heading"
              data-cart-group
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="grid size-10 flex-none place-items-center rounded-xl bg-primary-50 text-primary-800">
                    <Store class="size-5" aria-hidden="true" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-caption font-semibold uppercase tracking-[0.1em] text-primary-700">Chi nhánh nhận hàng</p>
                    <h2 id="cart-branch-heading" class="truncate text-body-lg font-semibold text-primary-950">
                      {{ selectedCartBranch.name }}
                    </h2>
                    <p class="truncate text-caption text-text-secondary">{{ selectedCartBranch.address }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  class="motion-interactive min-h-10 rounded-xl border border-primary-200 px-3 text-body-sm font-semibold text-primary-900 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  @click="announceChange('Đã mở lựa chọn chi nhánh demo.')"
                >
                  Đổi chi nhánh
                </button>
              </div>

              <div
                v-if="hasBranchConflict"
                class="mt-4 flex items-start gap-2 rounded-2xl border border-[#efd7b0] bg-[#fff9ed] p-3 text-body-sm text-[#78551d]"
                role="status"
                data-branch-conflict
              >
                <AlertTriangle class="mt-0.5 size-4.5 flex-none" aria-hidden="true" />
                <p>Một sản phẩm chưa có tại chi nhánh này. Hãy đổi chi nhánh hoặc chọn sản phẩm tương tự.</p>
              </div>

              <label class="mt-4 flex min-h-11 cursor-pointer items-center gap-3 border-t border-primary-100 pt-4 text-body-sm font-semibold text-primary-950">
                <input
                  type="checkbox"
                  class="size-5 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  :checked="allSelected"
                  aria-label="Chọn tất cả sản phẩm có thể mua"
                  data-select-all
                  @change="toggleAll"
                />
                Chọn tất cả sản phẩm có thể mua
              </label>
            </section>

            <div class="mt-4 grid gap-4">
              <CartItemCard
                v-for="item in cartItems"
                :key="item.id"
                :item="item"
                @toggle="toggleItem"
                @increment="increment"
                @decrement="decrement"
                @remove="removeItem"
                @move-to-favorites="moveToFavorites"
                @change-variant="announceChange('Đã mở lựa chọn biến thể demo.')"
                @change-branch="announceChange('Đã mở lựa chọn chi nhánh demo.')"
              />
            </div>
          </div>

          <aside class="min-w-0" aria-labelledby="cart-summary-heading">
            <div class="rounded-3xl border border-primary-100 bg-white p-5 shadow-sm lg:sticky lg:top-36" data-cart-summary>
              <h2 id="cart-summary-heading" class="text-heading-3 text-primary-950">Tóm tắt đơn hàng</h2>

              <div class="mt-5">
                <label for="cart-voucher" class="text-body-sm font-semibold text-primary-950">
                  Voucher
                </label>
                <select
                  id="cart-voucher"
                  v-model="selectedVoucherId"
                  class="mt-2 min-h-11 w-full rounded-xl border border-primary-200 bg-white px-3 text-body-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  data-voucher-select
                >
                  <option v-for="voucher in cartVouchersDemo" :key="voucher.id" :value="voucher.id">
                    {{ voucher.label }}
                  </option>
                </select>
                <p class="mt-1 text-caption text-text-secondary">{{ selectedVoucher.description }}</p>
              </div>

              <form class="mt-4" @submit.prevent="applyPromoCode">
                <label for="promo-code" class="text-body-sm font-semibold text-primary-950">
                  Mã ưu đãi
                </label>
                <div class="mt-2 flex gap-2">
                  <input
                    id="promo-code"
                    v-model="promoCode"
                    type="text"
                    class="min-h-11 min-w-0 flex-1 rounded-xl border border-primary-200 px-3 text-body-sm uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    placeholder="MIZUKI50"
                  />
                  <button
                    type="submit"
                    class="motion-interactive min-h-11 flex-none rounded-xl border border-primary-200 px-3 text-body-sm font-semibold text-primary-900 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Áp dụng
                  </button>
                </div>
              </form>

              <dl class="mt-5 space-y-3 border-t border-primary-100 pt-5 text-body-sm">
                <div class="flex justify-between gap-4">
                  <dt>Sản phẩm đã chọn</dt>
                  <dd class="font-semibold" data-summary-count>{{ summary.selectedCount }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt>Tạm tính</dt>
                  <dd class="font-semibold" data-summary-subtotal>{{ currencyFormatter.format(summary.subtotal) }}</dd>
                </div>
                <div class="flex justify-between gap-4 text-primary-700">
                  <dt>Giảm giá</dt>
                  <dd class="font-semibold" data-summary-discount>-{{ currencyFormatter.format(summary.discount) }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt>Phí vận chuyển dự kiến</dt>
                  <dd class="font-semibold">{{ summary.shipping ? currencyFormatter.format(summary.shipping) : 'Miễn phí' }}</dd>
                </div>
                <div class="flex items-end justify-between gap-4 border-t border-primary-100 pt-4">
                  <dt class="font-semibold text-primary-950">Tổng cộng</dt>
                  <dd class="text-heading-3 text-[#c8423a]" data-summary-total>{{ currencyFormatter.format(summary.total) }}</dd>
                </div>
              </dl>

              <RouterLink
                v-if="summary.selectedCount > 0"
                :to="{ name: ROUTE_NAMES.checkout }"
                class="motion-interactive mt-5 hidden min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45 lg:inline-flex"
                data-checkout-action
              >
                Tiến hành thanh toán
              </RouterLink>
              <button
                v-else
                type="button"
                class="mt-5 hidden min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground opacity-45 lg:inline-flex"
                disabled
              >
                Tiến hành thanh toán
              </button>
            </div>
          </aside>
        </div>

        <section
          v-else
          class="mt-8 grid min-h-80 place-items-center rounded-[2rem] border border-primary-100 bg-white p-8 text-center"
          data-cart-empty
        >
          <div class="max-w-md">
            <ShoppingBag class="mx-auto size-12 text-primary-500" aria-hidden="true" />
            <h2 class="mt-4 text-heading-2 text-primary-950">Giỏ hàng đang trống</h2>
            <p class="mt-2 text-body-md text-text-secondary">Khám phá danh mục để bắt đầu đơn hàng của bạn.</p>
            <RouterLink
              :to="{ name: ROUTE_NAMES.products }"
              class="motion-interactive mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Mua sắm ngay
            </RouterLink>
          </div>
        </section>

        <section
          class="mt-8 rounded-[2rem] border border-primary-100 bg-[#edf4f0] p-4 sm:p-6"
          aria-labelledby="cart-recommendations-heading"
          data-cart-recommendations
        >
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">Gợi ý dành cho bạn</p>
              <h2 id="cart-recommendations-heading" class="mt-1 text-heading-2 text-primary-950">Có thể bạn cũng thích</h2>
            </div>
            <RouterLink
              :to="{ name: ROUTE_NAMES.products }"
              class="motion-interactive flex-none rounded-lg px-2 py-1 text-body-sm font-semibold text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Xem tất cả
            </RouterLink>
          </div>

          <div class="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <article
              v-for="product in cartRecommendations"
              :key="product.id"
              class="flex w-auto min-w-0 flex-none basis-[68%] snap-start flex-col rounded-2xl border border-primary-100 bg-white p-3 sm:basis-52 xl:basis-[calc((100%_-_3.75rem)/6)]"
              data-cart-recommendation
            >
              <div :class="cn('grid aspect-[4/3] place-items-center rounded-xl', {
                mint: 'bg-[#e3f1eb]',
                rose: 'bg-[#f3e5e2]',
                sand: 'bg-[#f2eadc]',
                sky: 'bg-[#e4eef2]',
                lilac: 'bg-[#ebe8f5]',
              }[product.tone])">
                <PackageOpen class="size-8 text-primary-700 opacity-75" aria-hidden="true" />
              </div>
              <p class="mt-3 text-caption font-semibold uppercase tracking-[0.08em] text-primary-700">{{ product.brand }}</p>
              <h3 class="mt-1 line-clamp-2 min-h-10 text-body-sm font-semibold text-primary-950">{{ product.name }}</h3>
              <strong class="mt-2 text-body-md text-[#c8423a]">{{ currencyFormatter.format(product.price) }}</strong>
              <button
                type="button"
                class="motion-interactive mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-body-sm font-semibold text-primary-foreground hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                :aria-label="`Thêm ${product.name} vào giỏ hàng`"
                @click="addRecommendedProduct(product.name)"
              >
                <Check class="size-4" aria-hidden="true" />
                Thêm vào giỏ
              </button>
            </article>
          </div>
        </section>
      </div>

      <div
        class="fixed inset-x-3 bottom-[5.75rem] z-30 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-lg backdrop-blur-md md:hidden"
        data-mobile-checkout-bar
        role="region"
        aria-label="Thanh mua hàng mobile"
      >
        <div class="min-w-0">
          <p class="text-caption text-text-secondary">{{ summary.selectedCount }} sản phẩm</p>
          <strong class="block truncate text-body-lg text-[#c8423a]">{{ currencyFormatter.format(summary.total) }}</strong>
        </div>
        <RouterLink
          v-if="summary.selectedCount > 0"
          :to="{ name: ROUTE_NAMES.checkout }"
          class="motion-interactive inline-flex min-h-12 flex-none items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45"
          data-checkout-action
        >
          Mua hàng
        </RouterLink>
        <button
          v-else
          type="button"
          class="inline-flex min-h-12 flex-none items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground opacity-45"
          disabled
        >
          Mua hàng
        </button>
      </div>
    </div>
  </CustomerLayout>
</template>
