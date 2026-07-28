<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AdminBottomNavigation from '@/components/layout/AdminBottomNavigation.vue'
import AdminHeader from '@/components/layout/AdminHeader.vue'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import AdminTopNavigation from '@/components/layout/AdminTopNavigation.vue'
import PageContainer from '@/components/layout/PageContainer.vue'
import { isAdminNavigationKey, type AdminNavigationKey } from '@/types/layout/adminNavigation'

defineSlots<{
  default?: () => unknown
  'header-actions'?: () => unknown
  'page-header'?: () => unknown
}>()

const route = useRoute()
const sidebarCollapsed = ref(false)
const activeKey = computed<AdminNavigationKey>(() => {
  const section = route.query.section
  return isAdminNavigationKey(section) ? section : 'overview'
})
</script>

<template>
  <div class="admin-premium-canvas min-h-svh overflow-x-clip text-foreground">
    <AdminTopNavigation :active-key="activeKey" />
    <div class="w-full px-2 sm:px-3 lg:flex lg:gap-3 lg:px-3 lg:py-3 xl:gap-4 xl:px-4 xl:py-4">
      <AdminSidebar
        :collapsed="sidebarCollapsed"
        :active-key="activeKey"
        @toggle="sidebarCollapsed = !sidebarCollapsed"
      />
      <div class="relative z-1 min-w-0 flex-1 overflow-hidden bg-background/92 lg:rounded-3xl lg:border lg:border-white/80 lg:shadow-sm">
        <AdminHeader>
          <template #actions><slot name="header-actions" /></template>
        </AdminHeader>
        <main class="pb-24 md:pb-0" tabindex="-1">
          <PageContainer class="pb-10 pt-5 sm:pb-12 md:pt-6 lg:pb-14">
            <slot name="page-header" />
            <slot />
          </PageContainer>
        </main>
      </div>
    </div>
    <AdminBottomNavigation :active-key="activeKey" />
  </div>
</template>
