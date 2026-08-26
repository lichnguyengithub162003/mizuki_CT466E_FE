<script setup lang="ts">
import { Banknote, CheckCircle2, QrCode } from '@lucide/vue'
import { ref, watch, type Component } from 'vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import type { CheckoutPaymentMethod } from '@/types/customer'

const props = defineProps<{
  methods: readonly CheckoutPaymentMethod[]
  selectedId: string
  fulfillment: 'delivery' | 'pickup'
}>()

const emit = defineEmits<{
  confirm: [id: string]
}>()

const open = defineModel<boolean>({ default: false })
const selectedId = ref('')

const paymentIcons: Record<string, Component> = {
  cod: Banknote,
  vnpay: QrCode,
}

watch(open, (isOpen) => {
  if (isOpen) selectedId.value = props.selectedId
})

function confirm(): void {
  if (!selectedId.value) return
  emit('confirm', selectedId.value)
  open.value = false
}

function paymentName(method: CheckoutPaymentMethod): string {
  return method.name
}

function paymentDescription(method: CheckoutPaymentMethod): string {
  if (method.id === 'vnpay') return 'Thanh toán trực tuyến trước khi nhận hàng.'
  if (method.id !== 'cod') return method.description
  return props.fulfillment === 'pickup'
    ? 'Thanh toán trực tiếp khi nhận hàng tại chi nhánh.'
    : 'Thanh toán khi đơn hàng được giao.'
}
</script>

<template>
  <BaseDialog
    v-model="open"
    title="Phương thức thanh toán"
    description="Chọn phương thức thanh toán được hỗ trợ cho đơn hàng này."
    close-label="Đóng phương thức thanh toán"
    class="max-w-2xl"
  >
    <div class="grid gap-3" data-payment-dialog>
      <label
        v-for="method in props.methods"
        :key="method.id"
        class="flex items-start gap-3 rounded-2xl border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
        :class="[
          selectedId === method.id
            ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-100'
            : 'border-primary-100 bg-white',
          !method.available && 'opacity-60',
        ]"
        :data-payment-id="method.id"
        :data-payment-selected="selectedId === method.id"
      >
        <input
          v-model="selectedId"
          type="radio"
          name="payment-method"
          :value="method.id"
          :disabled="!method.available"
          class="mt-1 size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <component :is="paymentIcons[method.id]" class="size-5 flex-none text-primary-700" aria-hidden="true" />
        <span class="min-w-0">
          <strong class="text-body-sm text-primary-950">
            {{ paymentName(method) }}
          </strong>
          <span class="mt-1 block text-caption text-text-secondary">{{ paymentDescription(method) }}</span>
          <span v-if="method.unavailableReason" class="mt-1 block text-caption font-semibold text-[#8f493f]">{{ method.unavailableReason }}</span>
        </span>
        <CheckCircle2
          v-if="selectedId === method.id"
          class="ml-auto size-5 flex-none text-primary-700"
          aria-label="Đã chọn"
          data-payment-selected-indicator
        />
      </label>
      <button
        type="button"
        class="motion-interactive mt-2 min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        :disabled="!selectedId"
        @click="confirm"
      >
        Xác nhận thanh toán
      </button>
    </div>
  </BaseDialog>
</template>
