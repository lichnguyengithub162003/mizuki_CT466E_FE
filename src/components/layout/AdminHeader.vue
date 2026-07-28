<script setup lang="ts">
import { Bell, CircleUserRound, Search } from '@lucide/vue'
import BaseButton from '@/components/common/BaseButton.vue'

defineSlots<{
  actions?: () => unknown
}>()
</script>

<template>
  <header class="px-4 pt-4 sm:px-5 md:pt-5 lg:px-6 xl:px-8" aria-label="Đầu trang quản trị">
    <div class="admin-glass-panel flex min-h-18 items-center justify-between gap-4 rounded-2xl px-4 py-3 sm:px-5">
      <div class="min-w-0">
        <p class="truncate text-caption uppercase tracking-[0.16em] text-primary-700">Mizuki Admin</p>
        <p class="mt-1 truncate text-body-md font-medium">Xin chào, Quản trị viên</p>
      </div>
      <div class="flex shrink-0 items-center gap-1 rounded-xl border border-white/80 bg-surface/55 p-1 shadow-xs sm:gap-2">
        <button
          type="button"
          class="motion-interactive hidden min-h-10 items-center gap-2 rounded-lg px-3 text-body-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:inline-flex"
          aria-label="Mở tìm kiếm quản trị"
        >
          <Search class="size-4" aria-hidden="true" />
          <span>Tìm kiếm nhanh</span>
          <kbd class="rounded-xs border border-border bg-surface-subtle px-1.5 py-0.5 text-[0.65rem]">⌘ K</kbd>
        </button>
        <slot name="actions" />
        <BaseButton variant="ghost" size="icon" aria-label="Xem thông báo">
          <Bell class="size-5" aria-hidden="true" />
        </BaseButton>
        <BaseButton variant="ghost" size="icon" aria-label="Mở tài khoản quản trị">
          <CircleUserRound class="size-5" aria-hidden="true" />
        </BaseButton>
      </div>
    </div>
  </header>
</template>
