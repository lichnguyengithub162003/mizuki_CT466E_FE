<script setup lang="ts">
import { ShoppingBag } from '@lucide/vue'
import type { CustomerBranch } from '@/types/customer-shell'
import CustomerBranchSelector from './CustomerBranchSelector.vue'
import CustomerLogo from './CustomerLogo.vue'
import CustomerSearch from './CustomerSearch.vue'

const props = defineProps<{
  selectedBranch: CustomerBranch
}>()

const emit = defineEmits<{
  selectBranch: [branch: CustomerBranch]
  search: [query: string]
}>()

</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-border/70 bg-background/94 px-4 py-2.5 shadow-xs backdrop-blur-md md:hidden"
    aria-label="Đầu trang khách hàng mobile"
  >
    <div class="flex min-w-0 items-center gap-2">
      <CustomerLogo compact />
      <CustomerBranchSelector
        compact
        :selected-branch="props.selectedBranch"
        class="ml-auto flex-1"
        @select="emit('selectBranch', $event)"
      />
      <button
        type="button"
        class="motion-interactive relative grid size-11 shrink-0 place-items-center rounded-xl text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label="Giỏ hàng, 2 sản phẩm demo"
      >
        <ShoppingBag class="size-5" aria-hidden="true" />
        <span class="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary-700 text-[0.625rem] font-semibold text-white">2</span>
      </button>
    </div>
    <CustomerSearch compact class="mt-2.5" @submit="emit('search', $event)" />
  </header>
</template>
