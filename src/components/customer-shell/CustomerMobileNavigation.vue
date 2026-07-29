<script setup lang="ts">
import { Grid2X2, Heart, House, ShoppingBag, UserRound } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import type { Component } from 'vue'
import type { CustomerNavigationKey } from '@/types/customer-shell'
import { cn } from '@/utils/cn'

const props = defineProps<{
  activeKey: CustomerNavigationKey
}>()

const navigationItems: readonly {
  key: CustomerNavigationKey
  label: string
  to: string
  icon: Component
}[] = [
  { key: 'home', label: 'Trang chủ', to: '/home', icon: House },
  { key: 'categories', label: 'Danh mục', to: '/customer-shell?section=categories', icon: Grid2X2 },
  { key: 'favorites', label: 'Yêu thích', to: '/customer-shell?section=favorites', icon: Heart },
  { key: 'cart', label: 'Giỏ hàng', to: '/customer-shell?section=cart', icon: ShoppingBag },
  { key: 'account', label: 'Tài khoản', to: '/customer-shell?section=account', icon: UserRound },
]
</script>

<template>
  <nav
    class="fixed inset-x-2 bottom-2 z-40 rounded-2xl border border-white/80 bg-surface/92 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-md backdrop-blur-md md:hidden"
    aria-label="Điều hướng khách hàng mobile"
  >
    <div class="mx-auto grid max-w-lg grid-cols-5 gap-1">
      <RouterLink
        v-for="item in navigationItems"
        :key="item.key"
        :to="item.to"
        :aria-label="item.label"
        :aria-current="props.activeKey === item.key ? 'page' : undefined"
        :data-active="props.activeKey === item.key ? 'true' : undefined"
        :class="cn(
          'motion-interactive relative flex min-h-14 min-w-0 items-center justify-center rounded-xl px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          props.activeKey === item.key
            ? 'bg-primary-100 text-primary-950 shadow-xs'
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
          class="absolute bottom-1.5 h-1 w-3 rounded-pill bg-primary-800"
          aria-hidden="true"
        ></span>
      </RouterLink>
    </div>
  </nav>
</template>
