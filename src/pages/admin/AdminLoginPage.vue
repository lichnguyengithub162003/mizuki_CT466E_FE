<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, CircleAlert, Eye, EyeOff, ShieldCheck } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'
import { isApplicationError } from '@/types/admin'

const REMEMBERED_EMAIL_KEY = 'mizuki:admin-remembered-email'
const HERO_IMAGE_SRC = '/images/auth/login-hero-desktop.jpg'
const savedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY)?.trim() ?? ''

const email = ref(savedEmail)
const password = ref('')
const rememberEmail = ref(savedEmail.length > 0)
const passwordVisible = ref(false)
const forgotNoticeOpen = ref(false)
const pending = ref(false)
const errorMessage = ref('')
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

watch([email, rememberEmail], ([currentEmail, shouldRemember]) => {
  const normalizedEmail = currentEmail.trim()
  if (shouldRemember && normalizedEmail) {
    window.localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail)
  } else {
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY)
  }
})

function closeForgotNoticeOnEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') forgotNoticeOpen.value = false
}

onMounted(() => document.addEventListener('keydown', closeForgotNoticeOnEscape))
onBeforeUnmount(() => document.removeEventListener('keydown', closeForgotNoticeOnEscape))

async function submit(): Promise<void> {
  if (pending.value) return
  forgotNoticeOpen.value = false
  errorMessage.value = ''

  const normalizedEmail = email.value.trim()
  if (!normalizedEmail || !password.value) {
    errorMessage.value = 'Vui lòng nhập email và mật khẩu.'
    await nextTick()
    document
      .querySelector<HTMLInputElement>(!normalizedEmail ? '#staff-email' : '#staff-password')
      ?.focus()
    return
  }

  pending.value = true
  try {
    const user = await auth.staffLogin({ email: normalizedEmail, password: password.value })
    if (rememberEmail.value) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail)
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY)
    }

    if (!['super_admin', 'branch_manager'].includes(user.role)) {
      auth.clearSession()
      await router.replace('/forbidden')
      return
    }

    const requestedRedirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(requestedRedirect.startsWith('/admin') ? requestedRedirect : '/admin/dashboard')
  } catch (error: unknown) {
    errorMessage.value = isApplicationError(error)
      ? error.message
      : 'Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="admin-login-page">
    <div
      class="admin-login-shell"
      data-testid="admin-login-shell"
    >
      <section class="admin-login-form-panel" aria-labelledby="admin-login-title" data-testid="admin-login-form-panel">
        <div class="admin-login-form-content">
          <div>
            <p class="customer-wordmark text-[2rem] leading-none text-primary-900" data-testid="admin-login-wordmark">MIZUKI</p>
            <div class="mt-2 inline-flex items-center gap-2" data-testid="admin-portal-identity">
              <span class="grid size-6 place-items-center rounded-lg bg-primary-50" aria-hidden="true">
                <ShieldCheck class="size-3.5 text-primary-800" data-testid="admin-portal-shield" />
              </span>
              <span class="text-[0.75rem] font-medium tracking-[0.02em] text-[#66736b]">Admin Portal</span>
            </div>
          </div>

          <div class="mt-12">
            <h1 id="admin-login-title" class="admin-login-heading font-semibold leading-[1.15] tracking-[-0.035em] text-[#17231d]">
              Chào mừng trở lại
            </h1>
            <p class="mt-2.5 text-[0.9375rem] leading-6 text-[#68746d]">Đăng nhập để tiếp tục quản lý Mizuki.</p>
          </div>

          <form class="mt-8" data-testid="admin-login-form" novalidate @submit.prevent="submit">
            <div class="grid gap-2">
              <label for="staff-email" class="text-[0.8125rem] font-medium text-[#29372f]">Email</label>
              <div class="group relative" data-testid="email-field">
                <input
                  id="staff-email"
                  v-model="email"
                  name="email"
                  type="email"
                  autocomplete="username"
                  inputmode="email"
                  :disabled="pending"
                  class="admin-login-input h-[3.25rem] w-full appearance-none rounded-[1.0625rem] bg-white/[0.96] px-4 text-[0.9375rem] text-[#17231d] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.025)] ring-1 ring-inset ring-[rgba(31,78,61,0.12)] transition-[box-shadow,background-color] duration-150 placeholder:text-[#89948e] hover:bg-white hover:ring-primary-700/15 hover:shadow-[0_2px_4px_rgba(15,23,42,0.045),0_6px_16px_rgba(15,23,42,0.03)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/30 focus:shadow-[0_0_0_4px_rgba(52,122,87,0.065),0_4px_12px_rgba(15,23,42,0.025)] disabled:cursor-not-allowed disabled:bg-[#f7f8f6] disabled:opacity-60"
                  placeholder="admin@mizuki.vn"
                  @focus="forgotNoticeOpen = false"
                />
              </div>
            </div>

            <div class="mt-5 grid gap-2">
              <label for="staff-password" class="text-[0.8125rem] font-medium text-[#29372f]">Mật khẩu</label>
              <div class="group relative" data-testid="password-field">
                <input
                  id="staff-password"
                  v-model="password"
                  name="password"
                  :type="passwordVisible ? 'text' : 'password'"
                  autocomplete="current-password"
                  :disabled="pending"
                  class="admin-login-input h-[3.25rem] w-full appearance-none rounded-[1.0625rem] bg-white/[0.96] pl-4 pr-12 text-[0.9375rem] text-[#17231d] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.025)] ring-1 ring-inset ring-[rgba(31,78,61,0.12)] transition-[box-shadow,background-color] duration-150 hover:bg-white hover:ring-primary-700/15 hover:shadow-[0_2px_4px_rgba(15,23,42,0.045),0_6px_16px_rgba(15,23,42,0.03)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/30 focus:shadow-[0_0_0_4px_rgba(52,122,87,0.065),0_4px_12px_rgba(15,23,42,0.025)] disabled:cursor-not-allowed disabled:bg-[#f7f8f6] disabled:opacity-60"
                  @focus="forgotNoticeOpen = false"
                />
                <button
                  type="button"
                  class="absolute right-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#748078] transition-colors duration-150 hover:bg-[#f2f5f2] hover:text-[#33463b] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
                  :aria-label="passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                  :disabled="pending"
                  @click="passwordVisible = !passwordVisible"
                >
                  <EyeOff v-if="passwordVisible" class="size-4" aria-hidden="true" />
                  <Eye v-else class="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between gap-4 text-[0.8125rem]">
              <label class="group inline-flex cursor-pointer items-center gap-2.5 text-[#606d65] transition-colors hover:text-[#28372f]" data-testid="remember-email-label">
                <input
                  v-model="rememberEmail"
                  type="checkbox"
                  class="peer sr-only"
                  :disabled="pending"
                  data-testid="remember-email-checkbox"
                  @change="forgotNoticeOpen = false"
                />
                <span
                  :class="[
                    'grid size-[1.125rem] shrink-0 place-items-center rounded-[0.375rem] ring-1 ring-inset transition-[background-color,box-shadow] duration-150 group-hover:ring-black/[0.2] peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/55 peer-focus-visible:ring-offset-2',
                    rememberEmail ? 'bg-primary-700 text-white ring-primary-700' : 'bg-white ring-black/[0.14]',
                  ]"
                  aria-hidden="true"
                >
                  <Check v-if="rememberEmail" class="size-3" data-testid="remember-email-check" />
                </span>
                <span>Ghi nhớ email</span>
              </label>
              <button
                type="button"
                class="cursor-pointer rounded-md font-medium text-[#60756a] underline-offset-4 transition-colors hover:text-primary-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                :aria-expanded="forgotNoticeOpen"
                aria-controls="forgot-password-notice"
                data-testid="forgot-password-trigger"
                @click="forgotNoticeOpen = !forgotNoticeOpen"
              >
                Quên mật khẩu?
              </button>
            </div>

            <div
              v-if="forgotNoticeOpen"
              id="forgot-password-notice"
              class="mt-3 rounded-xl bg-[#f2f6f2] px-3.5 py-3 text-[0.8125rem] leading-5 text-[#52645a] ring-1 ring-inset ring-primary-900/[0.06]"
              role="status"
              aria-live="polite"
              data-testid="forgot-password-notice"
            >
              Khôi phục mật khẩu cho nhân viên đang được hoàn thiện.
            </div>

            <div
              v-if="errorMessage"
              class="mt-5 flex items-start gap-2.5 rounded-xl bg-rose-50 px-3.5 py-3 text-[0.8125rem] leading-5 text-rose-700 ring-1 ring-inset ring-rose-100"
              role="alert"
              aria-live="polite"
              data-testid="admin-login-error"
            >
              <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{{ errorMessage }}</span>
            </div>

            <BaseButton
              type="submit"
              size="lg"
              :loading="pending"
              :disabled="pending"
              class="mt-6 h-[3.25rem] w-full rounded-2xl bg-primary-800 text-[0.9375rem] font-semibold !text-white shadow-[0_7px_18px_rgba(31,92,67,0.18)] transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-primary-900 hover:!text-white hover:shadow-[0_10px_22px_rgba(31,92,67,0.22)] active:translate-y-0 active:shadow-[0_4px_12px_rgba(31,92,67,0.16)] disabled:translate-y-0 disabled:shadow-none"
            >
              {{ pending ? 'Đang đăng nhập...' : 'Đăng nhập' }}
            </BaseButton>
          </form>
        </div>
      </section>

      <aside class="admin-login-visual-panel" aria-label="Không gian thương hiệu Mizuki" data-testid="admin-login-visual-panel">
        <img
          :src="HERO_IMAGE_SRC"
          alt="Sản phẩm chăm sóc da giữa sắc xanh thực vật"
          class="absolute inset-0 size-full object-cover object-center"
          data-testid="admin-login-visual-image"
        />
        <div class="admin-login-image-overlay absolute inset-0" aria-hidden="true"></div>
        <div class="relative flex justify-end">
          <span class="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium text-white/85">
            <ShieldCheck class="size-3" aria-hidden="true" />
            Bảo mật &amp; riêng tư
          </span>
        </div>
        <div class="relative max-w-[25rem]">
          <p class="admin-login-statement font-semibold leading-[1.14] tracking-[-0.04em] text-white">
            Vận hành tinh gọn.<br />Trải nghiệm nhất quán.
          </p>
          <p class="mt-4 max-w-[20rem] text-[0.9375rem] leading-6 text-white/80">
            Không gian quản trị dành riêng cho đội ngũ Mizuki.
          </p>
        </div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.admin-login-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  overflow: hidden;
  padding: 1.5rem;
  background:
    linear-gradient(135deg, rgb(248 249 246) 0%, rgb(241 246 241) 58%, rgb(247 247 242) 100%);
}

.admin-login-shell {
  display: block;
  width: min(100%, 70rem);
  min-width: 0;
  overflow: hidden;
  border-radius: 1.875rem;
  background: white;
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.04),
    0 6px 18px rgb(24 48 38 / 0.05),
    0 28px 80px rgb(24 48 38 / 0.1);
}

.admin-login-form-panel {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 3rem;
}

.admin-login-form-content {
  width: 100%;
  max-width: 25.625rem;
  margin-inline: auto;
}

.admin-login-heading,
.admin-login-statement {
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
}

.admin-login-heading {
  font-size: 2rem;
}

.admin-login-visual-panel {
  position: relative;
  display: none;
  min-width: 0;
  overflow: hidden;
  flex-direction: column;
  justify-content: space-between;
  padding: 3rem;
  background: #416c52;
}

.admin-login-image-overlay {
  background:
    linear-gradient(180deg, rgb(21 55 40 / 0.12) 0%, rgb(21 55 40 / 0.2) 42%, rgb(17 49 36 / 0.82) 100%),
    linear-gradient(90deg, rgb(17 49 36 / 0.18), transparent 65%);
}

.admin-login-statement {
  font-size: 2.375rem;
}

.admin-login-input:-webkit-autofill,
.admin-login-input:-webkit-autofill:active {
  -webkit-text-fill-color: #17231d;
  caret-color: #17231d;
  border-radius: 1.0625rem;
  -webkit-box-shadow:
    0 0 0 1000px rgb(255 255 255 / 0.96) inset,
    0 0 0 1px rgb(31 78 61 / 0.12) inset,
    0 1px 2px rgb(15 23 42 / 0.04),
    0 4px 12px rgb(15 23 42 / 0.025);
  box-shadow:
    0 0 0 1000px rgb(255 255 255 / 0.96) inset,
    0 0 0 1px rgb(31 78 61 / 0.12) inset,
    0 1px 2px rgb(15 23 42 / 0.04),
    0 4px 12px rgb(15 23 42 / 0.025);
  transition:
    background-color 9999s ease-out 0s,
    box-shadow 150ms ease;
}

.admin-login-input:-webkit-autofill:hover {
  -webkit-box-shadow:
    0 0 0 1000px #fff inset,
    0 0 0 1px rgb(31 92 67 / 0.15) inset,
    0 2px 4px rgb(15 23 42 / 0.045),
    0 6px 16px rgb(15 23 42 / 0.03);
  box-shadow:
    0 0 0 1000px #fff inset,
    0 0 0 1px rgb(31 92 67 / 0.15) inset,
    0 2px 4px rgb(15 23 42 / 0.045),
    0 6px 16px rgb(15 23 42 / 0.03);
}

.admin-login-input:-webkit-autofill:focus {
  -webkit-box-shadow:
    0 0 0 1000px #fff inset,
    0 0 0 2px rgb(52 122 87 / 0.3) inset,
    0 0 0 4px rgb(52 122 87 / 0.065),
    0 4px 12px rgb(15 23 42 / 0.025);
  box-shadow:
    0 0 0 1000px #fff inset,
    0 0 0 2px rgb(52 122 87 / 0.3) inset,
    0 0 0 4px rgb(52 122 87 / 0.065),
    0 4px 12px rgb(15 23 42 / 0.025);
}

@media (min-width: 1024px) {
  .admin-login-shell {
    display: grid;
    grid-template-columns: 44% 56%;
    height: min(42.5rem, calc(100svh - 3rem));
    min-height: 38.75rem;
  }

  .admin-login-visual-panel {
    display: flex;
  }

  .admin-login-heading {
    font-size: 2.375rem;
  }
}

@media (max-width: 1023px) {
  .admin-login-shell {
    max-width: 38rem;
    min-height: calc(100svh - 3rem);
  }
}

@media (max-width: 639px) {
  .admin-login-page {
    padding: 1.25rem;
    overflow: auto;
  }

  .admin-login-shell {
    min-height: calc(100svh - 2.5rem);
    border-radius: 1.5rem;
  }

  .admin-login-form-panel {
    padding: 2rem 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-login-page * {
    transition-duration: 0.01ms !important;
  }
}
</style>
