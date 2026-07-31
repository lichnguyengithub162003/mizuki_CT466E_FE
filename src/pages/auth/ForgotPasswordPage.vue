<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { ArrowLeft } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import FormErrorSummary from '@/components/form/FormErrorSummary.vue'
import FormInput from '@/components/form/FormInput.vue'
import { AuthLayout, applyAuthApiError, focusFirstAuthFormError } from '@/components/auth'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/types/authForms'
import { normalizeAuthEmail, usePasswordRecovery } from '@/composables/auth/usePasswordRecovery'
import { requestPasswordReset } from '@/api/auth/authApi'

const submitting = ref(false)
const formError = ref<string>()
const router = useRouter()
const { state: recoveryState, startRequest } = usePasswordRecovery()
const { errors, setFieldError, validate, values } = useForm<ForgotPasswordFormValues>({
  validationSchema: toTypedSchema(forgotPasswordSchema),
  initialValues: { email: recoveryState.email },
})

onMounted(() => {
  if (recoveryState.email) {
    document.getElementsByName('email').item(0)?.focus()
  }
})

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
    const email = normalizeAuthEmail(values.email)
    const result = await requestPasswordReset({ email })
    startRequest(email, result.resend_after, result.expires_in)
    await router.push({ name: 'verify-reset-code' })
  } catch (error: unknown) {
    formError.value = applyAuthApiError(
      error,
      { email: 'email' },
      (field, message) => setFieldError(field, message),
    ).formError
    await nextTick()
    focusFirstAuthFormError()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout
    visual-title="Tìm lại nhịp chăm sóc của bạn."
    visual-description="Khôi phục quyền truy cập an toàn để tiếp tục theo dõi sản phẩm và dịch vụ bạn quan tâm."
    mobile-visual-src="/images/auth/login-hero-mobile.jpg"
    desktop-visual-src="/images/auth/login-hero-desktop.jpg"
  >
    <header class="mb-5 mt-6">
      <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">Khôi phục tài khoản</p>
      <h1 class="mt-2 text-heading-1">Quên mật khẩu?</h1>
      <p class="mt-2 text-body-md text-text-secondary">
        Mizuki sẽ gửi mã xác thực đến email đã đăng ký của bạn.
      </p>
    </header>
    <form class="grid gap-4" novalidate data-testid="forgot-form" @submit.prevent="submit">
      <FormErrorSummary :errors="errors" :form-error="formError" :labels="{ email: 'Email' }" />
      <FormInput
        name="email"
        label="Email"
        type="email"
        inputmode="email"
        autocomplete="email"
        required
        :disabled="submitting"
        placeholder="ban@example.com"
        class="[&_input]:h-12 [&_input]:rounded-xl"
      />
      <BaseButton type="submit" size="lg" class="w-full rounded-xl text-white" :loading="submitting">
        Gửi mã xác thực
      </BaseButton>
    </form>
    <RouterLink
      to="/login"
      class="mt-6 inline-flex items-center gap-2 rounded-sm text-body-sm font-semibold text-primary-700 no-underline focus-visible:outline-ring"
    >
      <ArrowLeft class="size-4" aria-hidden="true" />
      Quay lại đăng nhập
    </RouterLink>
  </AuthLayout>
</template>
