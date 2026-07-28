<script setup lang="ts">
import { Ellipsis } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import BaseBottomSheet from '@/components/common/BaseBottomSheet.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import {
  ADMIN_SECONDARY_NAVIGATION,
  type AdminNavigationKey,
} from '@/types/layout/adminNavigation'
import { cn } from '@/utils/cn'

const props = defineProps<{
  activeKey: AdminNavigationKey
}>()

const open = defineModel<boolean>({ default: false })
const hasActiveItem = () => ADMIN_SECONDARY_NAVIGATION.some((item) => item.key === props.activeKey)
</script>

<template>
  <BaseBottomSheet
    v-model="open"
    title="Điều hướng khác"
    description="Các khu vực quản trị bổ sung trong bản trình diễn."
    close-label="Đóng điều hướng khác"
  >
    <template #trigger>
      <button
        type="button"
        :data-active="hasActiveItem() ? 'true' : undefined"
        :class="cn(
          'motion-interactive relative flex min-h-14 min-w-0 items-center justify-center rounded-xl px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          hasActiveItem()
            ? 'bg-primary-100 text-primary-900 shadow-xs'
            : 'text-muted-foreground hover:bg-surface-subtle',
        )"
        :aria-expanded="open"
        aria-label="Khác"
      >
        <Ellipsis :class="cn('size-5', hasActiveItem() && 'stroke-[2.5]')" aria-hidden="true" />
        <span
          v-if="hasActiveItem()"
          class="absolute bottom-1.5 size-1 rounded-full bg-primary-700"
          aria-hidden="true"
        />
      </button>
    </template>

    <nav class="grid gap-2" aria-label="Điều hướng quản trị bổ sung">
      <RouterLink
        v-for="item in ADMIN_SECONDARY_NAVIGATION"
        :key="item.key"
        :to="item.to"
        :aria-current="props.activeKey === item.key ? 'page' : undefined"
        :class="cn(
          'motion-interactive flex min-h-12 items-center gap-3 rounded-lg border px-4 text-body-md font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          props.activeKey === item.key
            ? 'border-primary-200 bg-primary-100 text-primary-900'
            : 'border-transparent bg-surface-subtle text-foreground hover:border-border',
        )"
        @click="open = false"
      >
        <component :is="item.icon" class="size-5" aria-hidden="true" />
        {{ item.label }}
      </RouterLink>
    </nav>

    <template #footer>
      <BaseButton variant="outline" class="w-full" @click="open = false">
        Đóng menu
      </BaseButton>
    </template>
  </BaseBottomSheet>
</template>
