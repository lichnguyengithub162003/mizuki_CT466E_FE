<script setup lang="ts">
import { Banknote, CreditCard, Landmark, QrCode, WalletCards } from '@lucide/vue'
import { ref, watch, type Component } from 'vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import type { CheckoutPaymentMethod, FulfillmentMethod } from '@/types/customer'

const props = defineProps<{
  methods: readonly CheckoutPaymentMethod[]
  selectedId: string
  fulfillment: FulfillmentMethod
}>()

const emit = defineEmits<{
  confirm: [id: string]
}>()

const open = defineModel<boolean>({ default: false })
const selectedId = ref('')

const paymentIcons: Record<string, Component> = {
  cod: Banknote,
  vnpay: QrCode,
  wallet: WalletCards,
  atm: Landmark,
  card: CreditCard,
}

watch(open, (isOpen) => {
  if (isOpen) selectedId.value = props.selectedId
})

function confirm(): void {
  if (!selectedId.value) return
  emit('confirm', selectedId.value)
  open.value = false
}
</script>

<template>
  <BaseDialog
    v-model="open"
    title="Phương thức thanh toán"
    description="Các lựa chọn chỉ thay đổi trạng thái local, không mở cổng thanh toán."
    close-label="Đóng phương thức thanh toán"
    class="max-w-2xl"
  >
    <div class="grid gap-3" data-payment-dialog>
      <label
        v-for="method in props.methods"
        :key="method.id"
        class="flex items-start gap-3 rounded-2xl border border-primary-100 p-4 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
        :class="!method.available && 'opacity-60'"
        :data-payment-id="method.id"
      >
        <input
          v-model="selectedId"
          type="radio"
          name="payment-method"
          :value="method.id"
          :disabled="!method.available"
          class="mt-1 size-4 accent-primary"
        />
        <component :is="paymentIcons[method.id]" class="size-5 flex-none text-primary-700" aria-hidden="true" />
        <span class="min-w-0">
          <strong class="text-body-sm text-primary-950">
            {{ method.id === 'cod' && props.fulfillment === 'pickup' ? 'Thanh toán tại chi nhánh' : method.name }}
          </strong>
          <span class="mt-1 block text-caption text-text-secondary">{{ method.description }}</span>
          <span v-if="method.unavailableReason" class="mt-1 block text-caption font-semibold text-[#8f493f]">{{ method.unavailableReason }}</span>
        </span>
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
