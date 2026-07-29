<script setup lang="ts">
import { Heart, ShoppingBag, UserRound } from '@lucide/vue'
import type { CustomerBranch, CustomerNavigationKey } from '@/types/customer-shell'
import CustomerBranchSelector from './CustomerBranchSelector.vue'
import CustomerDesktopNavigation from './CustomerDesktopNavigation.vue'
import CustomerLogo from './CustomerLogo.vue'
import CustomerSearch from './CustomerSearch.vue'

const props = defineProps<{
  selectedBranch: CustomerBranch
  activeKey: CustomerNavigationKey
}>()

const emit = defineEmits<{
  selectBranch: [branch: CustomerBranch]
  search: [query: string]
}>()
</script>

<template>
  <header
    class="sticky top-0 z-30 hidden border-b border-border/80 bg-background/92 shadow-xs backdrop-blur-md md:block"
    aria-label="Đầu trang khách hàng"
  >
    <div class="mx-auto flex w-full max-w-[90rem] items-center gap-4 px-5 py-3 lg:gap-6 lg:px-7">
      <CustomerLogo />
      <CustomerSearch class="min-w-0 flex-1" @submit="emit('search', $event)" />
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          class="motion-interactive grid size-11 place-items-center rounded-xl text-text-secondary hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label="Yêu thích"
        >
          <Heart class="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="motion-interactive relative grid size-11 place-items-center rounded-xl text-text-secondary hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label="Giỏ hàng, 2 sản phẩm demo"
        >
          <ShoppingBag class="size-5" aria-hidden="true" />
          <span class="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-primary-700 text-[0.625rem] font-semibold text-white">2</span>
        </button>
        <button
          type="button"
          class="motion-interactive grid size-11 place-items-center rounded-xl text-text-secondary hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label="Tài khoản"
        >
          <UserRound class="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="border-t border-border/60">
      <div class="mx-auto flex w-full max-w-[90rem] items-center gap-4 px-5 py-2 lg:px-7">
        <CustomerBranchSelector
          :selected-branch="props.selectedBranch"
          class="shrink-0"
          @select="emit('selectBranch', $event)"
        />
        <CustomerDesktopNavigation :active-key="props.activeKey" />
      </div>
    </div>
  </header>
</template>
