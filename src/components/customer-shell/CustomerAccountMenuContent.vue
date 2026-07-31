<script setup lang="ts">
import { LogIn, LogOut, MapPin, Package, Settings, UserPlus, UserRound } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import CustomerAccountAvatar from './CustomerAccountAvatar.vue'

defineProps<{
  loggingOut: boolean
  logoutError?: string
}>()

const emit = defineEmits<{
  close: []
  logout: []
}>()

const authStore = useAuthStore(pinia)
const pendingItems = [
  { label: 'Tài khoản của tôi', icon: UserRound },
  { label: 'Địa chỉ nhận hàng', icon: MapPin },
  { label: 'Đơn hàng của tôi', icon: Package },
] as const
</script>

<template>
  <div class="grid gap-3" data-testid="customer-account-menu-content">
    <template v-if="authStore.isAuthenticated && authStore.user">
      <div class="flex min-w-0 items-center gap-3 border-b border-border pb-3">
        <CustomerAccountAvatar
          :name="authStore.user.name"
          :avatar="authStore.user.avatar"
          size="md"
        />
        <div class="min-w-0">
          <p class="truncate text-body-sm font-semibold text-foreground">{{ authStore.user.name }}</p>
          <p class="truncate text-caption text-muted-foreground">{{ authStore.user.email }}</p>
          <p class="mt-0.5 text-caption text-primary-700">{{ authStore.user.role_label }}</p>
        </div>
      </div>

      <div class="grid gap-1" aria-label="Tiện ích tài khoản">
        <button
          v-for="item in pendingItems"
          :key="item.label"
          type="button"
          class="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-left text-text-secondary opacity-70"
          disabled
        >
          <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
          <span class="min-w-0 flex-1 text-body-sm">{{ item.label }}</span>
          <span class="shrink-0 text-caption font-medium text-muted-foreground">Sắp có</span>
        </button>

        <RouterLink
          v-if="authStore.role === 'branch_manager' || authStore.role === 'super_admin'"
          :to="{ name: 'admin-shell' }"
          class="motion-interactive flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-body-sm text-foreground no-underline hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          @click="emit('close')"
        >
          <Settings class="size-4 shrink-0" aria-hidden="true" />
          Khu vực quản trị
        </RouterLink>
      </div>

      <div class="border-t border-border pt-2">
        <button
          type="button"
          class="motion-interactive flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-body-sm font-semibold text-danger hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
          :disabled="loggingOut"
          :aria-busy="loggingOut"
          @click="emit('logout')"
        >
          <LogOut class="size-4 shrink-0" aria-hidden="true" />
          {{ loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất' }}
        </button>
        <p v-if="logoutError" class="mt-2 text-body-sm text-danger" role="alert">
          {{ logoutError }}
        </p>
      </div>
    </template>

    <template v-else>
      <p class="text-body-sm text-text-secondary">Đăng nhập để theo dõi đơn hàng và lựa chọn yêu thích.</p>
      <RouterLink
        :to="{ name: 'login' }"
        class="motion-interactive flex min-h-11 items-center gap-3 rounded-xl bg-primary-700 px-3 py-2 text-body-sm font-semibold text-white no-underline hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @click="emit('close')"
      >
        <LogIn class="size-4" aria-hidden="true" />
        Đăng nhập
      </RouterLink>
      <RouterLink
        :to="{ name: 'register' }"
        class="motion-interactive flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 py-2 text-body-sm font-semibold text-foreground no-underline hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        @click="emit('close')"
      >
        <UserPlus class="size-4" aria-hidden="true" />
        Tạo tài khoản
      </RouterLink>
    </template>
  </div>
</template>
