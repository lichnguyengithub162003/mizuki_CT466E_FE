<script setup lang="ts">
import { nextTick, ref } from "vue";
import { toTypedSchema } from "@vee-validate/zod";
import { useForm } from "vee-validate";
import { RouterLink, useRouter } from "vue-router";
import BaseButton from "@/components/common/BaseButton.vue";
import FormCheckbox from "@/components/form/FormCheckbox.vue";
import {
  AuthFloatingField,
  AuthGoogleButton,
  AuthIntro,
  AuthLayout,
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
      phone: "",
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
      phone: values.phone.trim(),
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
        phone: "phone",
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
    <AuthIntro title="Tạo tài khoản" />

    <form
      class="grid gap-3.5 lg:gap-3"
      novalidate
      data-testid="register-form"
      @submit.prevent="submit"
    >
      <div class="grid items-start gap-3.5 lg:grid-cols-2">
        <AuthFloatingField
          name="fullName"
          label="Họ và tên"
          autocomplete="name"
          required
          :disabled="submitting"
        />
        <AuthFloatingField
          name="email"
          label="Email"
          type="email"
          inputmode="email"
          autocomplete="email"
          required
          :disabled="submitting"
        />
      </div>
      <AuthFloatingField
        name="phone"
        label="Số điện thoại"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        required
        :disabled="submitting"
      />
      <div class="grid items-start gap-3.5 xl:grid-cols-2">
        <AuthFloatingField
          name="password"
          label="Mật khẩu"
          type="password"
          autocomplete="new-password"
          required
          :disabled="submitting"
        />
        <AuthFloatingField
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          type="password"
          autocomplete="new-password"
          required
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
        class="h-13 w-full rounded-xl text-body-md text-white shadow-sm"
        :loading="submitting"
      >
        Tạo tài khoản
      </BaseButton>
      <p
        v-if="formError && !Object.keys(errors).length"
        class="text-center text-caption text-destructive"
        role="alert"
        aria-live="assertive"
      >
        {{ formError }}
      </p>
      <AuthGoogleButton
        label="Đăng ký với Google"
        :loading="googlePending"
        @click="handleGoogleLogin"
      />
    </form>
    <p class="mt-5 text-center text-body-sm text-text-secondary lg:mt-4">
      Đã có tài khoản?
      <RouterLink to="/login" class="font-semibold text-primary-700"
        >Đăng nhập</RouterLink
      >
    </p>
  </AuthLayout>
</template>
