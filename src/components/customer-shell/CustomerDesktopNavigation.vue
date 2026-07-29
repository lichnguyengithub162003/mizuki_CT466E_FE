<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { CustomerNavigationKey } from '@/types/customer-shell'
import { cn } from '@/utils/cn'
import CustomerCategoryMenu from './CustomerCategoryMenu.vue'

const props = defineProps<{
  activeKey: CustomerNavigationKey
}>()

const navigationItems: readonly {
  key: CustomerNavigationKey
  label: string
  to: string
}[] = [
  { key: 'home', label: 'Trang chủ', to: '/home' },
  { key: 'products', label: 'Sản phẩm', to: '/customer-shell?section=products' },
  { key: 'skincare', label: 'Chăm sóc da', to: '/customer-shell?section=skincare' },
  { key: 'makeup', label: 'Trang điểm', to: '/customer-shell?section=makeup' },
  { key: 'haircare', label: 'Chăm sóc tóc', to: '/customer-shell?section=haircare' },
  { key: 'services', label: 'Dịch vụ chăm sóc da', to: '/skin-care' },
  { key: 'promotions', label: 'Khuyến mãi', to: '/customer-shell?section=promotions' },
]
</script>

<template>
  <nav
    class="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    aria-label="Điều hướng mua sắm"
  >
    <div class="flex min-w-max items-center gap-1.5">
      <CustomerCategoryMenu />
      <RouterLink
        v-for="item in navigationItems"
        :key="item.key"
        :to="item.to"
        :aria-current="props.activeKey === item.key ? 'page' : undefined"
        :class="cn(
          'motion-interactive inline-flex min-h-10 items-center rounded-pill border px-4 text-body-sm font-normal leading-6 tracking-[0.01em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          props.activeKey === item.key
            ? 'border-primary-100 bg-admin-sage-soft text-primary-900 shadow-xs'
            : 'border-transparent text-text-secondary hover:bg-surface-subtle hover:text-foreground',
        )"
      >
        {{ item.label }}
      </RouterLink>
    </div>
  </nav>
</template>
