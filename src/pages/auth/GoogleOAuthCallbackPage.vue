<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'
import { resolveSafeAuthRedirect } from '@/utils/auth/safeAuthRedirect'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const statusMessage = ref('Đang xác nhận phiên đăng nhập an toàn...')

async function returnToLogin(oauthError: string): Promise<void> {
  await router.replace({
    name: ROUTE_NAMES.login,
    query: { oauth_error: oauthError },
  })
}

onMounted(async () => {
  if (route.query.status !== 'success') {
    await returnToLogin('google_auth_failed')
    return
  }

  if (!authStore.isAuthenticated) {
    statusMessage.value = 'Đang khôi phục phiên đăng nhập...'
    await authStore.restoreSession(true)
  }

  if (!authStore.isAuthenticated) {
    await returnToLogin('google_auth_failed')
    return
  }

  if (authStore.role !== 'customer') {
    try {
      await authStore.logout()
    } catch {
      authStore.clearSession()
    }
    await returnToLogin('google_staff_account')
    return
  }

  statusMessage.value = 'Đăng nhập thành công. Đang chuyển trang...'
  await router.replace(resolveSafeAuthRedirect(route.query.redirect))
})
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-surface px-6 py-12">
    <section
      class="w-full max-w-md rounded-3xl border border-border bg-white p-8 text-center shadow-card"
      aria-labelledby="google-callback-title"
    >
      <p class="text-caption font-semibold uppercase tracking-[0.14em] text-primary-700">
        MIZUKI
      </p>
      <h1 id="google-callback-title" class="mt-3 text-heading-2">
        Đang hoàn tất đăng nhập Google
      </h1>
      <p class="mt-3 text-body-md text-text-secondary" role="status" aria-live="polite">
        {{ statusMessage }}
      </p>
      <span
        class="mx-auto mt-6 block size-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700 motion-reduce:animate-none"
        aria-hidden="true"
      />
    </section>
  </main>
</template>
