<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const auth = useAuthStore()
const router = useRouter()

async function logout(): Promise<void> {
  try {
    await auth.logout()
  } finally {
    await router.replace('/admin/login')
  }
}
</script>

<template>
  <BaseButton
    variant="ghost"
    :size="compact ? 'icon' : 'md'"
    class="w-full shrink-0"
    aria-label="Đăng xuất khỏi Admin Portal"
    @click="logout"
  >
    <LogOut class="size-4" />
    <span v-if="!compact">Đăng xuất</span>
  </BaseButton>
</template>
