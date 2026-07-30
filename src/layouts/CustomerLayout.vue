<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  CustomerAnnouncementBar,
  CustomerBackToTop,
  CustomerFooter,
  CustomerHeader,
  CustomerMobileHeader,
  CustomerMobileNavigation,
  CustomerVoucherFloat,
} from '@/components/customer-shell'
import { ROUTE_NAMES } from '@/constants/routes'
import {
  DEFAULT_CUSTOMER_BRANCH,
  type CustomerBranch,
  type CustomerNavigationKey,
} from '@/types/customer-shell'

defineSlots<{
  default?: () => unknown
  'header-extra'?: () => unknown
  'footer-extra'?: () => unknown
}>()

const route = useRoute()
const selectedBranch = ref<CustomerBranch>(DEFAULT_CUSTOMER_BRANCH)
const activeKey = computed<CustomerNavigationKey>(() => {
  if (route.name === ROUTE_NAMES.products || route.name === ROUTE_NAMES.productDetail) {
    return 'products'
  }

  if (route.name === ROUTE_NAMES.skinCare) {
    return 'services'
  }

  if (route.name === ROUTE_NAMES.favorites) {
    return 'favorites'
  }

  if (route.name === ROUTE_NAMES.cart) {
    return 'cart'
  }

  const section = route.query.section
  if (
    section === 'products' ||
    section === 'skincare' ||
    section === 'makeup' ||
    section === 'haircare' ||
    section === 'services' ||
    section === 'promotions' ||
    section === 'categories' ||
    section === 'favorites' ||
    section === 'cart' ||
    section === 'account'
  ) {
    return section
  }
  return 'home'
})

function updateBranch(branch: CustomerBranch): void {
  selectedBranch.value = branch
}
</script>

<template>
  <div class="min-h-svh overflow-x-clip bg-background text-foreground">
    <CustomerAnnouncementBar />
    <CustomerHeader
      :selected-branch="selectedBranch"
      :active-key="activeKey"
      @select-branch="updateBranch"
    />
    <CustomerMobileHeader :selected-branch="selectedBranch" @select-branch="updateBranch" />
    <slot name="header-extra" />
    <main class="min-h-[50svh] pb-24 md:pb-0" tabindex="-1">
      <slot />
    </main>
    <CustomerFooter />
    <slot name="footer-extra" />
    <CustomerVoucherFloat />
    <CustomerBackToTop />
    <CustomerMobileNavigation :active-key="activeKey" />
  </div>
</template>
