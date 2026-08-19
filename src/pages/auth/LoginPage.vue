<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { toTypedSchema } from "@vee-validate/zod";
import { useForm } from "vee-validate";
import { RouterLink, useRoute, useRouter } from "vue-router";
import BaseButton from "@/components/common/BaseButton.vue";
import FormCheckbox from "@/components/form/FormCheckbox.vue";
import {
  AuthFloatingField,
  AuthGoogleButton,
  AuthIntro,
  AuthLayout,
  AuthSecondaryButton,
  applyAuthApiError,
  focusFirstAuthFormError,
} from "@/components/auth";
import { loginSchema, type LoginFormValues } from "@/types/authForms";
import type { LoginPayload } from "@/types/auth";
import { normalizeAuthEmail } from "@/composables/auth/usePasswordRecovery";
import { useAuthStore } from "@/stores/auth";
import { getGoogleRedirectUrl } from "@/api/auth/authApi";
import { assignBrowserLocation } from "@/utils/auth/browserNavigation";
import {
  isSafeAuthRedirect,
  resolveSafeAuthRedirect,
} from "@/utils/auth/safeAuthRedirect";
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
      credentialMode: "email",
      email: "",
      phone: "",
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

  let payload: LoginPayload;
  if (values.credentialMode === "email") {
    const email = normalizeAuthEmail(values.email);
    setFieldValue("email", email, false);
    payload = { email, password: values.password };
  } else {
    const phone = values.phone.trim();
    setFieldValue("phone", phone, false);
    payload = { phone, password: values.password };
  }
  formError.value = undefined;
  try {
    await authStore.login(payload);
    await router.push(resolveSafeAuthRedirect(route.query.redirect));
  } catch (error: unknown) {
    formError.value = applyAuthApiError(
      error,
      {
        email: "email",
        phone: "phone",
        password: "password",
      },
      (field, message) => setFieldError(field, message),
    ).formError;
    await nextTick();
    focusFirstAuthFormError();
  } finally {
    submitting.value = false;
  }
}

function toggleCredentialMode(): void {
  const nextMode = values.credentialMode === "email" ? "phone" : "email";
  setFieldValue("credentialMode", nextMode, false);
  setFieldError("email", undefined);
  setFieldError("phone", undefined);
  formError.value = undefined;
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
    <AuthIntro
      class="mb-7! mt-8! [&_h1]:text-[2.15rem]! [&_h1]:leading-10! [&_p]:mt-2! lg:mb-4! lg:mt-4! lg:[&_h1]:text-[2rem]! lg:[&_h1]:leading-[2.35rem]! lg:[&_p]:mt-1.5!"
      title="Đăng nhập Mizuki"
      subtitle="Tiếp tục hành trình chăm sóc riêng của bạn."
    />

    <form
      class="grid gap-4 lg:gap-2.5 lg:[&_.auth-floating-field]:gap-1"
      novalidate
      data-testid="login-form"
      @submit.prevent="submit"
    >
      <AuthFloatingField
        v-show="values.credentialMode === 'email'"
        name="email"
        label="Email"
        type="email"
        inputmode="email"
        autocomplete="email"
        required
        :disabled="submitting"
      />
      <AuthFloatingField
        v-show="values.credentialMode === 'phone'"
        name="phone"
        label="Số điện thoại"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        required
        :disabled="submitting"
      />
      <AuthFloatingField
        name="password"
        label="Mật khẩu"
        type="password"
        autocomplete="current-password"
        required
        :disabled="submitting"
      />
      <div class="flex items-start justify-between gap-4 py-0.5 lg:py-0">
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
        class="h-13 w-full rounded-xl text-[0.9375rem] text-white shadow-sm lg:text-[0.875rem]"
        :loading="submitting"
      >
        Đăng nhập
      </BaseButton>
      <p
        v-if="formError && !Object.keys(errors).length"
        class="text-center text-caption text-destructive"
        role="alert"
        aria-live="assertive"
      >
        {{ formError }}
      </p>
      <div
        class="flex items-center gap-3 text-caption text-text-muted"
        aria-hidden="true"
      >
        <span class="h-px flex-1 bg-border" />
        hoặc tiếp tục với
        <span class="h-px flex-1 bg-border" />
      </div>
      <AuthGoogleButton
        class="text-[0.9375rem]! lg:text-[0.875rem]!"
        label="Đăng nhập với Google"
        :loading="googlePending"
        @click="handleGoogleLogin"
      />
      <AuthSecondaryButton
        class="text-[0.9375rem]! lg:text-[0.875rem]!"
        data-testid="credential-mode-toggle"
        :disabled="submitting || googlePending"
        @click="toggleCredentialMode"
      >
        {{
          values.credentialMode === "email"
            ? "Đăng nhập bằng số điện thoại"
            : "Đăng nhập bằng email"
        }}
      </AuthSecondaryButton>
    </form>

    <p class="mt-5 text-center text-body-sm text-text-secondary lg:mt-3">
      Chưa có tài khoản?
      <RouterLink to="/register" class="font-semibold text-primary-700"
        >Tạo tài khoản</RouterLink
      >
    </p>
  </AuthLayout>
</template>
