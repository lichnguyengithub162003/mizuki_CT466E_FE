<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, UserRound } from '@lucide/vue'
import { useRouter } from 'vue-router'
import BaseBottomSheet from '@/components/common/BaseBottomSheet.vue'
import BasePopover from '@/components/common/BasePopover.vue'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import { cn } from '@/utils/cn'
import CustomerAccountAvatar from './CustomerAccountAvatar.vue'
import CustomerAccountMenuContent from './CustomerAccountMenuContent.vue'

const props = withDefaults(
  defineProps<{
    mode?: 'desktop' | 'mobile'
    active?: boolean
  }>(),
  {
    mode: 'desktop',
    active: false,
  },
)

const router = useRouter()
const authStore = useAuthStore(pinia)
const open = ref(false)
const loggingOut = ref(false)
const logoutError = ref<string>()
const isRestoring = computed(() => authStore.isInitializing && !authStore.isInitialized)
const accountLabel = computed(() =>
  authStore.user ? `Tài khoản của ${authStore.user.name}` : 'Tài khoản',
)

async function logout(): Promise<void> {
  if (loggingOut.value) return
  loggingOut.value = true
  logoutError.value = undefined
  try {
    await authStore.logout()
    open.value = false
    await router.push('/home')
  } catch {
    logoutError.value = 'Không thể đăng xuất. Vui lòng thử lại.'
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <BasePopover
    v-if="props.mode === 'desktop'"
    v-model="open"
    align="end"
    :side-offset="10"
    class="w-80 rounded-2xl p-4"
  >
    <template #trigger>
      <button
        type="button"
        class="motion-interactive flex h-11 max-w-48 items-center gap-2 rounded-xl px-2 text-text-secondary hover:bg-primary-50 hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-70"
        :aria-label="isRestoring ? 'Đang tải tài khoản' : accountLabel"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :disabled="isRestoring"
        data-testid="desktop-account-trigger"
      >
        <CustomerAccountAvatar
          v-if="authStore.user"
          :name="authStore.user.name"
          :avatar="authStore.user.avatar"
        />
        <span v-else class="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50" aria-hidden="true">
          <UserRound class="size-5" />
        </span>
        <span v-if="authStore.user" class="hidden min-w-0 truncate text-body-sm font-medium lg:block">
          {{ authStore.user.name }}
        </span>
        <ChevronDown class="hidden size-4 shrink-0 lg:block" aria-hidden="true" />
      </button>
    </template>
    <CustomerAccountMenuContent
      :logging-out="loggingOut"
      :logout-error="logoutError"
      @close="open = false"
      @logout="logout"
    />
  </BasePopover>

  <BaseBottomSheet
    v-else
    v-model="open"
    title="Tài khoản"
    description="Quản lý phiên đăng nhập và tiện ích cá nhân."
    close-label="Đóng menu tài khoản"
    class="pb-[max(6.5rem,env(safe-area-inset-bottom))]"
  >
    <template #trigger>
      <button
        type="button"
        data-navigation-key="account"
        :data-active="props.active ? 'true' : undefined"
        :aria-current="props.active ? 'page' : undefined"
        :aria-label="isRestoring ? 'Đang tải tài khoản' : accountLabel"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :disabled="isRestoring"
        :class="cn(
          'motion-interactive relative flex min-h-14 min-w-0 items-center justify-center rounded-xl px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-70',
          props.active ? 'bg-primary-100 text-primary-950 shadow-xs' : 'text-muted-foreground hover:bg-surface-subtle',
        )"
        data-testid="mobile-account-trigger"
      >
        <CustomerAccountAvatar
          v-if="authStore.user"
          :name="authStore.user.name"
          :avatar="authStore.user.avatar"
        />
        <UserRound v-else class="size-5 shrink-0" aria-hidden="true" />
        <span
          v-if="props.active"
          class="absolute bottom-1.5 h-1 w-3 rounded-pill bg-primary-800"
          aria-hidden="true"
        />
      </button>
    </template>
    <CustomerAccountMenuContent
      :logging-out="loggingOut"
      :logout-error="logoutError"
      @close="open = false"
      @logout="logout"
    />
  </BaseBottomSheet>
</template>
