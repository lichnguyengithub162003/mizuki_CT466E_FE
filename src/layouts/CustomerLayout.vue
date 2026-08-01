<script setup lang="ts">
import { computed } from 'vue'
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
  type CustomerBranch,
  type CustomerNavigationKey,
} from '@/types/customer-shell'
import { pinia } from '@/stores/pinia'
import { useBranchPreferenceStore } from '@/stores/branchPreference'

defineSlots<{
  default?: () => unknown
  'header-extra'?: () => unknown
  'footer-extra'?: () => unknown
}>()

withDefaults(
  defineProps<{
    hideFloatingUtilities?: boolean
  }>(),
  {
    hideFloatingUtilities: false,
  },
)

const route = useRoute()
const branchStore = useBranchPreferenceStore(pinia)
branchStore.restore()
if (import.meta.env.MODE !== 'test') {
  void branchStore.load()
}

const selectedBranch = computed<CustomerBranch>(() => {
  const branch = branchStore.selectedBranch
  if (!branch) {
    return {
      id: 0,
      name: 'Chọn chi nhánh',
      address: '',
      note: '',
    } as unknown as CustomerBranch
  }

  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    note: branch.phone ?? branch.email ?? '',
  } as unknown as CustomerBranch
})
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

  if (route.name === ROUTE_NAMES.cart || route.name === ROUTE_NAMES.checkout) {
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
  branchStore.selectBranch(Number(branch.id))
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
    <CustomerVoucherFloat v-if="!hideFloatingUtilities" />
    <CustomerBackToTop v-if="!hideFloatingUtilities" />
    <CustomerMobileNavigation :active-key="activeKey" />
  </div>
</template>
