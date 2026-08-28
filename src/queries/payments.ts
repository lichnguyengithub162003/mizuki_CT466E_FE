import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { createVnPayPaymentUrl, getCustomerOrderPayment } from '@/api/paymentApi'

export const customerOrderPaymentKeys = {
  detail: (orderId: number) => ['customer-order-payment', orderId] as const,
}

export function useCustomerOrderPaymentQuery(orderId: MaybeRefOrGetter<number | null>) {
  const resolvedOrderId = computed(() => toValue(orderId))
  return useQuery({
    queryKey: computed(() => customerOrderPaymentKeys.detail(resolvedOrderId.value ?? 0)),
    queryFn: () => getCustomerOrderPayment(resolvedOrderId.value!),
    enabled: computed(() => resolvedOrderId.value !== null),
    retry: false,
    refetchInterval: (query) => query.state.data?.status === 'pending' ? 2_000 : false,
  })
}

export function useCreateVnPayPaymentUrlMutation() {
  return useMutation({ mutationFn: (orderId: number) => createVnPayPaymentUrl(orderId), retry: false })
}
