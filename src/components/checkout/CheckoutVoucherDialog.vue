<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import type { CheckoutVoucher } from '@/types/customer'

const props = defineProps<{
  vouchers: readonly CheckoutVoucher[]
  subtotal: number
  shippingFee: number
  selectedOrderVoucherId: string
  selectedShippingVoucherId: string
}>()

const emit = defineEmits<{
  confirm: [orderVoucherId: string, shippingVoucherId: string]
}>()

const open = defineModel<boolean>({ default: false })
const orderVoucherId = ref('')
const shippingVoucherId = ref('')
const promotionCode = ref('')
const codeError = ref('')

const orderVouchers = computed(() => props.vouchers.filter((voucher) => voucher.kind === 'order'))
const shippingVouchers = computed(() => props.vouchers.filter((voucher) => voucher.kind === 'shipping'))

watch(open, (isOpen) => {
  if (!isOpen) return
  orderVoucherId.value = props.selectedOrderVoucherId
  shippingVoucherId.value = props.selectedShippingVoucherId
  promotionCode.value = ''
  codeError.value = ''
})

function isEligible(voucher: CheckoutVoucher): boolean {
  return props.subtotal >= voucher.minimumOrder && (voucher.kind !== 'shipping' || props.shippingFee > 0)
}

function applyCode(): void {
  const code = promotionCode.value.trim().toUpperCase()
  const voucher = props.vouchers.find((item) => item.code === code)
  if (!voucher) {
    codeError.value = 'Mã ưu đãi demo không tồn tại.'
    return
  }
  if (!isEligible(voucher)) {
    codeError.value = 'Đơn hàng chưa đủ điều kiện áp dụng mã này.'
    return
  }
  if (voucher.kind === 'order') orderVoucherId.value = voucher.id
  else shippingVoucherId.value = voucher.id
  codeError.value = ''
}

function confirm(): void {
  emit('confirm', orderVoucherId.value, shippingVoucherId.value)
  open.value = false
}
</script>

<template>
  <BaseDialog
    v-model="open"
    title="Chọn voucher"
    description="Mỗi đơn dùng tối đa một voucher đơn hàng và một voucher vận chuyển."
    close-label="Đóng chọn voucher"
    class="max-w-2xl"
  >
    <div class="grid gap-5" data-voucher-dialog>
      <form class="grid gap-2 sm:grid-cols-[1fr_auto]" @submit.prevent="applyCode">
        <label class="grid gap-1 text-body-sm font-semibold text-primary-950">
          Mã khuyến mãi
          <input
            v-model="promotionCode"
            type="text"
            class="h-11 rounded-xl border border-input px-3 font-normal uppercase"
            placeholder="Nhập mã demo"
          />
        </label>
        <button
          type="submit"
          class="motion-interactive min-h-11 self-end rounded-xl border border-primary-200 px-4 font-semibold text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Áp dụng
        </button>
        <p v-if="codeError" class="text-body-sm text-destructive sm:col-span-2" role="alert">{{ codeError }}</p>
      </form>

      <fieldset class="grid gap-2">
        <legend class="text-body-md font-semibold text-primary-950">Voucher đơn hàng</legend>
        <label
          v-for="voucher in orderVouchers"
          :key="voucher.id"
          class="flex items-start gap-3 rounded-2xl border border-primary-100 p-3 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
          :class="!isEligible(voucher) && 'opacity-60'"
          :data-voucher-id="voucher.id"
        >
          <input
            v-model="orderVoucherId"
            type="radio"
            name="order-voucher"
            :value="voucher.id"
            :disabled="!isEligible(voucher)"
            class="mt-1 size-4 accent-primary"
          />
          <span>
            <strong class="text-body-sm text-primary-950">{{ voucher.label }}</strong>
            <span class="mt-1 block text-caption text-text-secondary">{{ voucher.description }} {{ voucher.expiryText }}</span>
            <span v-if="!isEligible(voucher)" class="mt-1 block text-caption font-semibold text-[#8f493f]">Chưa đủ điều kiện</span>
          </span>
        </label>
        <button
          v-if="orderVoucherId"
          type="button"
          class="justify-self-start text-body-sm font-semibold text-primary-700"
          @click="orderVoucherId = ''"
        >
          Bỏ voucher đơn hàng
        </button>
      </fieldset>

      <fieldset class="grid gap-2">
        <legend class="text-body-md font-semibold text-primary-950">Voucher vận chuyển</legend>
        <label
          v-for="voucher in shippingVouchers"
          :key="voucher.id"
          class="flex items-start gap-3 rounded-2xl border border-primary-100 p-3 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
          :class="!isEligible(voucher) && 'opacity-60'"
          :data-voucher-id="voucher.id"
        >
          <input
            v-model="shippingVoucherId"
            type="radio"
            name="shipping-voucher"
            :value="voucher.id"
            :disabled="!isEligible(voucher)"
            class="mt-1 size-4 accent-primary"
          />
          <span>
            <strong class="text-body-sm text-primary-950">{{ voucher.label }}</strong>
            <span class="mt-1 block text-caption text-text-secondary">{{ voucher.description }} {{ voucher.expiryText }}</span>
            <span v-if="!isEligible(voucher)" class="mt-1 block text-caption font-semibold text-[#8f493f]">Không áp dụng cho lựa chọn hiện tại</span>
          </span>
        </label>
        <button
          v-if="shippingVoucherId"
          type="button"
          class="justify-self-start text-body-sm font-semibold text-primary-700"
          @click="shippingVoucherId = ''"
        >
          Bỏ voucher vận chuyển
        </button>
      </fieldset>

      <button
        type="button"
        class="motion-interactive min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @click="confirm"
      >
        Xác nhận voucher
      </button>
    </div>
  </BaseDialog>
</template>
