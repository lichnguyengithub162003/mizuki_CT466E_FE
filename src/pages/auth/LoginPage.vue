<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { toTypedSchema } from "@vee-validate/zod";
import { useForm } from "vee-validate";
import { RouterLink, useRoute, useRouter } from "vue-router";
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
import { loginSchema, type LoginFormValues } from "@/types/authForms";
import { normalizeAuthEmail } from "@/composables/auth/usePasswordRecovery";
import { useAuthStore } from "@/stores/auth";
import { getGoogleRedirectUrl } from "@/api/auth/authApi";
import { assignBrowserLocation } from "@/utils/auth/browserNavigation";
import { isSafeAuthRedirect, resolveSafeAuthRedirect } from "@/utils/auth/safeAuthRedirect";
import { getGoogleOAuthErrorMessage } from "@/constants/googleOAuth";

const formError = ref<string>();
const submitting = ref(false);
const googlePending = ref(false);
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { errors, setFieldError, setFieldValue, validate, values } =
  useForm<LoginFormValues>({
    validationSchema: toTypedSchema(loginSchema),
    initialValues: {
      email: "",
      password: "",
      remember: false,
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
    await authStore.login({ email, password: values.password });
    await router.push(resolveSafeAuthRedirect(route.query.redirect));
  } catch (error: unknown) {
    formError.value = applyAuthApiError(
      error,
      { email: "email", password: "password" },
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
    const intendedPath = isSafeAuthRedirect(route.query.redirect)
      ? route.query.redirect
      : undefined;
    const redirectUrl = await getGoogleRedirectUrl(intendedPath);
    assignBrowserLocation(redirectUrl);
  } catch (error: unknown) {
    formError.value = applyAuthApiError(error, {}, () => undefined).formError;
  } finally {
    googlePending.value = false;
  }
}

onMounted(async () => {
  const oauthError = Array.isArray(route.query.oauth_error)
    ? route.query.oauth_error[0]
    : route.query.oauth_error;
  if (!oauthError) return;

  formError.value = getGoogleOAuthErrorMessage(oauthError);
  const query = { ...route.query };
  delete query.oauth_error;
  await router.replace({ query });
});
</script>

<template>
  <AuthLayout
    visual-title="Làn da khỏe, nhịp sống nhẹ nhàng."
    visual-description="Khám phá sản phẩm phù hợp và đặt dịch vụ chăm sóc tại chi nhánh Mizuki bạn yêu thích."
    mobile-visual-src="/images/auth/login-hero-mobile.jpg"
    desktop-visual-src="/images/auth/login-hero-desktop.jpg"
  >
    <header class="mb-4 mt-5 md:mt-5">
      <p
        class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700"
      >
        Chào bạn trở lại
      </p>
      <h1 class="mt-2 text-heading-1">Đăng nhập Mizuki</h1>
      <p class="mt-2 text-body-md text-text-secondary">
        Tiếp tục hành trình chăm sóc riêng của bạn.
      </p>
    </header>

    <form
      class="grid gap-3.5"
      novalidate
      data-testid="login-form"
      @submit.prevent="submit"
    >
      <FormErrorSummary
        :errors="errors"
        :form-error="formError"
        :labels="{ email: 'Email', password: 'Mật khẩu' }"
      />
      <FormInput
        name="email"
        label="Email"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="ban@example.com"
        required
        :disabled="submitting"
        class="[&_input]:h-11 [&_input]:rounded-xl sm:[&_input]:h-12"
      />
      <AuthPasswordField
        name="password"
        label="Mật khẩu"
        autocomplete="current-password"
        placeholder="Nhập mật khẩu"
        :disabled="submitting"
      />
      <div class="flex items-start justify-between gap-4">
        <FormCheckbox
          name="remember"
          label="Ghi nhớ đăng nhập"
          :disabled="submitting"
        />
        <RouterLink
          to="/forgot-password"
          class="shrink-0 rounded-sm text-body-sm font-semibold text-primary-700 no-underline hover:text-primary-900 focus-visible:outline-ring"
        >
          Quên mật khẩu?
        </RouterLink>
      </div>
      <BaseButton
        type="submit"
        size="lg"
        class="w-full rounded-xl text-white"
        :loading="submitting"
      >
        Đăng nhập
      </BaseButton>
      <div
        class="flex items-center gap-3 text-caption text-text-muted"
        aria-hidden="true"
      >
        <span class="h-px flex-1 bg-border" />
        hoặc tiếp tục với
        <span class="h-px flex-1 bg-border" />
      </div>
      <AuthGoogleButton
        label="Đăng nhập với Google"
        :loading="googlePending"
        @click="handleGoogleLogin"
      />
    </form>

    <p class="mt-4 text-center text-body-sm text-text-secondary">
      Chưa có tài khoản?
      <RouterLink to="/register" class="font-semibold text-primary-700"
        >Tạo tài khoản</RouterLink
      >
    </p>
  </AuthLayout>
</template>
