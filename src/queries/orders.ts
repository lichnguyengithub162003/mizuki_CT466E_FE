import { useMutation } from '@tanstack/vue-query'
import { createCustomerOrder } from '@/api/orderApi'
import type { CreateCustomerOrderRequest } from '@/types/orders'

export interface CreateCustomerOrderVariables {
  readonly payload: CreateCustomerOrderRequest
  readonly idempotencyKey: string
}

export function useCreateCustomerOrderMutation() {
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: CreateCustomerOrderVariables) => (
      createCustomerOrder(payload, idempotencyKey)
    ),
    retry: false,
  })
}
