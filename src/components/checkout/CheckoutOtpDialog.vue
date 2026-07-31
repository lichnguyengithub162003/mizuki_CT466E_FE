<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import BaseDialog from '@/components/common/BaseDialog.vue'

const props = defineProps<{
  phone: string
}>()

const emit = defineEmits<{
  verified: []
  changePhone: []
}>()

const open = defineModel<boolean>({ default: false })
const otp = ref('')
const error = ref('')
const countdown = ref(0)
const submitting = ref(false)
let countdownTimer: number | undefined

const maskedPhone = computed(() => {
  const digits = props.phone.replace(/\D/g, '')
  return digits.length >= 4 ? `******${digits.slice(-4)}` : props.phone
})

function clearCountdown(): void {
  if (countdownTimer !== undefined) {
    window.clearInterval(countdownTimer)
    countdownTimer = undefined
  }
}

function startCountdown(): void {
  clearCountdown()
  countdown.value = 30
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearCountdown()
  }, 1000)
}

watch(open, (isOpen) => {
  if (!isOpen) {
    clearCountdown()
    return
  }
  otp.value = ''
  error.value = ''
  submitting.value = false
  startCountdown()
})

onUnmounted(clearCountdown)

function handleOtpInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  otp.value = target.value.replace(/\D/g, '').slice(0, 6)
  error.value = ''
}

function verifyOtp(): void {
  if (submitting.value) return
  submitting.value = true

  if (otp.value !== '123456') {
    error.value = 'Mã xác thực chưa đúng. Mã demo là 123456.'
    submitting.value = false
    return
  }

  clearCountdown()
  emit('verified')
  submitting.value = false
}

function resend(): void {
  if (countdown.value > 0) return
  otp.value = ''
  error.value = ''
  startCountdown()
}

function changePhone(): void {
  clearCountdown()
  emit('changePhone')
}
</script>

<template>
  <BaseDialog
    v-model="open"
    title="Xác thực số điện thoại"
    :description="`Mã demo 6 chữ số được hiển thị cho ${maskedPhone}; không có SMS thật được gửi.`"
    close-label="Đóng xác thực số điện thoại"
  >
    <form class="grid gap-4" data-otp-dialog @submit.prevent="verifyOtp">
      <label class="grid gap-2 text-body-sm font-semibold text-primary-950">
        Mã xác thực gồm 6 chữ số
        <input
          id="checkout-otp"
          :value="otp"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          class="h-12 rounded-xl border border-input px-4 text-center text-heading-3 tracking-[0.35em] outline-none focus:border-primary-600 focus:ring-2 focus:ring-ring/20"
          :aria-invalid="Boolean(error)"
          :aria-describedby="error ? 'checkout-otp-error' : 'checkout-otp-demo'"
          @input="handleOtpInput"
        />
      </label>
      <p id="checkout-otp-demo" class="text-caption text-text-secondary">
        Luồng xác thực local dùng mã cố định <strong>123456</strong>.
      </p>
      <p v-if="error" id="checkout-otp-error" class="text-body-sm text-destructive" role="alert">{{ error }}</p>

      <button
        type="submit"
        class="motion-interactive min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45"
        :disabled="otp.length !== 6 || submitting"
      >
        Xác nhận
      </button>
      <div class="flex flex-wrap items-center justify-between gap-2 text-body-sm">
        <button
          type="button"
          class="motion-interactive min-h-10 rounded-xl px-3 font-semibold text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:text-text-muted"
          :disabled="countdown > 0"
          @click="resend"
        >
          {{ countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã' }}
        </button>
        <button
          type="button"
          class="motion-interactive min-h-10 rounded-xl px-3 font-semibold text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          @click="changePhone"
        >
          Đổi số điện thoại
        </button>
      </div>
    </form>
  </BaseDialog>
</template>
