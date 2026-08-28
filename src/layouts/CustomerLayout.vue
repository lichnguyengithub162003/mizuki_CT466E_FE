<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import { useAuthStore } from '@/stores/auth'
import { useCustomerCartQuery, useSelectCartBranchMutation } from '@/queries/cart'

defineSlots<{
  default?: () => unknown
  'header-extra'?: () => unknown
  'footer-extra'?: () => unknown
}>()

const props = withDefaults(
  defineProps<{
    hideFloatingUtilities?: boolean
    compactCartMobile?: boolean
    compactFavoritesMobile?: boolean
  }>(),
  {
    hideFloatingUtilities: false,
    compactCartMobile: false,
    compactFavoritesMobile: false,
  },
)

const route = useRoute()
const branchStore = useBranchPreferenceStore(pinia)
const authStore = useAuthStore(pinia)
const cartQuery = useCustomerCartQuery(computed(() => authStore.user?.id ?? null))
const selectCartBranchMutation = useSelectCartBranchMutation(computed(() => authStore.user?.id ?? null))
const cartCount = computed(() => cartQuery.data.value?.items.length ?? 0)
const synchronizedCartBranchKey = ref<string | null>(null)
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

  if (route.name === ROUTE_NAMES.customerOrders || route.name === ROUTE_NAMES.customerOrderDetail || route.name === ROUTE_NAMES.customerOrderPreviewDetail) {
    return 'account'
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

async function updateBranch(branch: CustomerBranch): Promise<void> {
  const branchId = Number(branch.id)
  if (!Number.isInteger(branchId) || branchId <= 0) return

  branchStore.selectBranch(branchId)

  await synchronizeCartBranch()
}

async function synchronizeCartBranch(): Promise<void> {
  const userId = authStore.user?.id ?? null
  const selectedBranchId = branchStore.selectedBranchId
  const cart = cartQuery.data.value
  if (
    userId === null ||
    authStore.role !== 'customer' ||
    selectedBranchId === null ||
    !Number.isInteger(selectedBranchId) ||
    selectedBranchId <= 0 ||
    !cart
  ) return

  if (Number(cart.branch?.id) === selectedBranchId) {
    synchronizedCartBranchKey.value = null
    return
  }

  const synchronizationKey = `${userId}:${cart.id}:${selectedBranchId}`
  if (synchronizedCartBranchKey.value === synchronizationKey) return

  synchronizedCartBranchKey.value = synchronizationKey
  try {
    await selectCartBranchMutation.mutateAsync(selectedBranchId)
  } catch {
    // The cart query remains on the last backend-confirmed branch after a rejected change.
  }
}

watch(
  [
    () => authStore.user?.id ?? null,
    () => authStore.role,
    () => branchStore.selectedBranchId,
    () => cartQuery.data.value,
  ],
  () => {
    void synchronizeCartBranch()
  },
  { immediate: true },
)

</script>

<template>
  <div
    class="min-h-svh overflow-x-clip bg-background text-foreground"
    :data-compact-cart-mobile="props.compactCartMobile || undefined"
    :data-compact-favorites-mobile="props.compactFavoritesMobile || undefined"
  >
    <CustomerAnnouncementBar :class="(props.compactCartMobile || props.compactFavoritesMobile) && 'max-[84.999rem]:!hidden'" />
    <CustomerHeader
      :class="(props.compactCartMobile || props.compactFavoritesMobile) && 'max-[84.999rem]:!hidden'"
      :selected-branch="selectedBranch"
      :active-key="activeKey"
      :cart-count="cartCount"
      @select-branch="updateBranch"
    />
    <CustomerMobileHeader :class="(props.compactCartMobile || props.compactFavoritesMobile) && 'max-[84.999rem]:!hidden'" :selected-branch="selectedBranch" @select-branch="updateBranch" />
    <slot name="header-extra" />
    <main :class="props.compactCartMobile ? 'h-svh overflow-hidden pb-0 min-[85rem]:h-auto min-[85rem]:min-h-[50svh] min-[85rem]:overflow-visible' : props.compactFavoritesMobile ? 'min-h-[50svh] pb-0 min-[85rem]:pb-0' : 'min-h-[50svh] pb-24 md:pb-0'" tabindex="-1">
      <slot />
    </main>
    <CustomerFooter :class="(props.compactCartMobile || props.compactFavoritesMobile) && 'max-[84.999rem]:!hidden'" />
    <slot name="footer-extra" />
    <CustomerVoucherFloat v-if="!props.hideFloatingUtilities" :class="(props.compactCartMobile || props.compactFavoritesMobile) && 'max-[84.999rem]:!hidden'" />
    <CustomerBackToTop v-if="!props.hideFloatingUtilities" :class="(props.compactCartMobile || props.compactFavoritesMobile) && 'max-[84.999rem]:!hidden'" />
    <CustomerMobileNavigation v-if="!props.compactCartMobile && !props.compactFavoritesMobile" :active-key="activeKey" :cart-count="cartCount" />
  </div>
</template>
