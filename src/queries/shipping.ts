import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getCustomerShippingQuote } from '@/api/shippingApi'

export const customerShippingQuoteKeys = {
  detail: (addressId: number) => ['customer-shipping-quote', addressId] as const,
}

export function useCustomerShippingQuoteQuery(
  addressId: MaybeRefOrGetter<number | null>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const resolvedAddressId = computed(() => toValue(addressId))
  const resolvedEnabled = computed(() => toValue(enabled))

  return useQuery({
    queryKey: computed(() => customerShippingQuoteKeys.detail(resolvedAddressId.value ?? 0)),
    queryFn: () => {
      const id = resolvedAddressId.value
      if (id === null) throw new Error('Chưa chọn địa chỉ giao hàng.')
      return getCustomerShippingQuote(id)
    },
    enabled: computed(() => resolvedEnabled.value && resolvedAddressId.value !== null),
    retry: false,
    staleTime: 0,
  })
}
