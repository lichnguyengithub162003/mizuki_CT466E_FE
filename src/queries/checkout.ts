import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getCheckoutPreview } from '@/api/checkoutApi'
import type { CheckoutPreviewRequest } from '@/types/checkout'

export const checkoutPreviewKeys = {
  detail: (payload: CheckoutPreviewRequest) => ['checkout-preview', payload] as const,
}

export function useCheckoutPreviewQuery(payload: MaybeRefOrGetter<CheckoutPreviewRequest | null>) {
  const resolvedPayload = computed(() => toValue(payload))
  return useQuery({
    queryKey: computed(() => resolvedPayload.value
      ? checkoutPreviewKeys.detail(resolvedPayload.value)
      : ['checkout-preview', 'disabled'] as const),
    queryFn: () => {
      const value = resolvedPayload.value
      if (!value) throw new Error('Thông tin checkout chưa sẵn sàng.')
      return getCheckoutPreview(value)
    },
    enabled: computed(() => resolvedPayload.value !== null),
    retry: false,
    staleTime: 0,
  })
}
