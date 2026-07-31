<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import BaseButton from '@/components/common/BaseButton.vue'
import FormErrorSummary from '@/components/form/FormErrorSummary.vue'
import { AuthCodeField, AuthLayout, applyAuthApiError, focusFirstAuthFormError } from '@/components/auth'
import { ROUTE_NAMES } from '@/constants/routes'
import {
  maskRecoveryEmail,
  usePasswordRecovery,
} from '@/composables/auth/usePasswordRecovery'
import { requestPasswordReset, verifyPasswordResetCode } from '@/api/auth/authApi'
import {
  verifyResetCodeSchema,
  type VerifyResetCodeFormValues,
} from '@/types/authForms'

const router = useRouter()
const submitting = ref(false)
const resending = ref(false)
const formError = ref<string>()
const now = ref(Date.now())
const { state, completeVerification, restartResendCountdown, prepareEmailChange } = usePasswordRecovery()
const maskedEmail = computed(() => maskRecoveryEmail(state.email))
const remainingSeconds = computed(() =>
  Math.max(0, Math.ceil((state.resendAvailableAt - now.value) / 1000)),
)
const { errors, setFieldError, setFieldValue, validate, values } = useForm<VerifyResetCodeFormValues>({
  validationSchema: toTypedSchema(verifyResetCodeSchema),
  initialValues: { code: '' },
})
const timer = window.setInterval(() => {
  now.value = Date.now()
}, 1000)

onBeforeUnmount(() => window.clearInterval(timer))

async function submit(): Promise<void> {
  if (submitting.value) return
  submitting.value = true
  const result = await validate()
  if (!result.valid) {
    submitting.value = false
    await nextTick()
    focusFirstAuthFormError()
    return
  }

  formError.value = undefined
  try {
    const result = await verifyPasswordResetCode({ email: state.email, code: values.code })
    completeVerification(result.verification_token, result.expires_in)
    setFieldValue('code', '')
    await router.push({ name: ROUTE_NAMES.resetPassword })
  } catch (error: unknown) {
    const mappedError = applyAuthApiError(
      error,
      { code: 'code' },
      (field, message) => setFieldError(field, message),
    )
    formError.value = mappedError.formError
    setFieldValue('code', '')
    if (mappedError.retryAfter) {
      restartResendCountdown(mappedError.retryAfter, mappedError.retryAfter)
      now.value = Date.now()
    }
    await nextTick()
    focusFirstAuthFormError()
  } finally {
    submitting.value = false
  }
}

async function resend(): Promise<void> {
  if (remainingSeconds.value > 0 || resending.value) return
  resending.value = true
  formError.value = undefined
  try {
    const result = await requestPasswordReset({ email: state.email })
    restartResendCountdown(result.resend_after, result.expires_in)
    now.value = Date.now()
  } catch (error: unknown) {
    const mappedError = applyAuthApiError(
      error,
      { email: 'code' },
      (field, message) => setFieldError(field, message),
    )
    formError.value = mappedError.formError
    if (mappedError.retryAfter) {
      restartResendCountdown(mappedError.retryAfter, mappedError.retryAfter)
      now.value = Date.now()
    }
  } finally {
    resending.value = false
  }
}

async function changeEmail(): Promise<void> {
  prepareEmailChange()
  await router.push({ name: ROUTE_NAMES.forgotPassword })
}
</script>

<template>
  <AuthLayout
    visual-title="Bảo vệ hành trình chăm sóc của bạn."
    visual-description="Xác thực email giúp Mizuki đảm bảo chỉ bạn mới có thể thay đổi mật khẩu tài khoản."
    mobile-visual-src="/images/auth/login-hero-mobile.jpg"
    desktop-visual-src="/images/auth/login-hero-desktop.jpg"
  >
    <header class="mb-5 mt-6">
      <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">XÁC THỰC EMAIL</p>
      <h1 class="mt-2 text-heading-1">Nhập mã xác thực</h1>
      <p class="mt-2 text-body-md text-text-secondary">
        Nhập mã 6 chữ số dành cho <strong class="font-semibold text-foreground">{{ maskedEmail }}</strong>.
        Mã có thời hạn, vì vậy hãy hoàn tất bước này ngay sau khi nhận email.
      </p>
    </header>
    <form class="grid gap-4" novalidate data-testid="verify-code-form" @submit.prevent="submit">
      <FormErrorSummary :errors="errors" :form-error="formError" :labels="{ code: 'Mã xác thực' }" />
      <AuthCodeField name="code" :disabled="submitting" />
      <BaseButton type="submit" size="lg" class="w-full rounded-xl text-white" :loading="submitting">
        Tiếp tục
      </BaseButton>
      <div class="flex flex-wrap items-center justify-between gap-3 text-body-sm">
        <BaseButton type="button" variant="ghost" size="sm" :loading="resending" :disabled="remainingSeconds > 0" @click="resend">
          {{ remainingSeconds > 0 ? `Gửi lại sau ${remainingSeconds}s` : 'Gửi lại mã' }}
        </BaseButton>
        <button type="button" class="rounded-sm font-semibold text-primary-700 focus-visible:outline-ring" @click="changeEmail">
          Đổi email
        </button>
      </div>
    </form>
    <RouterLink to="/login" class="mt-5 inline-flex rounded-sm text-body-sm font-semibold text-primary-700 focus-visible:outline-ring">
      Quay lại đăng nhập
    </RouterLink>
  </AuthLayout>
</template>
