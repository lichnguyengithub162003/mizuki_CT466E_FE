import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getCustomerWallet } from '@/api/walletApi'

export const customerWalletKeys = {
  detail: (userId: number) => ['customer-wallet', userId] as const,
}

export function useCustomerWalletQuery(
  userId: MaybeRefOrGetter<number | null>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const resolvedUserId = computed(() => toValue(userId))
  const resolvedEnabled = computed(() => toValue(enabled))

  return useQuery({
    queryKey: computed(() => customerWalletKeys.detail(resolvedUserId.value ?? 0)),
    queryFn: getCustomerWallet,
    enabled: computed(() => resolvedEnabled.value && resolvedUserId.value !== null),
    staleTime: 30_000,
  })
}
