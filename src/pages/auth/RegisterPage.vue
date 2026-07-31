<script setup lang="ts">
import { nextTick, ref } from "vue";
import { toTypedSchema } from "@vee-validate/zod";
import { useForm } from "vee-validate";
import { RouterLink, useRouter } from "vue-router";
import BaseButton from "@/components/common/BaseButton.vue";
import FormCheckbox from "@/components/form/FormCheckbox.vue";
import FormErrorSummary from "@/components/form/FormErrorSummary.vue";
import FormInput from "@/components/form/FormInput.vue";
import {
  AuthGoogleButton,
  AuthLayout,
  AuthPasswordField,
  applyAuthApiError,
  focusFirstAuthFormError,
} from "@/components/auth";
import { registerSchema, type RegisterFormValues } from "@/types/authForms";
import { normalizeAuthEmail } from "@/composables/auth/usePasswordRecovery";
import { useAuthStore } from "@/stores/auth";
import { getGoogleRedirectUrl } from "@/api/auth/authApi";
import { assignBrowserLocation } from "@/utils/auth/browserNavigation";

const formError = ref<string>();
const submitting = ref(false);
const googlePending = ref(false);
const router = useRouter();
const authStore = useAuthStore();
const { errors, setFieldError, setFieldValue, validate, values } =
  useForm<RegisterFormValues>({
    validationSchema: toTypedSchema(registerSchema),
    initialValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

async function submit(): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  const result = await validate();
  if (!result.valid) {
    submitting.value = false;
    await nextTick();
    focusFirstAuthFormError();
    return;
  }

  const email = normalizeAuthEmail(values.email);
  setFieldValue("email", email, false);
  formError.value = undefined;
  try {
    await authStore.register({
      name: values.fullName.trim(),
      email,
      password: values.password,
      password_confirmation: values.confirmPassword,
    });
    await router.push("/home");
  } catch (error: unknown) {
    formError.value = applyAuthApiError(
      error,
      {
        name: "fullName",
        email: "email",
        password: "password",
        password_confirmation: "confirmPassword",
      },
      (field, message) => setFieldError(field, message),
    ).formError;
    await nextTick();
    focusFirstAuthFormError();
  } finally {
    submitting.value = false;
  }
}

async function handleGoogleLogin(): Promise<void> {
  if (googlePending.value) return;
  googlePending.value = true;
  formError.value = undefined;

  try {
    const redirectUrl = await getGoogleRedirectUrl();
    assignBrowserLocation(redirectUrl);
  } catch (error: unknown) {
    formError.value = applyAuthApiError(error, {}, () => undefined).formError;
  } finally {
    googlePending.value = false;
  }
}
</script>

<template>
  <AuthLayout
    visual-title="Một tài khoản, trọn trải nghiệm Mizuki."
    visual-description="Lưu lựa chọn yêu thích, chăm sóc theo nhu cầu và theo dõi ưu đãi tại chi nhánh thuận tiện."
    mobile-visual-src="/images/auth/login-hero-mobile.jpg"
    desktop-visual-src="/images/auth/login-hero-desktop.jpg"
  >
    <header class="mb-4 mt-5">
      <p
        class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700"
      >
        Bắt đầu cùng Mizuki
      </p>
      <h1 class="mt-2 text-heading-1">Tạo tài khoản</h1>
    </header>

    <form
      class="grid gap-3"
      novalidate
      data-testid="register-form"
      @submit.prevent="submit"
    >
      <FormErrorSummary
        :errors="errors"
        :form-error="formError"
        :labels="{
          fullName: 'Họ và tên',
          email: 'Email',
          password: 'Mật khẩu',
          confirmPassword: 'Xác nhận mật khẩu',
          terms: 'Điều khoản',
        }"
      />
      <div class="grid gap-3 sm:grid-cols-2">
        <FormInput
          name="fullName"
          label="Họ và tên"
          autocomplete="name"
          required
          placeholder="Nguyễn An"
          class="[&_input]:h-12 [&_input]:rounded-xl"
        />
        <FormInput
          name="email"
          label="Email"
          type="email"
          inputmode="email"
          autocomplete="email"
          required
          placeholder="ban@example.com"
          class="[&_input]:h-12 [&_input]:rounded-xl"
        />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <AuthPasswordField
          name="password"
          label="Mật khẩu"
          autocomplete="new-password"
          placeholder="Ít nhất 8 ký tự"
          :disabled="submitting"
        />
        <AuthPasswordField
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          autocomplete="new-password"
          placeholder="Nhập lại mật khẩu"
          :disabled="submitting"
        />
      </div>
      <FormCheckbox
        name="terms"
        label="Tôi đồng ý với điều khoản sử dụng và chính sách riêng tư"
        :disabled="submitting"
      />
      <BaseButton
        type="submit"
        size="lg"
        class="w-full rounded-xl text-white"
        :loading="submitting"
      >
        Tạo tài khoản
      </BaseButton>
      <AuthGoogleButton
        label="Đăng ký với Google"
        :loading="googlePending"
        @click="handleGoogleLogin"
      />
    </form>
    <p class="mt-5 text-center text-body-sm text-text-secondary">
      Đã có tài khoản?
      <RouterLink to="/login" class="font-semibold text-primary-700"
        >Đăng nhập</RouterLink
      >
    </p>
  </AuthLayout>
</template>
