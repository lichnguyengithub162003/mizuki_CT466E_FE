<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheck } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import BaseButton from '@/components/common/BaseButton.vue'
import FormErrorSummary from '@/components/form/FormErrorSummary.vue'
import { AuthLayout, AuthPasswordField, applyAuthApiError, focusFirstAuthFormError } from '@/components/auth'
import { ROUTE_NAMES } from '@/constants/routes'
import { usePasswordRecovery } from '@/composables/auth/usePasswordRecovery'
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/types/authForms'
import { resetPassword } from '@/api/auth/authApi'

const router = useRouter()
const submitting = ref(false)
const completed = ref(false)
const formError = ref<string>()
const { state, clear } = usePasswordRecovery()
const { errors, resetForm, setFieldError, validate, values } = useForm<ResetPasswordFormValues>({
  validationSchema: toTypedSchema(resetPasswordSchema),
  initialValues: { password: '', confirmPassword: '' },
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
    await resetPassword({
      email: state.email,
      verification_token: state.verificationToken,
      password: values.password,
      password_confirmation: values.confirmPassword,
    })
    resetForm()
    clear()
    completed.value = true
  } catch (error: unknown) {
    formError.value = applyAuthApiError(
      error,
      {
        password: 'password',
        password_confirmation: 'confirmPassword',
        verification_token: 'password',
      },
      (field, message) => setFieldError(field, message),
    ).formError
    await nextTick()
    focusFirstAuthFormError()
  } finally {
    submitting.value = false
  }
}

async function returnToLogin(): Promise<void> {
  await router.push({ name: ROUTE_NAMES.login })
}
</script>

<template>
  <AuthLayout
    visual-title="Một khởi đầu mới, vẫn là bạn."
    visual-description="Tạo mật khẩu mới để tiếp tục trải nghiệm mua sắm và chăm sóc riêng tại Mizuki."
    mobile-visual-src="/images/auth/login-hero-mobile.jpg"
    desktop-visual-src="/images/auth/login-hero-desktop.jpg"
  >
    <section v-if="completed" class="mt-8 text-center" data-testid="reset-success">
      <CircleCheck class="mx-auto size-12 text-success" aria-hidden="true" />
      <h1 class="mt-4 text-heading-1">Đặt lại mật khẩu thành công</h1>
      <p class="mt-2 text-body-md text-text-secondary">Bạn có thể đăng nhập lại bằng mật khẩu mới.</p>
      <BaseButton class="mt-6 w-full rounded-xl text-white" size="lg" @click="returnToLogin">
        Đăng nhập
      </BaseButton>
    </section>
    <template v-else>
      <header class="mb-5 mt-6">
        <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">BẢO MẬT TÀI KHOẢN</p>
        <h1 class="mt-2 text-heading-1">Tạo mật khẩu mới</h1>
        <p class="mt-2 text-body-md text-text-secondary">Mật khẩu mới cần có ít nhất 8 ký tự.</p>
      </header>
      <form class="grid gap-4" novalidate data-testid="reset-password-form" @submit.prevent="submit">
        <FormErrorSummary :errors="errors" :form-error="formError" :labels="{ password: 'Mật khẩu mới', confirmPassword: 'Xác nhận mật khẩu' }" />
        <AuthPasswordField name="password" label="Mật khẩu mới" autocomplete="new-password" placeholder="Ít nhất 8 ký tự" :disabled="submitting" />
        <AuthPasswordField name="confirmPassword" label="Xác nhận mật khẩu" autocomplete="new-password" placeholder="Nhập lại mật khẩu" :disabled="submitting" />
        <BaseButton type="submit" size="lg" class="w-full rounded-xl text-white" :loading="submitting">
          Đặt lại mật khẩu
        </BaseButton>
      </form>
    </template>
  </AuthLayout>
</template>
