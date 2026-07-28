<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ADMIN_NAVIGATION_ITEMS, type AdminNavigationKey } from '@/types/layout/adminNavigation'
import { cn } from '@/utils/cn'
import AppLogo from './AppLogo.vue'

const props = defineProps<{ activeKey: AdminNavigationKey }>()
</script>

<template>
  <div class="hidden bg-surface-subtle px-3 pt-3 md:block lg:hidden">
    <div class="admin-glass-panel flex items-center gap-5 rounded-2xl px-4 py-3">
      <AppLogo to="/admin-shell" class="shrink-0" />
      <nav
        class="flex min-w-0 flex-1 gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Điều hướng quản trị tablet"
      >
        <RouterLink
          v-for="item in ADMIN_NAVIGATION_ITEMS"
          :key="item.key"
          :to="item.to"
          :aria-current="props.activeKey === item.key ? 'page' : undefined"
          :class="cn(
            'motion-interactive inline-flex min-h-10 shrink-0 items-center gap-2 rounded-pill border px-4 text-body-sm font-medium tracking-[-0.01em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            props.activeKey === item.key
              ? 'border-primary-200 bg-primary-100 text-primary-900'
              : 'border-transparent text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
          )"
        >
          <component :is="item.icon" class="size-4" aria-hidden="true" />
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </div>
</template>
