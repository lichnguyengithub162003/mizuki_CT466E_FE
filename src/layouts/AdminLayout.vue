<script setup lang="ts">
import { computed, ref } from 'vue'
import { Menu } from '@lucide/vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import AdminDrawer from '@/components/admin/AdminDrawer.vue'
import AdminLogoutButton from '@/components/admin/AdminLogoutButton.vue'
import AdminOrderPendingBadge from '@/components/admin/AdminOrderPendingBadge.vue'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import {
  ADMIN_NAVIGATION_ITEMS,
  type AdminNavigationKey,
} from '@/types/layout/adminNavigation'

const slots = defineSlots<{
  default?: () => unknown
  'page-header'?: () => unknown
}>()
const route = useRoute()
const collapsed = ref(false)
const drawer = ref(false)
const isOrdersWorkspace = computed(() => route.path === '/admin/orders')
const activeKey = computed<AdminNavigationKey>(() =>
  ADMIN_NAVIGATION_ITEMS.find(
    (item) => route.path === item.to || route.path.startsWith(`${item.to}/`),
  )?.key ?? 'overview',
)
</script>

<template>
  <div class="admin-premium-canvas h-dvh overflow-hidden">
    <div class="flex h-full min-h-0 w-full gap-3 p-2 sm:p-3">
      <AdminSidebar
        :collapsed="collapsed"
        :active-key="activeKey"
        @toggle="collapsed = !collapsed"
      />
      <main :class="['relative min-h-0 min-w-0 flex-1', isOrdersWorkspace ? 'flex flex-col overflow-hidden' : 'overflow-y-auto']" tabindex="-1">
        <slot name="page-header" />
        <slot v-if="slots.default" />
        <RouterView v-else />
      </main>
    </div>
    <BaseButton class="fixed bottom-4 right-4 z-40 shadow-md lg:hidden" size="icon" aria-label="Mở menu quản trị" @click="drawer = true"><Menu /></BaseButton>
    <AdminDrawer v-model="drawer" title="Điều hướng quản trị">
      <nav class="grid gap-1">
        <RouterLink
          v-for="item in ADMIN_NAVIGATION_ITEMS"
          :key="item.key"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3 py-3 text-body-sm hover:bg-surface-subtle"
          @click="drawer = false"
        >
          <component :is="item.icon" class="size-5" />
          {{ item.label }}
          <AdminOrderPendingBadge v-if="item.key === 'orders'" />
        </RouterLink>
      </nav>
      <div class="mt-3 border-t border-border pt-3"><AdminLogoutButton /></div>
    </AdminDrawer>
  </div>
</template>
