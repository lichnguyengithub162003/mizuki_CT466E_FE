<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ADMIN_PRIMARY_NAVIGATION, type AdminNavigationKey } from '@/types/layout/adminNavigation'
import { cn } from '@/utils/cn'
import AdminMoreMenu from './AdminMoreMenu.vue'

const props = defineProps<{ activeKey: AdminNavigationKey }>()
const moreOpen = ref(false)
</script>

<template>
  <nav
    class="admin-glass-panel fixed inset-x-2 bottom-2 z-40 rounded-2xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
    aria-label="Điều hướng quản trị mobile"
  >
    <div class="mx-auto grid max-w-lg grid-cols-5 gap-1">
      <RouterLink
        v-for="item in ADMIN_PRIMARY_NAVIGATION"
        :key="item.key"
        :to="item.to"
        :aria-label="item.label"
        :aria-current="props.activeKey === item.key ? 'page' : undefined"
        :data-active="props.activeKey === item.key ? 'true' : undefined"
        :class="cn(
          'motion-interactive relative flex min-h-14 min-w-0 items-center justify-center rounded-xl px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          props.activeKey === item.key
            ? 'bg-primary-100 text-primary-900 shadow-xs'
            : 'text-muted-foreground hover:bg-surface-subtle',
        )"
      >
        <component
          :is="item.icon"
          :class="cn('size-5 shrink-0', props.activeKey === item.key && 'stroke-[2.5]')"
          aria-hidden="true"
        />
        <span
          v-if="props.activeKey === item.key"
          class="absolute bottom-1.5 size-1 rounded-full bg-primary-700"
          aria-hidden="true"
        />
      </RouterLink>
      <AdminMoreMenu v-model="moreOpen" :active-key="props.activeKey" />
    </div>
  </nav>
</template>
