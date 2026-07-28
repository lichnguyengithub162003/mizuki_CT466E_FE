<script setup lang="ts">
import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTooltip from '@/components/common/BaseTooltip.vue'
import { ADMIN_NAVIGATION_ITEMS, type AdminNavigationKey } from '@/types/layout/adminNavigation'
import { cn } from '@/utils/cn'
import AppLogo from './AppLogo.vue'

const props = defineProps<{
  collapsed: boolean
  activeKey: AdminNavigationKey
}>()

defineEmits<{ toggle: [] }>()

const navigationClass =
  'motion-interactive flex min-h-12 items-center rounded-xl py-3 text-[0.9375rem] font-medium leading-6 tracking-[-0.01em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

function itemClass(key: AdminNavigationKey): string {
  return cn(
    navigationClass,
    props.collapsed ? 'justify-center px-3' : 'gap-4 px-4',
    props.activeKey === key
      ? 'border border-primary-200 bg-primary-100 text-primary-900 shadow-xs'
      : 'border border-transparent text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
  )
}
</script>

<template>
  <aside
    :class="cn(
      'admin-glass-panel sticky top-3 z-1 hidden h-[calc(100svh-1.5rem)] shrink-0 flex-col overflow-hidden rounded-3xl p-4 transition-[width] duration-(--duration-normal) ease-(--ease-emphasized) lg:flex xl:top-4 xl:h-[calc(100svh-2rem)]',
      props.collapsed ? 'w-20' : 'w-64',
    )"
    aria-label="Thanh bên quản trị"
  >
    <div class="pointer-events-none absolute -left-12 top-24 size-36 rounded-full bg-admin-sage/35 blur-3xl" aria-hidden="true" />
    <div :class="cn('flex items-center gap-3 px-1 pb-7', props.collapsed ? 'justify-center' : 'justify-between')">
      <AppLogo :compact="props.collapsed" to="/admin-shell" />
    </div>

    <nav class="grid gap-2.5" aria-label="Điều hướng quản trị desktop">
      <template v-for="item in ADMIN_NAVIGATION_ITEMS" :key="item.key">
        <BaseTooltip v-if="props.collapsed" :content="item.label" side="right">
          <RouterLink
            :to="item.to"
            :class="itemClass(item.key)"
            :aria-label="item.label"
            :aria-current="props.activeKey === item.key ? 'page' : undefined"
          >
            <component :is="item.icon" class="size-5 shrink-0" aria-hidden="true" />
          </RouterLink>
        </BaseTooltip>
        <RouterLink
          v-else
          :to="item.to"
          :class="itemClass(item.key)"
          :aria-current="props.activeKey === item.key ? 'page' : undefined"
        >
          <component :is="item.icon" class="size-5 shrink-0" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <div class="mt-auto grid gap-3 border-t border-border pt-4">
      <div :class="cn('relative flex items-center rounded-xl border border-white/80 bg-surface/65 p-3 shadow-xs', props.collapsed ? 'justify-center' : 'gap-3')">
        <ShieldCheck class="size-5 shrink-0 text-primary-700" aria-hidden="true" />
        <div v-if="!props.collapsed" class="min-w-0">
          <p class="truncate text-body-sm font-medium">Quản trị viên</p>
          <p class="truncate text-caption text-muted-foreground">Tài khoản demo</p>
        </div>
      </div>
      <BaseButton
        variant="ghost"
        :size="props.collapsed ? 'icon' : 'md'"
        :class="props.collapsed ? 'mx-auto' : 'w-full justify-start font-medium'"
        :aria-label="props.collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'"
        :aria-expanded="!props.collapsed"
        @click="$emit('toggle')"
      >
        <PanelLeftOpen v-if="props.collapsed" class="size-5" aria-hidden="true" />
        <PanelLeftClose v-else class="size-5" aria-hidden="true" />
        <span v-if="!props.collapsed">Thu gọn</span>
      </BaseButton>
    </div>
  </aside>
</template>
